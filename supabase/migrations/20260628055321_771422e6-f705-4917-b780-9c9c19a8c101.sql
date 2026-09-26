DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT c.relname AS table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname = 'public'
    LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl.table_name);
    END LOOP;
END;
$$;

GRANT SELECT ON public.jobs TO anon;

DO $$
BEGIN
  IF to_regclass('public.company_public_profiles') IS NOT NULL THEN
    GRANT SELECT ON public.company_public_profiles TO anon;
  END IF;
END $$;