-- ============================================
-- Enable Realtime for moderation & roles tables
-- so chat UI updates instantly
-- ============================================

-- Add chat_moderation_actions to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'chat_moderation_actions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_moderation_actions;
  END IF;
END $$;

-- Add chat_user_roles to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'chat_user_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_user_roles;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL for these tables so realtime
-- can broadcast the full row (including old values on UPDATE/DELETE)
ALTER TABLE public.chat_presence REPLICA IDENTITY FULL;
ALTER TABLE public.chat_moderation_actions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_user_roles REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_reactions REPLICA IDENTITY FULL;
