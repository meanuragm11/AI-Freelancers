-- Reply, edit metadata, in-app notifications on new messages

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz NULL;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to);

CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_sender_name text;
  v_inbox_link text;
  v_preview text;
  v_project_title text;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    CASE WHEN c.buyer_id = NEW.sender_id THEN c.builder_id ELSE c.buyer_id END,
    CASE WHEN c.buyer_id = NEW.sender_id THEN '/builder/inbox' ELSE '/buyer/messages' END,
    COALESCE(c.title, 'Your project')
  INTO v_recipient_id, v_inbox_link, v_project_title
  FROM public.collabs c
  WHERE c.id = NEW.collab_id;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'Someone') INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  v_preview := LEFT(COALESCE(NULLIF(TRIM(NEW.text), ''), NULLIF(TRIM(NEW.content), ''), 'New message'), 200);

  IF v_preview LIKE '[[FILE|%' THEN
    v_preview := 'Sent an attachment';
  ELSIF v_preview LIKE '[[MILESTONE|%' THEN
    v_preview := 'Sent a milestone proposal';
  ELSIF v_preview LIKE '[[QUOTATION|%' THEN
    v_preview := 'Sent a quotation';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link, is_read, metadata)
  VALUES (
    v_recipient_id,
    'message',
    'New message from ' || v_sender_name,
    v_preview,
    v_inbox_link,
    false,
    jsonb_build_object(
      'collabId', NEW.collab_id,
      'conversationId', NEW.collab_id,
      'messageId', NEW.id,
      'senderId', NEW.sender_id,
      'senderName', v_sender_name,
      'projectName', v_project_title
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created_notify ON public.messages;
CREATE TRIGGER on_message_created_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_notification();
