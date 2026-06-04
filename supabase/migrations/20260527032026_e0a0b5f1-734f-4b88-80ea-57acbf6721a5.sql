
-- Hotfix: previous R1 migration revoked EXECUTE on ALL SECURITY DEFINER functions,
-- breaking RLS policies that call helper functions like has_role(), is_admin(), etc.
-- Re-grant EXECUTE to `authenticated` on every SECURITY DEFINER function in public.
-- Keep `anon` and `PUBLIC` revoked (preserves original R1 intent).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skip %: %', r.sig, SQLERRM;
    END;
  END LOOP;
END$$;
