import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Award, Ban, BarChart3, CheckCircle, Coins, Crown, Flag, Gem, LogOut, Search, Shield, Trophy, Volume2, VolumeX, XCircle } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { ROLE_LIST, ROLES } from '../shared/roles';
import { RARITY_LABELS, ROLE_VISUALS, RoleRarity } from '../shared/roleCards';
import { ACHIEVEMENTS, TITLES } from '../shared/achievements';
import { COUNTRIES, getCompetitiveRankName } from '../shared/ecosystem';
import { GameHistoryRecord, Team, UserProfile } from '../shared/types';
import { PWAInstallButton } from '../components/Navbar';
import { RoleCard } from '../components/RoleCard';
import { AdminControlCenter } from './AdminControlCenter';

export const RolesPage: React.FC = () => {
  const { t, lang, user } = useApp();
  const [teamFilter, setTeamFilter] = useState<'ALL' | Team>('ALL');
  const [rarityFilter, setRarityFilter] = useState<'ALL' | RoleRarity>('ALL');
  const [search, setSearch] = useState('');

  const filtered = ROLE_LIST.filter((r) => {
    const matchesTeam = teamFilter === 'ALL' || r.team === teamFilter;
    const spec = ROLE_VISUALS[r.id];
    const matchesRarity = rarityFilter === 'ALL' || spec.rarity === rarityFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.name[lang].toLowerCase().includes(q) ||
      r.shortDesc[lang].toLowerCase().includes(q) ||
      r.abilityName[lang].toLowerCase().includes(q);
    return matchesTeam && matchesRarity && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7]">{t.rolesPage.title}</h1>
          <p className="mt-1 text-sm text-[#F5F5F7]/70">{t.rolesPage.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#F5F5F7]/45 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'uz' ? 'Rol qidirish...' : 'Поиск роли...'}
              className="pl-9 pr-4 py-2 rounded-xl bg-[#111522] border border-white/10 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#E63946] min-w-[180px]"
            />
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#111522] border border-white/10">
            {(['ALL', 'MAFIA', 'TOWN', 'NEUTRAL'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTeamFilter(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  teamFilter === tf
                    ? 'bg-[#E63946] text-white'
                    : 'text-[#F5F5F7]/65 hover:text-[#F5F5F7]'
                }`}
              >
                {tf === 'ALL' ? t.rolesPage.all : t.game.teams[tf]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rarity Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as const).map((rf) => (
          <button
            key={rf}
            onClick={() => setRarityFilter(rf)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              rarityFilter === rf
                ? 'bg-white/15 border-white/30 text-[#F5F5F7]'
                : 'bg-[#090B12]/60 border-white/10 text-[#F5F5F7]/60 hover:text-[#F5F5F7]'
            }`}
          >
            {rf === 'ALL' ? t.rolesPage.all : RARITY_LABELS[rf][lang]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-sm text-[#F5F5F7]/60">
          {lang === 'uz' ? 'Mos keladigan rol topilmadi.' : 'Подходящие роли не найдены.'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => (
            <RoleCard
              key={r.id}
              roleId={r.id}
              lang={lang}
              teamLabel={t.game.teams[r.team]}
              abilityLabel={t.rolesPage.ability}
              winLabel={t.rolesPage.winCond}
              limitsLabel={t.rolesPage.limits}
              locked={Boolean(user && (user.rolePlayCounts?.[r.id] ?? 0) === 0)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { user, t, lang, token, refreshUser, logout, showToast, navigate } = useApp();
  const [username, setUsername] = useState(user?.username || '');
  const [country, setCountry] = useState(user?.country || 'UZ');
  const [activeTitle, setActiveTitle] = useState(user?.activeTitle || '');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'statistics'>('overview');
  const [history, setHistory] = useState<GameHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`/api/history?userId=${encodeURIComponent(user.id)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setHistory(Array.isArray(d.history) ? d.history : []);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, token]);

  const statsData = useMemo(() => {
    if (!user) {
      return {
        wins: 0,
        losses: 0,
        winRate: 0,
        winLossPie: [] as { name: string; value: number; color: string }[],
        roleFrequency: [] as { role: string; count: number; fill: string }[],
        trend30d: [] as { day: string; wins: number; losses: number; games: number; winRate: number }[],
        gamesLast30d: 0,
        winsLast30d: 0,
      };
    }

    const wins = user.wins ?? 0;
    const losses = Math.max(0, user.losses ?? (user.totalGames - wins));
    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    const winLossPie =
      total > 0
        ? [
            { name: lang === 'uz' ? 'G‘alaba' : 'Победы', value: wins, color: '#10B981' },
            { name: lang === 'uz' ? 'Mag‘lubiyat' : 'Поражения', value: losses, color: '#E63946' },
          ]
        : [];

    const roleCounts: Record<string, number> = { ...(user.rolePlayCounts || {}) };
    if (Object.keys(roleCounts).length === 0 && history.length > 0) {
      for (const match of history) {
        const me = match.players.find((p) => p.userId === user.id);
        if (me) roleCounts[me.roleId] = (roleCounts[me.roleId] ?? 0) + 1;
      }
    }

    const teamColors: Record<Team, string> = {
      TOWN: '#38BDF8',
      MAFIA: '#E63946',
      NEUTRAL: '#A855F7',
    };

    const roleFrequency = Object.entries(roleCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([roleId, count]) => {
        const def = ROLES[roleId as keyof typeof ROLES];
        return {
          role: def ? def.name[lang] : roleId,
          count,
          fill: def ? teamColors[def.team] : '#E7B65B',
        };
      });

    const now = new Date();
    const dayBuckets = new Map<string, { day: string; wins: number; losses: number; games: number }>();
    const orderedKeys: string[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      orderedKeys.push(key);
      dayBuckets.set(key, { day: label, wins: 0, losses: 0, games: 0 });
    }

    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let gamesLast30d = 0;
    let winsLast30d = 0;

    for (const match of history) {
      if (match.endedAt < thirtyDaysAgoMs) continue;
      const me = match.players.find((p) => p.userId === user.id);
      if (!me) continue;
      const d = new Date(match.endedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const bucket = dayBuckets.get(key);
      if (!bucket) continue;
      bucket.games += 1;
      gamesLast30d += 1;
      if (me.won) {
        bucket.wins += 1;
        winsLast30d += 1;
      } else {
        bucket.losses += 1;
      }
    }

    const trend30d = orderedKeys.map((key) => {
      const b = dayBuckets.get(key)!;
      return {
        ...b,
        winRate: b.games > 0 ? Math.round((b.wins / b.games) * 100) : 0,
      };
    });

    return {
      wins,
      losses,
      winRate,
      winLossPie,
      roleFrequency,
      trend30d,
      gamesLast30d,
      winsLast30d,
    };
  }, [user, history, lang]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[#F5F5F7]/70 mb-4">
          {lang === 'uz' ? 'Profilni ko‘rish uchun hisobga kiring.' : 'Войдите в аккаунт для просмотра профиля.'}
        </p>
        <button
          onClick={() => navigate('auth')}
          className="px-6 py-3 rounded-xl bg-[#E63946] text-sm font-bold text-white"
        >
          {t.nav.login}
        </button>
      </div>
    );
  }

  const nextLevelXp = user.level * 250;
  const currentLevelProgress = user.xp % 250;
  const pct = Math.min(100, Math.round((currentLevelProgress / 250) * 100));
  const rankName = getCompetitiveRankName(user.rating, lang);
  const titleObj = TITLES.find((ti) => ti.id === user.activeTitle);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, country, activeTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshUser();
      showToast(lang === 'uz' ? 'Profil yangilandi' : 'Профиль обновлён', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <div
        className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border"
        style={{
          borderColor:
            user.subscription.status === 'ACTIVE'
              ? 'rgba(231, 182, 91, 0.45)'
              : user.equippedCosmetics.FRAME
                ? 'rgba(230, 57, 70, 0.45)'
                : 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div>
          <p className="text-xs text-[#E7B65B] font-semibold">
            {t.dashboard.statsLevel} {user.level} · {rankName} ({user.rating} MMR) · {user.country}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h1 className="font-display text-3xl font-bold text-[#F5F5F7]">{user.username}</h1>
            {user.subscription.status === 'ACTIVE' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#E7B65B]">
                <Crown className="w-4 h-4" /> VIP ELITE
              </span>
            )}
            {titleObj && (
              <span className="text-xs font-bold" style={{ color: titleObj.color }}>
                «{titleObj.name[lang]}»
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="inline-flex items-center gap-1 text-[#E7B65B]">
              <Coins className="w-3.5 h-3.5" /> {user.gold} Gold
            </span>
            <span className="inline-flex items-center gap-1 text-[#38BDF8]">
              <Gem className="w-3.5 h-3.5" /> {user.diamonds} Diamonds
            </span>
            <span className="text-[#F5F5F7]/60">
              {lang === 'uz' ? 'Do‘stlar:' : 'Друзья:'} {user.friends.length}
            </span>
            <span className="text-[#F5F5F7]/75">
              {lang === 'uz' ? 'Kosmetika:' : 'Косметика:'} {user.ownedCosmetics.length}
            </span>
            {user.subscription.status === 'ACTIVE' && user.subscription.expiresAt && (
              <span className="text-emerald-400">
                VIP: {new Date(user.subscription.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            onClick={() => navigate('inventory')}
            className="px-4 py-2.5 rounded-xl bg-[#E7B65B]/15 border border-[#E7B65B]/35 text-xs font-semibold text-[#E7B65B] hover:bg-[#E7B65B]/25 transition-colors"
          >
            {lang === 'uz' ? 'Inventar' : 'Инвентарь'}
          </button>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-xs font-semibold text-[#F5F5F7] hover:bg-[#E63946]/20 hover:text-[#E63946] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t.nav.logout}
          </button>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#090B12] border border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#E63946] text-white'
              : 'text-[#F5F5F7]/70 hover:text-[#F5F5F7]'
          }`}
        >
          {lang === 'uz' ? 'Umumiy' : 'Обзор'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('statistics')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'statistics'
              ? 'bg-[#E63946] text-white'
              : 'text-[#F5F5F7]/70 hover:text-[#F5F5F7]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          {lang === 'uz' ? 'Statistika' : 'Статистика'}
        </button>
      </div>

      {activeTab === 'statistics' ? (
        <div className="space-y-6">
          {/* Summary KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'G‘alaba foizi' : 'Процент побед'}</p>
              <p className="font-mono text-2xl font-bold text-emerald-400 tabular-nums mt-1">
                {statsData.winRate}%
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'G‘alaba / Mag‘lubiyat' : 'Победы / Поражения'}</p>
              <p className="font-mono text-2xl font-bold text-[#F5F5F7] tabular-nums mt-1">
                <span className="text-emerald-400">{statsData.wins}</span>
                <span className="text-[#F5F5F7]/40 mx-1.5">/</span>
                <span className="text-[#E63946]">{statsData.losses}</span>
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'Joriy / Eng yaxshi seriya' : 'Текущая / Лучшая серия'}</p>
              <p className="font-mono text-2xl font-bold text-[#E7B65B] tabular-nums mt-1">
                {user.winStreak} <span className="text-sm text-[#F5F5F7]/45">/ {user.bestWinStreak}</span>
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'Oxirgi 30 kun' : 'За последние 30 дней'}</p>
              <p className="font-mono text-2xl font-bold text-[#38BDF8] tabular-nums mt-1">
                {statsData.gamesLast30d}{' '}
                <span className="text-xs font-sans font-normal text-[#F5F5F7]/60">
                  ({statsData.winsLast30d} {lang === 'uz' ? 'g‘alaba' : 'побед'})
                </span>
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Win / Loss Ratio Donut Chart */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-[#F5F5F7]">
                  {lang === 'uz' ? 'G‘alaba va mag‘lubiyat nisbati' : 'Соотношение побед и поражений'}
                </h2>
                <span className="font-mono text-xs text-[#F5F5F7]/60 tabular-nums">
                  {user.totalGames} {lang === 'uz' ? 'o‘yin' : 'игр'}
                </span>
              </div>
              {statsData.winLossPie.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-xs text-[#F5F5F7]/50">
                  {lang === 'uz' ? 'Hali o‘yinlar mavjud emas' : 'Пока нет сыгранных матчей'}
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statsData.winLossPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={92}
                        paddingAngle={4}
                        stroke="none"
                      >
                        {statsData.winLossPie.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#090B12',
                          borderColor: 'rgba(255,255,255,0.12)',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#F5F5F7',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '12px', color: '#F5F5F7' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Role Frequency Bar Chart */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-[#F5F5F7]">
                  {lang === 'uz' ? 'Rollar chastotasi' : 'Частота ролей'}
                </h2>
                <span className="text-xs text-[#F5F5F7]/60">
                  {lang === 'uz' ? 'Eng ko‘p o‘ynalgan' : 'Самые частые'}
                </span>
              </div>
              {statsData.roleFrequency.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-xs text-[#F5F5F7]/50">
                  {lang === 'uz' ? 'Rol statistikasi hali yo‘q' : 'Статистика ролей пока отсутствует'}
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statsData.roleFrequency}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: 'rgba(245,245,247,0.55)', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="role"
                        width={105}
                        tick={{ fill: '#F5F5F7', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={{
                          backgroundColor: '#090B12',
                          borderColor: 'rgba(255,255,255,0.12)',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#F5F5F7',
                        }}
                      />
                      <Bar dataKey="count" name={lang === 'uz' ? 'O‘yinlar' : 'Игры'} radius={[0, 6, 6, 0]}>
                        {statsData.roleFrequency.map((entry) => (
                          <Cell key={entry.role} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* 30-Day Performance Trend Area Chart */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#F5F5F7]">
                  {lang === 'uz' ? 'Oxirgi 30 kunlik natija dinamikasi' : 'Динамика за последние 30 дней'}
                </h2>
                <p className="text-xs text-[#F5F5F7]/60 mt-0.5">
                  {lang === 'uz'
                    ? 'Kunlik g‘alabalar va mag‘lubiyatlar statistikasi'
                    : 'Ежедневное количество побед и поражений'}
                </p>
              </div>
              {historyLoading && (
                <span className="text-xs text-[#E7B65B]">
                  {lang === 'uz' ? 'Yuklanmoqda...' : 'Загрузка...'}
                </span>
              )}
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statsData.trend30d} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="winsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="lossesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E63946" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E63946" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    minTickGap={22}
                    tick={{ fill: 'rgba(245,245,247,0.55)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'rgba(245,245,247,0.55)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090B12',
                      borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#F5F5F7',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#F5F5F7' }} />
                  <Area
                    type="monotone"
                    dataKey="wins"
                    name={lang === 'uz' ? 'G‘alabalar' : 'Победы'}
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#winsGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="losses"
                    name={lang === 'uz' ? 'Mag‘lubiyatlar' : 'Поражения'}
                    stroke="#E63946"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#lossesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* XP Bar & Edit */}
          <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#F5F5F7]/75">{t.profile.xpProgress}</span>
            <span className="font-mono font-bold text-[#E7B65B] tabular-nums">
              {user.xp} / {nextLevelXp} XP
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#090B12] overflow-hidden">
            <div className="h-full bg-[#E7B65B] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-[#090B12]">
              <p className="text-[11px] text-[#F5F5F7]/55">{t.dashboard.statsGames}</p>
              <p className="font-mono text-lg font-bold tabular-nums mt-1">{user.totalGames}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#090B12]">
              <p className="text-[11px] text-[#F5F5F7]/55">{t.dashboard.statsWins}</p>
              <p className="font-mono text-lg font-bold text-emerald-400 tabular-nums mt-1">{user.wins}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#090B12]">
              <p className="text-[11px] text-[#F5F5F7]/55">{t.profile.favoriteRole}</p>
              <p className="text-xs font-bold text-[#E7B65B] mt-2 truncate">
                {user.favoriteRole ? ROLES[user.favoriteRole]?.name[lang] : '—'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#090B12]">
              <p className="text-[11px] text-[#F5F5F7]/55">{lang === 'uz' ? 'Sevimli rejim' : 'Режим'}</p>
              <p className="text-xs font-bold text-[#A855F7] mt-2 truncate">
                {user.favoriteMode || '—'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={saveProfile} className="glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#F5F5F7]">{t.profile.title}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#F5F5F7]/70 mb-1.5">{t.auth.username}</label>
              <input
                type="text"
                minLength={3}
                maxLength={24}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-sm text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#F5F5F7]/70 mb-1.5">{lang === 'uz' ? 'Mamlakat' : 'Страна'}</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-sm text-[#F5F5F7]"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name[lang]} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#F5F5F7]/70 mb-1.5">{lang === 'uz' ? 'Faol unvon' : 'Активный титул'}</label>
            <select
              value={activeTitle}
              onChange={(e) => setActiveTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-sm text-[#F5F5F7]"
            >
              <option value="">{lang === 'uz' ? 'Unvonsiz' : 'Без титула'}</option>
              {user.unlockedTitles.map((tid) => {
                const td = TITLES.find((x) => x.id === tid);
                return (
                  <option key={tid} value={tid}>
                    {td ? td.name[lang] : tid}
                  </option>
                );
              })}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#E63946] text-xs font-bold text-white hover:bg-[#E63946]/90"
          >
            {saving ? '...' : lang === 'uz' ? 'Saqlash' : 'Сохранить'}
          </button>
        </form>
      </div>

      {/* Achievements (42) */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-[#F5F5F7] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#E7B65B]" />
            {t.profile.achievements}
          </h2>
          <span className="font-mono text-xs text-[#E7B65B]">
            {user.achievements.length}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = user.achievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border ${
                  unlocked
                    ? 'bg-[#E7B65B]/10 border-[#E7B65B]/35'
                    : 'bg-[#090B12]/60 border-white/5 opacity-55'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#F5F5F7]">{ach.name[lang]}</span>
                  <span className="font-mono text-[11px] text-[#E7B65B]">
                    +{ach.xpReward} XP · +{ach.goldReward} G
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[#F5F5F7]/70">{ach.description[lang]}</p>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export const LeaderboardPage: React.FC = () => {
  const { t, lang, token, user } = useApp();
  const [list, setList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'global' | 'weekly' | 'monthly'>('global');
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [country, setCountry] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period, country });
    if (friendsOnly) params.set('friends', 'true');
    if (search.trim()) params.set('search', search.trim());

    fetch(`/api/leaderboard?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => r.json())
      .then((d) => setList(d.leaderboard || []))
      .finally(() => setLoading(false));
  }, [period, country, friendsOnly, search, token]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-[#F5F5F7] flex items-center gap-3">
          <Trophy className="w-7 h-7 text-[#E7B65B]" />
          {t.leaderboard.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#F5F5F7]/45 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'uz' ? 'O‘yinchi qidirish...' : 'Поиск игрока...'}
              className="pl-9 pr-3 py-2 rounded-xl bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
            />
          </div>

          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
          >
            <option value="ALL">{lang === 'uz' ? 'Barcha davlatlar' : 'Все страны'}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name[lang]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['global', 'weekly', 'monthly'] as const).map((p) => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p);
              setFriendsOnly(false);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              !friendsOnly && period === p
                ? 'bg-[#E63946] border-[#E63946] text-white'
                : 'bg-[#111522] border-white/10 text-[#F5F5F7]/70'
            }`}
          >
            {p === 'global'
              ? 'TOP 100'
              : p === 'weekly'
                ? lang === 'uz'
                  ? 'Haftalik'
                  : 'Неделя'
                : lang === 'uz'
                  ? 'Oylik'
                  : 'Месяц'}
          </button>
        ))}
        {user && (
          <button
            onClick={() => setFriendsOnly(!friendsOnly)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              friendsOnly
                ? 'bg-[#E7B65B] border-[#E7B65B] text-[#090B12]'
                : 'bg-[#111522] border-white/10 text-[#F5F5F7]/70'
            }`}
          >
            {lang === 'uz' ? 'Do‘stlar' : 'Друзья'}
          </button>
        )}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-[#F5F5F7]/50">...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs text-[#F5F5F7]/60">
                <tr>
                  <th className="py-3.5 px-5">{t.leaderboard.rank}</th>
                  <th className="py-3.5 px-5">{t.leaderboard.player}</th>
                  <th className="py-3.5 px-5">MMR</th>
                  <th className="py-3.5 px-5">{t.leaderboard.level}</th>
                  <th className="py-3.5 px-5">{t.leaderboard.wins}</th>
                  <th className="py-3.5 px-5">{t.leaderboard.winRate}</th>
                  <th className="py-3.5 px-5">TP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {list.map((u, i) => {
                  const wr = u.totalGames > 0 ? Math.round((u.wins / u.totalGames) * 100) : 0;
                  return (
                    <tr key={u.id} className="hover:bg-white/5">
                      <td className="py-3.5 px-5 font-mono font-bold text-[#E7B65B] tabular-nums">
                        #{i + 1}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-[#F5F5F7]">
                        {u.username}{' '}
                        <span className="text-[11px] text-[#F5F5F7]/45 ml-1">{u.country}</span>
                      </td>
                      <td className="py-3.5 px-5 font-mono tabular-nums text-[#E7B65B]">{u.rating}</td>
                      <td className="py-3.5 px-5 font-mono tabular-nums">{u.level}</td>
                      <td className="py-3.5 px-5 font-mono tabular-nums text-emerald-400">{u.wins}</td>
                      <td className="py-3.5 px-5 font-mono tabular-nums">{wr}%</td>
                      <td className="py-3.5 px-5 font-mono tabular-nums text-[#A855F7]">{u.tournamentPoints}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const HistoryPage: React.FC = () => {
  const { t, lang } = useApp();
  const [items, setItems] = useState<GameHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => setItems(d.history || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#F5F5F7]">{t.history.title}</h1>
      {loading ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-sm text-[#F5F5F7]/50">...</div>
      ) : items.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-sm text-[#F5F5F7]/60">
          {t.history.noHistory}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((h) => (
            <div key={h.id} className="glass-panel rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-xs text-[#E7B65B]">{h.roomCode}</span>
                  <span className="mx-2 text-[#F5F5F7]/30">·</span>
                  <span className="text-sm font-bold text-[#F5F5F7]">{h.mode}</span>
                </div>
                <div className="text-xs text-[#F5F5F7]/65 tabular-nums">
                  {t.history.winner}: <strong className="text-emerald-400">{h.winner}</strong> · {h.rounds}{' '}
                  {t.history.rounds} · {h.durationSec}s
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#F5F5F7]/70">
                {h.players.map((p, idx) => (
                  <span key={idx} className={p.won ? 'text-emerald-400' : ''}>
                    {p.username} ({ROLES[p.roleId]?.name[lang]})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const {
    t,
    lang,
    setLang,
    soundEnabled,
    setSoundEnabled,
    uiVolume,
    setUiVolume,
    ambientVolume,
    setAmbientVolume,
    rainEnabled,
    setRainEnabled,
  } = useApp();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#F5F5F7]">{t.settings.title}</h1>

      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-[#F5F5F7]">{t.settings.language}</span>
          <div className="inline-flex rounded-xl bg-[#090B12] p-1 border border-white/10">
            <button
              onClick={() => setLang('uz')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${
                lang === 'uz' ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65'
              }`}
            >
              O‘zbekcha
            </button>
            <button
              onClick={() => setLang('ru')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${
                lang === 'ru' ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65'
              }`}
            >
              Русский
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
          <span className="text-sm font-medium text-[#F5F5F7]">{t.settings.soundEffects}</span>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border ${
              soundEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-[#F5F5F7]/60'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {soundEnabled && (
          <div className="space-y-4 pt-3 border-t border-white/10">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#F5F5F7]/75">
                  {lang === 'uz' ? 'Interfeys ovozlari' : 'Громкость интерфейса'}
                </span>
                <span className="font-mono text-[#E7B65B] tabular-nums">
                  {Math.round(uiVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(uiVolume * 100)}
                onChange={(e) => setUiVolume(Number(e.target.value) / 100)}
                className="w-full accent-[#E63946]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#F5F5F7]/75">
                  {lang === 'uz' ? 'Atmosfera ovozlari (Tun/Tong)' : 'Атмосферный звук (Ночь/Утро)'}
                </span>
                <span className="font-mono text-[#A855F7] tabular-nums">
                  {Math.round(ambientVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(ambientVolume * 100)}
                onChange={(e) => setAmbientVolume(Number(e.target.value) / 100)}
                className="w-full accent-[#A855F7]"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
          <span className="text-sm font-medium text-[#F5F5F7]">
            {lang === 'uz' ? 'Tungi yomg‘ir effekti' : 'Ночной дождь'}
          </span>
          <button
            onClick={() => setRainEnabled(!rainEnabled)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
              rainEnabled
                ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/50 text-[#A5B4FC]'
                : 'bg-white/5 border-white/10 text-[#F5F5F7]/60'
            }`}
          >
            {rainEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
          <span className="text-sm font-medium text-[#F5F5F7]">{t.settings.pwaInstall}</span>
          <PWAInstallButton />
        </div>
      </div>
    </div>
  );
};

export const AdminPage: React.FC = () => <AdminControlCenter />;
