-- MAFIA PRO — Complete Admin Control Center Migration (002)
-- Reuses existing users, live_rooms, game_history, and 001_premium_economy tables.

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  description_uz TEXT NOT NULL DEFAULT '',
  description_ru TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('read', 'create', 'edit', 'delete')),
  UNIQUE (module_id, action)
);

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  role_id TEXT NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  can_read BOOLEAN NOT NULL DEFAULT FALSE,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (role_id, module_id)
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id TEXT PRIMARY KEY,
  admin_role_slug TEXT NOT NULL REFERENCES public.admin_roles(slug),
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title_uz TEXT NOT NULL,
  title_ru TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED')),
  discount_percent INTEGER NOT NULL DEFAULT 0,
  fixed_amount_uzs INTEGER NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('ALL', 'VIP_PLAN', 'SHOP_PRODUCT')),
  max_uses INTEGER,
  per_user_limit INTEGER DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id TEXT PRIMARY KEY,
  promo_id TEXT NOT NULL REFERENCES public.promo_codes(id),
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  discount_uzs INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON public.promo_redemptions(user_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('GLOBAL', 'VIP', 'TOURNAMENT', 'PRODUCT', 'MAINTENANCE', 'SELECTED')),
  target_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('SENT', 'SCHEDULED', 'CANCELLED')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_configs (
  role_id TEXT PRIMARY KEY,
  name_uz TEXT,
  name_ru TEXT,
  description_uz TEXT,
  description_ru TEXT,
  ability_uz TEXT,
  ability_ru TEXT,
  team TEXT,
  rarity TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.website_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  site_title TEXT NOT NULL DEFAULT 'MAFIA PRO',
  logo_url TEXT NOT NULL DEFAULT '',
  favicon_url TEXT NOT NULL DEFAULT '',
  hero_title_uz TEXT NOT NULL DEFAULT '',
  hero_title_ru TEXT NOT NULL DEFAULT '',
  banner_text_uz TEXT NOT NULL DEFAULT '',
  banner_text_ru TEXT NOT NULL DEFAULT '',
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  ads_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  privacy_policy TEXT NOT NULL DEFAULT '',
  terms_of_service TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARN', 'CRITICAL')),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_system_events_created ON public.system_events(created_at DESC);
