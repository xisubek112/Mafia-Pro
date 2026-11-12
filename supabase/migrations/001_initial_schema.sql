-- MAFIA PRO — Supabase PostgreSQL Schema & Row Level Security Policies
-- Run this migration in your Supabase SQL Editor when connecting external PostgreSQL.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Profiles (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 24),
  avatar TEXT NOT NULL DEFAULT 'crimson',
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  total_games INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  favorite_role TEXT,
  role_play_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  achievements TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Rooms Registry
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code CHAR(6) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('CLASSIC', 'ADVANCED', 'CHAOS')),
  max_players INTEGER NOT NULL CHECK (max_players >= 5 AND max_players <= 20),
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'LOBBY' CHECK (status IN ('LOBBY', 'ACTIVE', 'FINISHED', 'EXPIRED')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '4 hours')
);

-- 3. Game History
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code CHAR(6) NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('CLASSIC', 'ADVANCED', 'CHAOS')),
  player_count INTEGER NOT NULL,
  winner TEXT NOT NULL,
  rounds INTEGER NOT NULL,
  duration_sec INTEGER NOT NULL,
  players JSONB NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Moderation Reports
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_code CHAR(6) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (NOT is_banned);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public rooms are viewable"
  ON public.rooms FOR SELECT
  USING (NOT is_private OR host_id = auth.uid());

CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Game history is publicly readable"
  ON public.game_history FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can submit moderation reports"
  ON public.moderation_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Only admins can view/manage all reports"
  ON public.moderation_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );
