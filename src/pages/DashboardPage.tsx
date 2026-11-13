import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bot,
  Coins,
  Gem,
  Gift,
  KeyRound,
  PlusSquare,
  RefreshCw,
  Settings,
  ShoppingBag,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Eye } from 'lucide-react';
import { GameMode } from '../shared/types';

interface PublicRoomSummary {
  code: string;
  name: string;
  mode: GameMode;
  phase?: string;
  allowSpectators?: boolean;
  playerCount: number;
  spectatorCount?: number;
  maxPlayers: number;
  hostName: string;
}

export const DashboardPage: React.FC = () => {
  const { user, token, socket, t, lang, navigate, joinRoom, createRoom, showToast } = useApp();
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Matchmaking states
  const [showMatchmaking, setShowMatchmaking] = useState(false);
  const [mmMode, setMmMode] = useState<GameMode>('CLASSIC');
  const [mmStatus, setMmStatus] = useState<'IDLE' | 'QUEUED' | 'MATCHED'>('IDLE');
  const [mmWaitSec, setMmWaitSec] = useState(0);

  const handleStartQueue = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/matchmaking/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: mmMode, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMmStatus('QUEUED');
      setMmWaitSec(0);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleCancelQueue = async () => {
    if (token && mmStatus === 'QUEUED') {
      await fetch('/api/matchmaking/leave', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setMmStatus('IDLE');
    setMmWaitSec(0);
    setShowMatchmaking(false);
  };

  // Listen for real-time matchmaking match notification
  useEffect(() => {
    if (!socket || mmStatus !== 'QUEUED') return;
    const onMatched = (payload: { code: string }) => {
      if (!payload?.code) return;
      setMmStatus('MATCHED');
      setTimeout(async () => {
        setShowMatchmaking(false);
        setMmStatus('IDLE');
        await joinRoom(payload.code);
      }, 900);
    };
    socket.on('matchmaking:matched', onMatched);
    return () => {
      socket.off('matchmaking:matched', onMatched);
    };
  }, [socket, mmStatus, joinRoom]);

  // Poll matchmaking status while queued
  useEffect(() => {
    if (mmStatus !== 'QUEUED' || !token) return;
    const interval = setInterval(async () => {
      setMmWaitSec((prev) => prev + 1);
      try {
        const res = await fetch('/api/matchmaking/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.status === 'MATCHED' && data.matchedRoomCode) {
          setMmStatus('MATCHED');
          clearInterval(interval);
          setTimeout(async () => {
            setShowMatchmaking(false);
            setMmStatus('IDLE');
            await joinRoom(data.matchedRoomCode);
          }, 900);
        }
      } catch {
        // ignore
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [mmStatus, token]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms/public');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const startSoloPractice = async () => {
    await createRoom(lang === 'uz' ? 'Mashq xonasi' : 'Тренировочная', {
      mode: 'CLASSIC',
      maxPlayers: 8,
      isPrivate: true,
      allowSpectators: false,
      fillWithBots: true,
      timers: {
        roleAssignment: 5,
        night: 20,
        day: 6,
        discussion: 25,
        voting: 20,
        execution: 5,
      },
    });
  };

  const winRate =
    user && user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[#E7B65B] font-medium">{t.dashboard.welcome}</p>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7] mt-1">
            {user ? user.username : 'Guest Agent'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {user && (
            <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#111522]/85 border border-white/10 text-xs font-mono font-bold">
              <span className="inline-flex items-center gap-1 text-[#E7B65B]">
                <Coins className="w-3.5 h-3.5" />
                {user.gold}
              </span>
              <span className="inline-flex items-center gap-1 text-[#38BDF8]">
                <Gem className="w-3.5 h-3.5" />
                {user.diamonds}
              </span>
            </div>
          )}
          <button
            onClick={() => navigate('profile')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111522]/85 border border-white/10 text-xs font-semibold text-[#F5F5F7] hover:bg-white/10 transition-colors"
          >
            <User className="w-4 h-4 text-[#E7B65B]" />
            {t.nav.profile}
          </button>
          <button
            onClick={() => navigate('settings')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111522]/85 border border-white/10 text-xs font-semibold text-[#F5F5F7] hover:bg-white/10 transition-colors"
          >
            <Settings className="w-4 h-4 text-[#A855F7]" />
            {t.nav.settings}
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.dashboard.statsLevel, value: user?.level ?? 1, color: 'text-[#E7B65B]' },
          { label: t.dashboard.statsGames, value: user?.totalGames ?? 0, color: 'text-[#F5F5F7]' },
          { label: t.dashboard.statsWins, value: user?.wins ?? 0, color: 'text-emerald-400' },
          { label: t.dashboard.statsWinRate, value: `${winRate}%`, color: 'text-[#A855F7]' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.28 }}
            className="glass-panel rounded-2xl p-5 hover:border-white/20 transition-colors"
          >
            <p className="text-xs text-[#F5F5F7]/60">{stat.label}</p>
            <p className={`mt-2 font-mono text-3xl font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SMART MATCHMAKING (Tezkor O‘yin) */}
        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.16 }}
          onClick={() => {
            if (!user) {
              navigate('auth');
              return;
            }
            setShowMatchmaking(true);
          }}
          className="glass-panel rounded-2xl p-6 text-left border-red-500/30 hover:border-[#E63946] bg-gradient-to-br from-[#1E0E12] via-[#101426] to-[#0A0D18] transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#E63946]/15 rounded-full blur-xl pointer-events-none" />
          <Zap className="w-6 h-6 text-[#E63946] mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-display text-lg font-bold text-[#F5F5F7] group-hover:text-[#E63946] transition-colors flex items-center gap-1.5">
            {lang === 'uz' ? 'Tezkor O‘yin' : 'Быстрая игра'}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E63946]/20 text-[#E63946] font-bold uppercase">
              Elo MM
            </span>
          </h3>
          <p className="mt-1 text-xs text-[#F5F5F7]/65">
            {lang === 'uz' ? 'Darajangizga mos o‘yinchilarni tezkor qidirish' : 'Умный подбор по вашему рейтингу'}
          </p>
        </motion.button>

        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.16 }}
          onClick={() => navigate('create_room')}
          className="glass-panel rounded-2xl p-6 text-left hover:border-[#E63946]/50 transition-all group"
        >
          <PlusSquare className="w-6 h-6 text-[#E63946] mb-3" />
          <h3 className="font-display text-lg font-bold text-[#F5F5F7] group-hover:text-[#E63946] transition-colors">
            {t.nav.createRoom}
          </h3>
          <p className="mt-1 text-xs text-[#F5F5F7]/65">
            {lang === 'uz' ? '5–20 o‘yinchi · Maxsus sozlamalar' : '5–20 игроков · Свои правила'}
          </p>
        </motion.button>

        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.16 }}
          onClick={() => navigate('join_room')}
          className="glass-panel rounded-2xl p-6 text-left hover:border-[#E7B65B]/50 transition-all group"
        >
          <KeyRound className="w-6 h-6 text-[#E7B65B] mb-3" />
          <h3 className="font-display text-lg font-bold text-[#F5F5F7] group-hover:text-[#E7B65B] transition-colors">
            {t.nav.joinRoom}
          </h3>
          <p className="mt-1 text-xs text-[#F5F5F7]/65">
            {lang === 'uz' ? '6 belgili xona kodi orqali' : 'По 6-значному коду комнаты'}
          </p>
        </motion.button>

        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.16 }}
          onClick={startSoloPractice}
          className="glass-panel rounded-2xl p-6 text-left hover:border-[#A855F7]/50 transition-all group"
        >
          <Bot className="w-6 h-6 text-[#A855F7] mb-3" />
          <h3 className="font-display text-lg font-bold text-[#F5F5F7] group-hover:text-[#A855F7] transition-colors">
            {lang === 'uz' ? 'Botlar bilan mashq' : 'Тренировка с ботами'}
          </h3>
          <p className="mt-1 text-xs text-[#F5F5F7]/65">
            {lang === 'uz' ? 'Darhol lokal o‘yinni sinab ko‘ring' : 'Быстрый старт локальной партии'}
          </p>
        </motion.button>
      </div>

      {/* SMART MATCHMAKING QUEUE MODAL */}
      {showMatchmaking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-white/15 space-y-6 text-center">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-[#E7B65B] tracking-wider">
                {lang === 'uz' ? 'Smart Matchmaking Tizimi' : 'Умный подбор соперников'}
              </span>
              <button
                onClick={handleCancelQueue}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#F5F5F7] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Radar Animation / Icon */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[#E63946]/30 animate-ping pointer-events-none" />
              <div className="absolute inset-2 rounded-full border border-[#E7B65B]/40 animate-pulse pointer-events-none" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#E63946] to-[#E7B65B] flex items-center justify-center shadow-lg shadow-red-900/50">
                <Zap className="w-9 h-9 text-white animate-bounce" />
              </div>
            </div>

            {/* Mode Selector */}
            {mmStatus === 'IDLE' ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#F5F5F7]">
                    {lang === 'uz' ? 'Rejimni tanlang' : 'Выберите режим'}
                  </h3>
                  <p className="text-xs text-[#F5F5F7]/60 mt-1">
                    {lang === 'uz'
                      ? 'Elo reytingingizga mos raqiblar avtomatik qidiriladi'
                      : 'Поиск игроков с равным рейтингом Elo'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['CLASSIC', 'ADVANCED', 'CHAOS'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMmMode(m)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        mmMode === m
                          ? 'bg-[#E63946] border-[#E63946] text-white shadow-md'
                          : 'bg-[#090B12] border-white/10 text-[#F5F5F7]/70 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleStartQueue}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E63946] to-[#E7B65B] text-white font-black text-sm shadow-xl shadow-red-900/40 hover:brightness-110 transition-all"
                >
                  {lang === 'uz' ? 'Qidiruvni boshlash' : 'Начать поиск'}
                </button>
              </div>
            ) : mmStatus === 'QUEUED' ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#F5F5F7]">
                    {lang === 'uz' ? 'Raqiblar qidirilmoqda...' : 'Ищем соперников...'}
                  </h3>
                  <p className="text-xs font-mono text-[#E7B65B] mt-1">
                    {mmMode} · {lang.toUpperCase()} · Elo: {user?.rating ?? 1000}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#090B12] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#F5F5F7]/60">{lang === 'uz' ? 'Kutish vaqti' : 'Время поиска'}:</span>
                    <span className="font-bold text-white tabular-nums">{mmWaitSec}s</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#F5F5F7]/60">{lang === 'uz' ? 'Qidiruv doirasi' : 'Диапазон Elo'}:</span>
                    <span className="text-emerald-400 font-bold">±{300 + Math.min(mmWaitSec * 15, 600)} MMR</span>
                  </div>
                </div>

                <button
                  onClick={handleCancelQueue}
                  className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-[#F5F5F7] font-bold text-xs transition-colors"
                >
                  {lang === 'uz' ? 'Qidiruvni bekor qilish' : 'Отменить поиск'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-display text-xl font-bold text-emerald-400">
                  {lang === 'uz' ? 'O‘yin topildi!' : 'Матч найден!'}
                </h3>
                <p className="text-xs text-[#F5F5F7]/70">
                  {lang === 'uz' ? 'Xonaga ulanmoqda...' : 'Подключение к комнате...'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Elite Ecosystem Quick Links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'rewards' as const, icon: Gift, label: t.nav.rewards, color: 'text-[#E7B65B]' },
          { id: 'store' as const, icon: ShoppingBag, label: t.nav.store, color: 'text-[#E63946]' },
          { id: 'tournaments' as const, icon: Trophy, label: t.nav.tournaments, color: 'text-[#A855F7]' },
          { id: 'social' as const, icon: Users, label: t.nav.social, color: 'text-emerald-400' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className="glass-panel rounded-2xl p-4 flex items-center gap-3 text-left hover:border-white/25 transition-colors"
            >
              <Icon className={`w-5 h-5 ${item.color} shrink-0`} />
              <span className="font-display text-sm font-bold text-[#F5F5F7]">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Public Rooms List */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold text-[#F5F5F7]">
            {t.dashboard.publicRooms}
          </h2>
          <button
            onClick={fetchRooms}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F5F5F7]/70 hover:text-[#F5F5F7]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {lang === 'uz' ? 'Yangilash' : 'Обновить'}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#F5F5F7]/60">
            {t.dashboard.noPublicRooms}
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {rooms.map((r) => {
              const isLive = r.phase && r.phase !== 'LOBBY';
              return (
                <div key={r.code} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-[#F5F5F7]">{r.name}</span>
                      <span className="font-mono text-xs text-[#E7B65B]">{r.code}</span>
                      {isLive && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold text-purple-300 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> LIVE ({r.spectatorCount ?? 0})
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#F5F5F7]/60">
                      <span>{r.mode}</span>
                      <span>·</span>
                      <span>{r.hostName}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Users className="w-3.5 h-3.5" />
                        {r.playerCount}/{r.maxPlayers}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => joinRoom(r.code)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors inline-flex items-center gap-1.5 ${
                      isLive
                        ? 'bg-purple-600 hover:bg-purple-500'
                        : 'bg-[#E63946] hover:bg-[#E63946]/90'
                    }`}
                  >
                    {isLive && <Eye className="w-3.5 h-3.5" />}
                    {isLive
                      ? lang === 'uz'
                        ? 'Tomosha qilish'
                        : 'Наблюдать'
                      : t.dashboard.join}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
