
-- 1. Add missing columns to chatbot_conversations (used by the qualify/update step)
ALTER TABLE public.chatbot_conversations
  ADD COLUMN IF NOT EXISTS qualified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id),
  ADD COLUMN IF NOT EXISTS visitor_name text,
  ADD COLUMN IF NOT EXISTS visitor_phone text,
  ADD COLUMN IF NOT EXISTS service_interest text,
  ADD COLUMN IF NOT EXISTS location text;

-- 2. Create chatbot_messages table (message history per conversation)
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chatbot_messages_conversation_id_idx
  ON public.chatbot_messages (conversation_id, created_at);

ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

-- Mirror the existing chatbot_conversations RLS pattern:
-- public/anon can insert (the widget writes user+assistant turns directly),
-- only authenticated (dashboard) can read.
CREATE POLICY "Allow insert for all" ON public.chatbot_messages
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow select for authenticated" ON public.chatbot_messages
  FOR SELECT TO public USING (auth.role() = 'authenticated'::text);
;
