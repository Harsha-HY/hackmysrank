
-- Revoke public/anon/authenticated EXECUTE on all remaining trigger and helper
-- SECURITY DEFINER functions. They only need to run inside their triggers
-- (which execute as the table owner) or through code paths that use them.

REVOKE EXECUTE ON FUNCTION public.chat_messages_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_self_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_candidate_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.offer_letters_block_candidate_tamper() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.applications_block_candidate_tamper() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.users_block_role_self_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_notification_user_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
