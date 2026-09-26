CREATE OR REPLACE FUNCTION public.applications_block_candidate_tamper()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role text; v_allowed boolean := false;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE user_id = auth.uid();
  IF v_role IS NULL OR v_role <> 'candidate' THEN RETURN NEW; END IF;

  -- Allow the candidate's own self-submission transitions (video intro upload).
  IF NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN
    IF OLD.current_stage IN ('video_intro') AND NEW.current_stage = 'video_submitted' THEN
      v_allowed := true;
    END IF;
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Candidates cannot modify scoring, stage, status, or analysis fields on applications';
    END IF;
  END IF;

  IF NEW.candidate_id      IS DISTINCT FROM OLD.candidate_id
     OR NEW.job_id         IS DISTINCT FROM OLD.job_id
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
$function$;