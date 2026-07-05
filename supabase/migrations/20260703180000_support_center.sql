-- Support Center: tickets, messages, ticket numbering, storage, RLS

-- Extend existing support_tickets table
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS escrow_id text,
  ADD COLUMN IF NOT EXISTS project_id text,
  ADD COLUMN IF NOT EXISTS service_id text,
  ADD COLUMN IF NOT EXISTS ai_asset_id text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_ticket_number
  ON public.support_tickets(ticket_number)
  WHERE ticket_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
  ON public.support_tickets(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON public.support_tickets(status);

-- Daily sequence for ZSUP-YYYYMMDD-000123 format
CREATE TABLE IF NOT EXISTS public.support_ticket_daily_seq (
  seq_date date PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.generate_support_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  today date := (timezone('UTC', now()))::date;
  next_val integer;
BEGIN
  IF NEW.ticket_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.support_ticket_daily_seq AS s (seq_date, last_value)
  VALUES (today, 1)
  ON CONFLICT (seq_date) DO UPDATE
    SET last_value = s.last_value + 1
  RETURNING last_value INTO next_val;

  NEW.ticket_number := 'ZSUP-' || to_char(today, 'YYYYMMDD') || '-' || lpad(next_val::text, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_ticket_number ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_support_ticket_number();

CREATE OR REPLACE FUNCTION public.touch_support_ticket_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.support_tickets
  SET updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

-- Conversation messages
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_role text NOT NULL DEFAULT 'user' CHECK (sender_role IN ('user', 'staff', 'system')),
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id
  ON public.support_ticket_messages(ticket_id, created_at ASC);

DROP TRIGGER IF EXISTS trg_support_ticket_messages_touch_ticket ON public.support_ticket_messages;
CREATE TRIGGER trg_support_ticket_messages_touch_ticket
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_support_ticket_updated_at();

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Normalize legacy priority/status values
UPDATE public.support_tickets SET priority = 'medium' WHERE priority = 'normal';
UPDATE public.support_tickets SET priority = 'high' WHERE priority = 'critical';
UPDATE public.support_tickets SET status = 'open' WHERE status IS NULL;

ALTER TABLE public.support_tickets
  ALTER COLUMN status SET DEFAULT 'open';

-- Backfill ticket numbers for existing rows
DO $$
DECLARE
  r record;
  today date := (timezone('UTC', now()))::date;
  next_val integer;
BEGIN
  FOR r IN SELECT id FROM public.support_tickets WHERE ticket_number IS NULL ORDER BY created_at ASC LOOP
    INSERT INTO public.support_ticket_daily_seq AS s (seq_date, last_value)
    VALUES (today, 1)
    ON CONFLICT (seq_date) DO UPDATE
      SET last_value = s.last_value + 1
    RETURNING last_value INTO next_val;

    UPDATE public.support_tickets
    SET ticket_number = 'ZSUP-' || to_char(today, 'YYYYMMDD') || '-' || lpad(next_val::text, 6, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- RLS for support_tickets
DROP POLICY IF EXISTS "Users can insert own support tickets" ON public.support_tickets;
CREATE POLICY "Users can insert own support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own support tickets" ON public.support_tickets;
CREATE POLICY "Users can read own support tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own support tickets" ON public.support_tickets;
CREATE POLICY "Users can update own support tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage support tickets" ON public.support_tickets;
CREATE POLICY "Admins can manage support tickets"
  ON public.support_tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- RLS for support_ticket_messages
DROP POLICY IF EXISTS "Users can read messages on own tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can read messages on own tickets"
  ON public.support_ticket_messages FOR SELECT
  USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages on own tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can insert messages on own tickets"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (
    sender_role = 'user'
    AND sender_id = auth.uid()
    AND is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage support ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Admins can manage support ticket messages"
  ON public.support_ticket_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Storage bucket for attachments (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload support attachments" ON storage.objects;
CREATE POLICY "Users upload support attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users read own support attachments" ON storage.objects;
CREATE POLICY "Users read own support attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'support-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Admins read all support attachments" ON storage.objects;
CREATE POLICY "Admins read all support attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'support-attachments'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

ALTER TABLE public.support_ticket_daily_seq ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_ticket_daily_seq FROM anon, authenticated;
