
-- Ensure aptitude_cutoff defaults to 60 and not null; backfill existing nulls
UPDATE public.jobs SET aptitude_cutoff = 60 WHERE aptitude_cutoff IS NULL;
ALTER TABLE public.jobs ALTER COLUMN aptitude_cutoff SET DEFAULT 60;
ALTER TABLE public.jobs ALTER COLUMN aptitude_cutoff SET NOT NULL;

-- Switch test_score to numeric so we can keep 2 decimals
ALTER TABLE public.applications ALTER COLUMN test_score TYPE numeric(5,2) USING test_score::numeric;

-- Track test pass/fail and rejection metadata
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS test_status text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS rejection_stage text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS rejection_reason text;

-- The previous auto_advance_on_test_score trigger conflicts with the new
-- application-level cutoff logic, drop it so the client owns the decision.
DROP TRIGGER IF EXISTS trg_auto_advance_on_test_score ON public.applications;
DROP FUNCTION IF EXISTS public.auto_advance_on_test_score();
