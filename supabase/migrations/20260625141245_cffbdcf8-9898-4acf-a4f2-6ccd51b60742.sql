
CREATE TABLE public.ai_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_chat_threads_candidate ON public.ai_chat_threads(candidate_id, updated_at DESC);

CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_chat_messages_thread ON public.ai_chat_messages(thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_threads TO authenticated;
GRANT ALL ON public.ai_chat_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;

ALTER TABLE public.ai_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates manage their own threads"
  ON public.ai_chat_threads FOR ALL
  USING (candidate_id IN (SELECT id FROM public.users WHERE user_id = auth.uid()))
  WITH CHECK (candidate_id IN (SELECT id FROM public.users WHERE user_id = auth.uid()));

CREATE POLICY "Candidates manage messages in their threads"
  ON public.ai_chat_messages FOR ALL
  USING (thread_id IN (SELECT id FROM public.ai_chat_threads
    WHERE candidate_id IN (SELECT id FROM public.users WHERE user_id = auth.uid())))
  WITH CHECK (thread_id IN (SELECT id FROM public.ai_chat_threads
    WHERE candidate_id IN (SELECT id FROM public.users WHERE user_id = auth.uid())));

CREATE TRIGGER update_ai_chat_threads_updated_at
  BEFORE UPDATE ON public.ai_chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
