-- MAFIA PRO 2.0 — Premium Economy Database Migration
-- Preserves existing users, live_rooms, and game_history tables.

CREATE TABLE IF NOT EXISTS public.vip_plans (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  description_uz TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  price_uzs INTEGER NOT NULL CHECK (price_uzs >= 0),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL REFERENCES public.vip_plans(id),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED', 'REFUNDED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  order_id TEXT,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.product_categories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.shop_products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.product_categories(id),
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  description_uz TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  price_uzs INTEGER NOT NULL CHECK (price_uzs >= 0),
  price_gold INTEGER,
  price_diamonds INTEGER,
  rarity TEXT NOT NULL CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  preview_color TEXT NOT NULL DEFAULT '#E7B65B',
  is_unique BOOLEAN NOT NULL DEFAULT TRUE,
  vip_only BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shop_products_category ON public.shop_products(category_id);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('VIP_PLAN', 'SHOP_PRODUCT')),
  reference_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  amount_uzs INTEGER NOT NULL CHECK (amount_uzs >= 0),
  discount_uzs INTEGER NOT NULL DEFAULT 0,
  promo_code TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('PAYME', 'CLICK', 'SANDBOX')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED')),
  refund_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id),
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_tx_id TEXT UNIQUE NOT NULL,
  amount_uzs INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
  idempotency_key TEXT UNIQUE NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  order_id TEXT,
  provider_tx_id TEXT,
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  order_id TEXT,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);

CREATE TABLE IF NOT EXISTS public.equipped_items (
  user_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  equipped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARN', 'CRITICAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
