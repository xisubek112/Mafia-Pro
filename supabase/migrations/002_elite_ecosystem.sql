-- MAFIA PRO ELITE — Ecosystem Database Schema, Indexes & RLS Policies

-- 1. Extend profiles with competitive & progression fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'UZ',
  ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS tournament_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_win_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_title TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_weekly_xp ON public.profiles(weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);

-- 2. Player Achievements & Titles
CREATE TABLE IF NOT EXISTS public.player_achievements (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.player_titles (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, title_id)
);

-- 3. Currency Wallets & Transactions
CREATE TABLE IF NOT EXISTS public.currency_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  gold INTEGER NOT NULL DEFAULT 100 CHECK (gold >= 0),
  diamonds INTEGER NOT NULL DEFAULT 5 CHECK (diamonds >= 0),
  daily_streak INTEGER NOT NULL DEFAULT 0,
  last_daily_claim_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.currency_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('GOLD', 'DIAMONDS')),
  amount INTEGER NOT NULL,
  tx_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_user_created ON public.currency_transactions(user_id, created_at DESC);

-- 4. Cosmetic Inventory & Purchases
CREATE TABLE IF NOT EXISTS public.cosmetic_inventory (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  cosmetic_id TEXT NOT NULL,
  category TEXT NOT NULL,
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, cosmetic_id)
);

CREATE TABLE IF NOT EXISTS public.cosmetic_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cosmetic_id TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('GOLD', 'DIAMONDS')),
  price INTEGER NOT NULL CHECK (price >= 0),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'FREE' CHECK (tier IN ('FREE', 'ELITE')),
  status TEXT NOT NULL DEFAULT 'NONE' CHECK (status IN ('NONE', 'ACTIVE', 'CANCELLED', 'EXPIRED')),
  provider TEXT,
  external_subscription_id TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tournaments & Matches
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN')),
  mode TEXT NOT NULL CHECK (mode IN ('CLASSIC', 'ADVANCED', 'CHAOS')),
  max_players INTEGER NOT NULL CHECK (max_players >= 4 AND max_players <= 64),
  prize_gold INTEGER NOT NULL DEFAULT 0,
  prize_diamonds INTEGER NOT NULL DEFAULT 0,
  entry_fee_gold INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'REGISTRATION' CHECK (status IN ('REGISTRATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  participants UUID[] NOT NULL DEFAULT '{}',
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);

CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  bracket TEXT NOT NULL,
  player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tm_tournament ON public.tournament_matches(tournament_id, round);

-- 7. Friends & Audit Logs
CREATE TABLE IF NOT EXISTS public.friends (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'BLOCKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARN', 'CRITICAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetic_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetic_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users read own wallet" ON public.currency_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own transactions" ON public.currency_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own inventory" ON public.cosmetic_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tournaments are publicly readable" ON public.tournaments FOR SELECT USING (TRUE);
CREATE POLICY "Tournament matches are publicly readable" ON public.tournament_matches FOR SELECT USING (TRUE);
CREATE POLICY "Users manage own friends" ON public.friends FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);
