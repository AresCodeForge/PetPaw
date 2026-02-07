-- ============================================
-- Add message_type to chat_messages
-- Supports 'user' (default) and 'system' messages
-- System messages are used for join/leave events
-- ============================================

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'user';

-- Index for filtering system messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_type
  ON public.chat_messages(message_type) WHERE message_type = 'system';

COMMENT ON COLUMN public.chat_messages.message_type IS 'Message type: user (regular), system (join/leave/events)';
