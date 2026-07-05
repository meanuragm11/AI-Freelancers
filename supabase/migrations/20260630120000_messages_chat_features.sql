-- Chat messaging fixes: soft delete (unsend), read receipts, content/text sync

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Keep text/content in sync so client code can use either column
CREATE OR REPLACE FUNCTION public.sync_message_text_content()
RETURNS trigger AS $$
BEGIN
  IF NEW.text IS NULL AND NEW.content IS NOT NULL THEN
    NEW.text := NEW.content;
  ELSIF NEW.content IS NULL AND NEW.text IS NOT NULL THEN
    NEW.content := NEW.text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_message_text_content_trigger ON public.messages;
CREATE TRIGGER sync_message_text_content_trigger
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.sync_message_text_content();

-- Read receipts + unsend require UPDATE (Postgres RLS needs SELECT + UPDATE policies)
DROP POLICY IF EXISTS "Users can update their collab messages" ON public.messages;
CREATE POLICY "Users can update their collab messages"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.collabs
    WHERE collabs.id = messages.collab_id
      AND (collabs.buyer_id = auth.uid() OR collabs.builder_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collabs
    WHERE collabs.id = messages.collab_id
      AND (collabs.buyer_id = auth.uid() OR collabs.builder_id = auth.uid())
  )
);
