-- Harden dispute support functions after enabling the dispute schema.

ALTER FUNCTION public.touch_dispute_updated_at() SET search_path = public;
ALTER FUNCTION public.has_active_dispute(uuid) SET search_path = public;
ALTER FUNCTION public.prevent_milestone_changes_during_dispute() SET search_path = public;
ALTER FUNCTION public.prevent_reviews_during_dispute() SET search_path = public;
ALTER FUNCTION public.prevent_project_completion_during_dispute() SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_new_message_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_message_notification() FROM anon, authenticated;
