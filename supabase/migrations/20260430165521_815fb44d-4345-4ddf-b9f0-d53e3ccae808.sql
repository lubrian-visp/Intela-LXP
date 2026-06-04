
-- 1. Add new columns to assessments
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS learning_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requires_moderation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid;

-- Status check
DO $$ BEGIN
  ALTER TABLE public.assessments
    ADD CONSTRAINT assessments_status_check
    CHECK (status IN ('draft','published','active','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_assessments_status ON public.assessments(status);

-- 2. Validation function: enforce required links when going live
CREATE OR REPLACE FUNCTION public.enforce_assessment_publish_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link_count integer;
  _outcomes_count integer;
  _requires_mod_types text[] := ARRAY['summative','integrated','portfolio','workplace'];
BEGIN
  -- Only enforce on transitions INTO published/active
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('published','active') THEN
    -- Going to draft/archived: no enforcement, but clear publish audit if leaving live
    IF TG_OP = 'UPDATE' AND OLD.status IN ('published','active') AND NEW.status NOT IN ('published','active') THEN
      NEW.published_at := NULL;
      NEW.published_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- ── Required: Programme link ─────────────────────────────────
  IF NEW.programme_id IS NULL THEN
    RAISE EXCEPTION 'Cannot publish assessment "%": a Programme must be linked.', NEW.title
      USING ERRCODE = 'check_violation';
  END IF;

  -- ── Required: Module link OR at least one entry in assessment_links ──
  IF NEW.module_id IS NULL THEN
    SELECT COUNT(*) INTO _link_count
      FROM public.assessment_links
     WHERE assessment_id = NEW.id;
    IF _link_count = 0 THEN
      RAISE EXCEPTION 'Cannot publish assessment "%": link it to at least one Module, Learning Track, or Lesson.', NEW.title
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- ── Required: at least one Learning Outcome mapped ───────────
  _outcomes_count := COALESCE(jsonb_array_length(NEW.learning_outcomes), 0);
  IF _outcomes_count = 0 THEN
    RAISE EXCEPTION 'Cannot publish assessment "%": map at least one Learning Outcome (constructive alignment).', NEW.title
      USING ERRCODE = 'check_violation';
  END IF;

  -- ── Required: pass mark + max score ──────────────────────────
  IF NEW.max_score IS NULL OR NEW.pass_mark IS NULL THEN
    RAISE EXCEPTION 'Cannot publish assessment "%": both Max Score and Pass Mark are required.', NEW.title
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.pass_mark > NEW.max_score THEN
    RAISE EXCEPTION 'Cannot publish assessment "%": Pass Mark (%) cannot exceed Max Score (%).', NEW.title, NEW.pass_mark, NEW.max_score
      USING ERRCODE = 'check_violation';
  END IF;

  -- ── Required: moderation flag for high-stakes types ──────────
  IF NEW.assessment_type = ANY(_requires_mod_types) AND NEW.requires_moderation = false THEN
    RAISE EXCEPTION 'Cannot publish % assessment "%": moderation must be enabled for high-stakes assessments (4-Eyes principle).', NEW.assessment_type, NEW.title
      USING ERRCODE = 'check_violation';
  END IF;

  -- Stamp publish audit
  IF NEW.published_at IS NULL THEN
    NEW.published_at := now();
    NEW.published_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_assessment_publish_integrity ON public.assessments;
CREATE TRIGGER trg_enforce_assessment_publish_integrity
BEFORE INSERT OR UPDATE ON public.assessments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_assessment_publish_integrity();

-- 3. Audit status transitions to unified_audit_log (best-effort, only if table exists)
CREATE OR REPLACE FUNCTION public.audit_assessment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      INSERT INTO public.unified_audit_log (
        actor_id, action, resource_type, resource_id, details
      ) VALUES (
        auth.uid(),
        'assessment_status_change',
        'assessment',
        NEW.id,
        jsonb_build_object(
          'previous_status', OLD.status,
          'new_status', NEW.status,
          'title', NEW.title,
          'programme_id', NEW.programme_id,
          'module_id', NEW.module_id
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Don't block status change if audit table missing/changed
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_assessment_status_change ON public.assessments;
CREATE TRIGGER trg_audit_assessment_status_change
AFTER UPDATE ON public.assessments
FOR EACH ROW
EXECUTE FUNCTION public.audit_assessment_status_change();
