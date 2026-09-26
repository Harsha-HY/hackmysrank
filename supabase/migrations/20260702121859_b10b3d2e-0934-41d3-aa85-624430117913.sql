
-- 1. APPLICATIONS: block candidates from changing scoring/pipeline fields
CREATE OR REPLACE FUNCTION public.applications_block_candidate_tamper()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE user_id = auth.uid();
  IF v_role IS NULL OR v_role <> 'candidate' THEN RETURN NEW; END IF;
  IF NEW.candidate_id      IS DISTINCT FROM OLD.candidate_id
     OR NEW.job_id         IS DISTINCT FROM OLD.job_id
     OR NEW.current_stage  IS DISTINCT FROM OLD.current_stage
     OR NEW.status         IS DISTINCT FROM OLD.status
     OR NEW.resume_score   IS DISTINCT FROM OLD.resume_score
     OR NEW.video_score    IS DISTINCT FROM OLD.video_score
     OR NEW.technical_score IS DISTINCT FROM OLD.technical_score
     OR NEW.interview_score IS DISTINCT FROM OLD.interview_score
     OR NEW.overall_score  IS DISTINCT FROM OLD.overall_score
     OR NEW.test_score     IS DISTINCT FROM OLD.test_score
     OR NEW.test_status    IS DISTINCT FROM OLD.test_status
     OR NEW.ai_analysis    IS DISTINCT FROM OLD.ai_analysis
     OR NEW.video_analysis IS DISTINCT FROM OLD.video_analysis
     OR NEW.rejection_stage IS DISTINCT FROM OLD.rejection_stage
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
  THEN
    RAISE EXCEPTION 'Candidates cannot modify scoring, stage, status, or analysis fields on applications';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_block_candidate_tamper_trg ON public.applications;
CREATE TRIGGER applications_block_candidate_tamper_trg
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.applications_block_candidate_tamper();


-- 2. OFFER_LETTERS: block candidates from changing anything except status/accepted_at/decline_reason
CREATE OR REPLACE FUNCTION public.offer_letters_block_candidate_tamper()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE user_id = auth.uid();
  IF v_role IS NULL OR v_role <> 'candidate' THEN RETURN NEW; END IF;
  IF NEW.application_id     IS DISTINCT FROM OLD.application_id
     OR NEW.candidate_id    IS DISTINCT FROM OLD.candidate_id
     OR NEW.job_id          IS DISTINCT FROM OLD.job_id
     OR NEW.company_id      IS DISTINCT FROM OLD.company_id
     OR NEW.designation     IS DISTINCT FROM OLD.designation
     OR NEW.department      IS DISTINCT FROM OLD.department
     OR NEW.ctc_total       IS DISTINCT FROM OLD.ctc_total
     OR NEW.basic_salary    IS DISTINCT FROM OLD.basic_salary
     OR NEW.hra             IS DISTINCT FROM OLD.hra
     OR NEW.performance_bonus IS DISTINCT FROM OLD.performance_bonus
     OR NEW.other_allowances IS DISTINCT FROM OLD.other_allowances
     OR NEW.esops           IS DISTINCT FROM OLD.esops
     OR NEW.joining_date    IS DISTINCT FROM OLD.joining_date
     OR NEW.accept_by       IS DISTINCT FROM OLD.accept_by
     OR NEW.work_location   IS DISTINCT FROM OLD.work_location
     OR NEW.work_type       IS DISTINCT FROM OLD.work_type
     OR NEW.probation_period IS DISTINCT FROM OLD.probation_period
  THEN
    RAISE EXCEPTION 'Candidates may only update status, accepted_at, or decline_reason on offer letters';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offer_letters_block_candidate_tamper_trg ON public.offer_letters;
CREATE TRIGGER offer_letters_block_candidate_tamper_trg
  BEFORE UPDATE ON public.offer_letters
  FOR EACH ROW EXECUTE FUNCTION public.offer_letters_block_candidate_tamper();


-- 3. CANDIDATE_NOTES: scope to same company
DROP POLICY IF EXISTS "HR/Admin can view notes"   ON public.candidate_notes;
DROP POLICY IF EXISTS "HR/Admin can insert notes" ON public.candidate_notes;
DROP POLICY IF EXISTS "HR/Admin can update notes" ON public.candidate_notes;
DROP POLICY IF EXISTS "HR/Admin can delete notes" ON public.candidate_notes;

CREATE POLICY "HR/Admin can view notes"
ON public.candidate_notes FOR SELECT
TO authenticated
USING (public.is_hr_or_admin() AND public.is_candidate_for_my_company(candidate_id));

CREATE POLICY "HR/Admin can insert notes"
ON public.candidate_notes FOR INSERT
TO authenticated
WITH CHECK (
  public.is_hr_or_admin()
  AND created_by = auth.uid()
  AND public.is_candidate_for_my_company(candidate_id)
);

CREATE POLICY "HR/Admin can update notes"
ON public.candidate_notes FOR UPDATE
TO authenticated
USING (public.is_hr_or_admin() AND public.is_candidate_for_my_company(candidate_id))
WITH CHECK (public.is_hr_or_admin() AND public.is_candidate_for_my_company(candidate_id));

CREATE POLICY "HR/Admin can delete notes"
ON public.candidate_notes FOR DELETE
TO authenticated
USING (public.is_hr_or_admin() AND public.is_candidate_for_my_company(candidate_id));


-- 4. USERS: revoke column-level UPDATE on role/company_id, plus attach trigger as belt-and-braces
REVOKE UPDATE (role, company_id) ON public.users FROM authenticated, anon;
GRANT UPDATE (role, company_id) ON public.users TO service_role;

DROP TRIGGER IF EXISTS users_block_role_self_update_trg ON public.users;
CREATE TRIGGER users_block_role_self_update_trg
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_block_role_self_update();
