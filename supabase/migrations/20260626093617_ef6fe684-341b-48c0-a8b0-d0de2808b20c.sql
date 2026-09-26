
-- Scheduled messages table
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | cancelled | failed
  sent_at timestamptz,
  delivered_message_id uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_messages TO authenticated;
GRANT ALL ON public.scheduled_messages TO service_role;

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender can view own scheduled messages"
  ON public.scheduled_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Sender can insert own scheduled messages"
  ON public.scheduled_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_hr_or_admin());

CREATE POLICY "Sender can update own pending scheduled messages"
  ON public.scheduled_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() AND status = 'pending')
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Sender can delete own pending scheduled messages"
  ON public.scheduled_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() AND status = 'pending');

CREATE INDEX IF NOT EXISTS scheduled_messages_due_idx
  ON public.scheduled_messages (status, scheduled_at);

CREATE TRIGGER scheduled_messages_updated_at
  BEFORE UPDATE ON public.scheduled_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Flag on chat_messages for "sent automatically"
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS was_scheduled boolean NOT NULL DEFAULT false;

-- Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
