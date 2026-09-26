DROP POLICY IF EXISTS "HR can insert offers" ON public.offer_letters;
DROP POLICY IF EXISTS "HR can update offers" ON public.offer_letters;

CREATE POLICY "Staff can insert company offers"
ON public.offer_letters FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_user_company() AND public.is_hr_or_admin());

CREATE POLICY "Staff can update company offers"
ON public.offer_letters FOR UPDATE TO authenticated
USING (company_id = public.current_user_company() AND public.is_hr_or_admin())
WITH CHECK (company_id = public.current_user_company() AND public.is_hr_or_admin());

CREATE OR REPLACE FUNCTION public.applications_block_candidate_tamper()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role text; v_allowed boolean := false; v_offer_accepted boolean := false;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE user_id = auth.uid();
  IF v_role IS NULL OR v_role <> 'candidate' THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.offer_letters o
    JOIN public.users u ON u.id = o.candidate_id
    WHERE o.application_id = NEW.id
      AND u.user_id = auth.uid()
      AND o.status = 'accepted'
  ) INTO v_offer_accepted;

  IF NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN
    IF OLD.current_stage IN ('video_intro') AND NEW.current_stage = 'video_submitted' THEN
      v_allowed := true;
    END IF;
    IF v_offer_accepted AND NEW.current_stage = 'hired' THEN
      v_allowed := true;
    END IF;
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Candidates cannot modify scoring, stage, status, or analysis fields on applications';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (v_offer_accepted AND NEW.status = 'hired') THEN
    RAISE EXCEPTION 'Candidates cannot modify scoring, stage, status, or analysis fields on applications';
  END IF;

  IF NEW.candidate_id      IS DISTINCT FROM OLD.candidate_id
     OR NEW.job_id         IS DISTINCT FROM OLD.job_id
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
$function$;