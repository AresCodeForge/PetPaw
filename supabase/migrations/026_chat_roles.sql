-- ============================================================================
-- 026_chat_roles.sql
-- Chat role system: administrative + cosmetic roles, moderation actions
-- ============================================================================

-- Chat role definitions
CREATE TABLE IF NOT EXISTS public.chat_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name_en text NOT NULL,
  display_name_el text NOT NULL,
  description_en text,
  description_el text,
  icon text NOT NULL,       -- lucide icon name
  color text NOT NULL,      -- hex color
  priority int NOT NULL DEFAULT 0,  -- higher = more prominent display
  is_administrative boolean NOT NULL DEFAULT false,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User-to-role assignments (room_id NULL = global role)
CREATE TABLE IF NOT EXISTS public.chat_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.chat_roles(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id, room_id)
);

-- Moderation actions log (ban, silence, kick, warn)
CREATE TABLE IF NOT EXISTS public.chat_moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('kick', 'ban', 'silence', 'warn')),
  reason text,
  duration_minutes int,         -- NULL = permanent
  expires_at timestamptz,       -- calculated: issued_at + duration
  issued_by uuid NOT NULL REFERENCES auth.users(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_user_roles_user ON public.chat_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_roles_room ON public.chat_user_roles(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_mod_actions_user ON public.chat_moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_mod_actions_active ON public.chat_moderation_actions(user_id, room_id)
  WHERE revoked_at IS NULL;

-- RLS
ALTER TABLE public.chat_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat roles" ON public.chat_roles FOR SELECT USING (true);
CREATE POLICY "Anyone can view role assignments" ON public.chat_user_roles FOR SELECT USING (true);
CREATE POLICY "Users can view own moderation actions" ON public.chat_moderation_actions FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- Seed default roles
-- ============================================================================
-- Administrative roles (with permissions)
-- Permissions: kick_user, ban_user, silence_user, warn_user, delete_messages,
--              pin_messages, manage_room, assign_roles
-- ============================================================================

INSERT INTO public.chat_roles (name, display_name_en, display_name_el, description_en, description_el, icon, color, priority, is_administrative, permissions) VALUES
  -- === ADMINISTRATIVE ===
  ('admin',       'Admin',       'Διαχειριστής',
   'Site administrator with full control',
   'Διαχειριστής ιστοσελίδας με πλήρη έλεγχο',
   'ShieldCheck', '#1e3a5f', 100, true,
   '["kick_user","ban_user","silence_user","warn_user","delete_messages","pin_messages","manage_room","assign_roles"]'::jsonb),

  ('moderator',   'Moderator',   'Συντονιστής',
   'Chat moderator — can kick, ban, silence, warn, delete messages',
   'Συντονιστής — μπορεί να αποβάλει, αποκλείσει, σιγήσει, προειδοποιήσει',
   'Shield', '#e07a5f', 90, true,
   '["kick_user","ban_user","silence_user","warn_user","delete_messages"]'::jsonb),

  ('helper',      'Helper',      'Βοηθός',
   'Community helper — can warn users and delete inappropriate messages',
   'Βοηθός κοινότητας — μπορεί να προειδοποιήσει και να διαγράψει μηνύματα',
   'HandHelping', '#3b82f6', 80, true,
   '["warn_user","delete_messages"]'::jsonb),

  -- === COSMETIC (pet-themed) ===
  ('veterinarian', 'Veterinarian', 'Κτηνίατρος',
   'Verified veterinary professional',
   'Πιστοποιημένος κτηνίατρος',
   'Stethoscope', '#16a34a', 50, false, '[]'::jsonb),

  ('top_paw',     'Top Paw',     'Κορυφαίο Πατουσάκι',
   'Outstanding community contributor',
   'Εξαιρετικό μέλος της κοινότητας',
   'Crown', '#d97706', 40, false, '[]'::jsonb),

  ('rescue_hero', 'Rescue Hero', 'Ήρωας Διάσωσης',
   'Shelter volunteer or rescue advocate',
   'Εθελοντής καταφυγίου',
   'HeartHandshake', '#ec4899', 30, false, '[]'::jsonb),

  ('pet_scholar', 'Pet Scholar', 'Γνώστης Ζώων',
   'Knowledgeable pet care expert',
   'Έμπειρος γνώστης φροντίδας ζώων',
   'GraduationCap', '#7c3aed', 20, false, '[]'::jsonb),

  ('pawstar',     'Pawstar',     'Αστέρι',
   'Popular and active community member',
   'Δημοφιλές και ενεργό μέλος',
   'Star', '#f59e0b', 10, false, '[]'::jsonb)
ON CONFLICT (name) DO NOTHING;
