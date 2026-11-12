import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bot, Coins, Gem, Gift, KeyRound, PlusSquare, RefreshCw, Settings, ShoppingBag, Trophy, User, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GameMode } from '../shared/types';

interface PublicRoomSummary {
  code: string;
  name: string;
  mode: GameMode;
  playerCount: number;
  maxPlayers: number;
  hostName: string;
}

export const DashboardPage: React.FC = () => {
  const { user, t, lang, navigate, joinRoom, createRoom } = useApp();
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="grid sm:grid-cols-3 gap-4">
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
            {rooms.map((r) => (
              <div key={r.code} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#F5F5F7]">{r.name}</span>
                    <span className="font-mono text-xs text-[#E7B65B]">{r.code}</span>
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
                  className="px-4 py-2 rounded-lg bg-[#E63946] text-xs font-semibold text-white hover:bg-[#E63946]/90 transition-colors"
                >
                  {t.dashboard.join}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
