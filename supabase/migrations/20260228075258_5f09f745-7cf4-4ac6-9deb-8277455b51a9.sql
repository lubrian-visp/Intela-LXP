-- Allow programme submitters to create pending approval tasks tied to themselves
CREATE POLICY "Programme creators can submit approval tasks"
ON public.approval_tasks
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND requested_by = auth.uid()
  AND reference_table = 'programmes'
  AND task_type = 'programme_approval'
  AND status = 'pending'
);

-- Prevent duplicate pending approval tasks per programme
CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_tasks_unique_pending_programme
ON public.approval_tasks (reference_table, reference_id, task_type)
WHERE status = 'pending';

-- Backfill pending approval tasks for programmes already awaiting approval
INSERT INTO public.approval_tasks (
  title,
  description,
  task_type,
  reference_table,
  reference_id,
  requested_by,
  assigned_role,
  status
)
SELECT
  'Approve Programme: ' || p.title,
  'Programme "' || p.title || '" has been submitted for approval. Review and approve or reject.',
  'programme_approval',
  'programmes',
  p.id,
  p.created_by,
  'operations',
  'pending'
FROM public.programmes p
WHERE p.status = 'pending_approval'
  AND NOT EXISTS (
    SELECT 1
    FROM public.approval_tasks t
    WHERE t.reference_table = 'programmes'
      AND t.reference_id = p.id
      AND t.task_type = 'programme_approval'
      AND t.status = 'pending'
  );