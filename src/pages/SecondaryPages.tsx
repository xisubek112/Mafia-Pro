import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Ban,
  BarChart3,
  CheckCircle,
  Clock,
  Coins,
  Copy,
  Crown,
  ExternalLink,
  FastForward,
  Flag,
  Gem,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  Search,
  Share2,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
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
import { GameHistoryRecord, ReplayRecord, Team, UserProfile } from '../shared/types';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'statistics' | 'referrals'>('overview');
  const [history, setHistory] = useState<GameHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Referral states
  const [referralInfo, setReferralInfo] = useState<{
    referralCode: string;
    referralLink: string;
    successfulCount: number;
    claimedMilestones: number[];
  } | null>(null);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/referrals', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.referralCode) setReferralInfo(d);
      })
      .catch(() => {});
  }, [token, user?.successfulReferralsCount, user?.claimedReferralMilestones?.length]);

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !friendCodeInput.trim()) return;
    setApplyingCode(true);
    try {
      const res = await fetch('/api/referrals/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: friendCodeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(
        lang === 'uz'
          ? `${data.referrerName || ''} kodi qo‘llandi! +150 Gold +100 XP`
          : `Код ${data.referrerName || ''} активирован! +150 Золота +100 XP`,
        'success'
      );
      setFriendCodeInput('');
      await refreshUser();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setApplyingCode(false);
    }
  };

  const handleClaimMilestone = async (count: number) => {
    if (!token) return;
    setClaimingMilestone(count);
    try {
      const res = await fetch('/api/referrals/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ level: count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(
        data.reward || (lang === 'uz' ? 'Mukofot hisobingizga qo‘shildi!' : 'Награда зачислена!'),
        'success'
      );
      await refreshUser();
      if (token) {
        const refRes = await fetch('/api/referrals', { headers: { Authorization: `Bearer ${token}` } });
        const refData = await refRes.json();
        if (refData.referralCode) setReferralInfo(refData);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setClaimingMilestone(null);
    }
  };

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
            <h1 className="font-display text-3xl font-bold text-[#F5F5F7] flex items-center gap-2">
              {user.clanTag && (
                <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-[#E63946]/30 to-[#E7B65B]/30 border border-[#E7B65B]/50 font-mono text-xs font-black text-[#E7B65B]">
                  [{user.clanTag}]
                </span>
              )}
              {user.username}
            </h1>
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
        <button
          type="button"
          onClick={() => setActiveTab('referrals')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'referrals'
              ? 'bg-[#E7B65B] text-[#090B12] shadow-sm font-bold'
              : 'text-[#F5F5F7]/70 hover:text-[#F5F5F7]'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          {lang === 'uz' ? 'Referral Dasturi' : 'Рефералы'}
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
      ) : activeTab === 'overview' ? (
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
      ) : (
        <div className="space-y-6">
          {/* Referral Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-[#E7B65B]/30 bg-gradient-to-r from-[#170E10] via-[#101426] to-[#0D1B2A]">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#E7B65B]/20 text-[#E7B65B] border border-[#E7B65B]/40 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {lang === 'uz' ? 'MAFIA PRO Hamkorlik Dasturi' : 'Партнёрская программа'}
                </span>
                <h2 className="text-3xl font-extrabold text-[#F5F5F7]">
                  {lang === 'uz' ? 'Do‘stlaringizni taklif qiling' : 'Приглашайте друзей'}
                </h2>
                <p className="text-xs sm:text-sm text-[#F5F5F7]/70 max-w-xl">
                  {lang === 'uz'
                    ? 'Har bir taklif qilingan do‘stingiz o‘yinni boshlaganda bonus Gold va Olmoslar oling. Do‘stingiz ham boshlang‘ich 250 Gold bonusiga ega bo‘ladi!'
                    : 'Получайте бонусное Золото и Алмазы за каждого приглашённого друга. Друг также получит стартовые 250 Золота!'}
                </p>
              </div>

              {/* Referral Stats Counter */}
              <div className="bg-[#090B12]/80 backdrop-blur-md rounded-2xl p-5 border border-white/10 min-w-[240px] text-center space-y-1">
                <p className="text-xs text-[#F5F5F7]/60 font-semibold">
                  {lang === 'uz' ? 'Taklif qilingan do‘stlar' : 'Приглашено друзей'}
                </p>
                <p className="font-mono text-3xl font-black text-[#E7B65B]">
                  {user.successfulReferralsCount || 0}
                </p>
                <p className="text-[11px] text-emerald-400 font-medium">
                  {lang === 'uz' ? 'Barcha bosqichlar faol' : 'Все этапы активны'}
                </p>
              </div>
            </div>
          </div>

          {/* Referral Code & Share Link Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-[#F5F5F7] flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#E7B65B]" />
                {lang === 'uz' ? 'Sizning maxsus kodingiz' : 'Ваш реферальный код'}
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3.5 rounded-xl bg-[#090B12] border border-white/10 font-mono text-base font-bold text-[#E7B65B] tracking-wider text-center select-all">
                  {referralInfo?.referralCode || user.referralCode || '...'}
                </div>
                <button
                  onClick={() => {
                    const code = referralInfo?.referralCode || user.referralCode;
                    if (code) {
                      navigator.clipboard.writeText(code);
                      showToast(lang === 'uz' ? 'Kod nusxalandi!' : 'Код скопирован!', 'success');
                    }
                  }}
                  className="p-3.5 rounded-xl bg-[#E7B65B] text-[#090B12] hover:bg-[#E7B65B]/90 transition-colors font-bold text-xs flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  {lang === 'uz' ? 'Nusxalash' : 'Копировать'}
                </button>
              </div>
              <p className="text-[11px] text-[#F5F5F7]/50">
                {lang === 'uz'
                  ? 'Do‘stingiz ushbu kodni o‘z profilida kiritishi kifoya.'
                  : 'Другу достаточно указать этот код в своём профиле.'}
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-[#F5F5F7] flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#38BDF8]" />
                {lang === 'uz' ? 'Do‘st kodi bilan bonus olish' : 'Ввести код друга'}
              </h3>
              {user.referredBy ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300">
                  {lang === 'uz'
                    ? 'Siz allaqachon do‘st kodi bilan 250 Gold bonusini olgansiz!'
                    : 'Вы уже получили стартовый бонус 250 Золота по коду друга!'}
                </div>
              ) : (
                <form onSubmit={handleApplyReferral} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={friendCodeInput}
                    onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                    placeholder={lang === 'uz' ? 'Masalan: MAFIA-77' : 'Например: MAFIA-77'}
                    className="flex-1 px-3.5 py-3 rounded-xl bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7] uppercase font-mono tracking-wider focus:outline-none focus:border-[#E63946]"
                  />
                  <button
                    type="submit"
                    disabled={applyingCode || !friendCodeInput.trim()}
                    className="px-4 py-3 rounded-xl bg-[#E63946] hover:bg-[#E63946]/90 disabled:opacity-40 text-xs font-bold text-white transition-colors"
                  >
                    {applyingCode ? '...' : lang === 'uz' ? 'Qo‘llash (+250 G)' : 'Применить (+250)'}
                  </button>
                </form>
              )}
              <p className="text-[11px] text-[#F5F5F7]/50">
                {lang === 'uz'
                  ? 'Har bir hisob faqat bir marta boshqa o‘yinchi kodini faollashtirishi mumkin.'
                  : 'Каждый аккаунт может активировать чужой код только один раз.'}
              </p>
            </div>
          </div>

          {/* Milestone Rewards Grid */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-[#F5F5F7] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#E7B65B]" />
              {lang === 'uz' ? 'Do‘stlar soni bo‘yicha mukofotlar' : 'Награды за число друзей'}
            </h3>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { count: 1, label: { uz: '1 ta Do‘st', ru: '1 Друг' }, gold: 250, diamonds: 2 },
                { count: 3, label: { uz: '3 ta Do‘st', ru: '3 Друга' }, gold: 600, diamonds: 10, frameName: { uz: 'Qonli Chegara Ramkasi', ru: 'Рамка Алая граница' } },
                { count: 5, label: { uz: '5 ta Do‘st', ru: '5 Друзей' }, gold: 1500, diamonds: 25, vipDays: 7 },
              ].map((m) => {
                const totalRef = referralInfo?.successfulCount ?? user.successfulReferralsCount ?? 0;
                const isReached = totalRef >= m.count;
                const claimedList = referralInfo?.claimedMilestones || user.claimedReferralMilestones || [];
                const claimed = claimedList.includes(m.count);

                return (
                  <div
                    key={m.count}
                    className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                      claimed
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : isReached
                          ? 'bg-[#E7B65B]/10 border-[#E7B65B]/40'
                          : 'bg-[#090B12] border-white/5 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display text-sm font-bold text-[#F5F5F7]">
                          {m.label[lang]}
                        </span>
                        <span className="font-mono text-xs text-[#F5F5F7]/60">
                          {Math.min(totalRef, m.count)} / {m.count}
                        </span>
                      </div>
                      <div className="space-y-1 mb-4 text-xs font-mono">
                        <p className="text-[#E7B65B]">+{m.gold} Gold</p>
                        {m.vipDays && <p className="text-amber-300">+{m.vipDays} {lang === 'uz' ? 'kun VIP Obuna' : 'дн. VIP'}</p>}
                        {m.diamonds && <p className="text-[#38BDF8]">+{m.diamonds} Diamonds</p>}
                        {m.frameName && (
                          <p className="text-[#A855F7] font-sans font-semibold">
                            {m.frameName[lang]}
                          </p>
                        )}
                      </div>
                    </div>

                    {claimed ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        {lang === 'uz' ? 'Mukofot olingan' : 'Получено'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleClaimMilestone(m.count)}
                        disabled={!isReached || claimingMilestone === m.count}
                        className="w-full py-2.5 rounded-xl bg-[#E7B65B] hover:bg-[#E7B65B]/90 disabled:opacity-30 text-xs font-black text-[#090B12] transition-colors"
                      >
                        {claimingMilestone === m.count
                          ? '...'
                          : isReached
                            ? lang === 'uz'
                              ? 'Mukofotni olish'
                              : 'Забрать награду'
                            : lang === 'uz'
                              ? 'Qulfda'
                              : 'Заблокировано'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LeaderboardPage: React.FC = () => {
  const { t, lang, token, user } = useApp();
  const [list, setList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'global' | 'weekly' | 'monthly'>('global');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'CLASSIC' | 'ADVANCED' | 'CHAOS'>('ALL');
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [country, setCountry] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    if (modeFilter !== 'ALL') {
      fetch(`/api/rankings/mode?mode=${modeFilter}&period=${period.toUpperCase()}`)
        .then((r) => r.json())
        .then((d) => setList(d.leaderboard || []))
        .catch(() => setList([]))
        .finally(() => setLoading(false));
    } else {
      const params = new URLSearchParams({ period, country });
      if (friendsOnly) params.set('friends', 'true');
      if (search.trim()) params.set('search', search.trim());

      fetch(`/api/leaderboard?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
        .then((r) => r.json())
        .then((d) => setList(d.leaderboard || []))
        .catch(() => setList([]))
        .finally(() => setLoading(false));
    }
  }, [period, modeFilter, country, friendsOnly, search, token]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7] flex items-center gap-3">
            <Trophy className="w-7 h-7 text-[#E7B65B]" />
            {t.leaderboard.title}
          </h1>
          <p className="text-xs text-[#F5F5F7]/60 mt-1">
            {lang === 'uz'
              ? 'Elo reyting tizimi va rejimlar bo‘yicha peshqadamlar'
              : 'Таблица лидеров по рейтингу Elo и игровым режимам'}
          </p>
        </div>

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
            disabled={modeFilter !== 'ALL'}
            className="px-3 py-2 rounded-xl bg-[#111522] border border-white/10 text-xs text-[#F5F5F7] disabled:opacity-40"
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

      {/* Mode Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'ALL', uz: 'Umumiy MMR', ru: 'Общий MMR' },
            { id: 'CLASSIC', uz: 'Klassik Rejim', ru: 'Классический' },
            { id: 'ADVANCED', uz: 'Kengaytirilgan', ru: 'Продвинутый' },
            { id: 'CHAOS', uz: 'Xaos Rejim', ru: 'Хаос' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            onClick={() => setModeFilter(m.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              modeFilter === m.id
                ? 'bg-[#E7B65B] border-[#E7B65B] text-[#090B12]'
                : 'bg-[#111522] border-white/10 text-[#F5F5F7]/70 hover:text-white'
            }`}
          >
            {m[lang]}
          </button>
        ))}
      </div>

      {/* Period & Friends Filter */}
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
        {user && modeFilter === 'ALL' && (
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
                  <th className="py-3.5 px-5">
                    {modeFilter === 'ALL' ? 'MMR' : `${modeFilter} ELO`}
                  </th>
                  <th className="py-3.5 px-5">{t.leaderboard.level}</th>
                  <th className="py-3.5 px-5">{t.leaderboard.wins}</th>
                  <th className="py-3.5 px-5">{t.leaderboard.winRate}</th>
                  <th className="py-3.5 px-5">TP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {list.map((u, i) => {
                  const wr = u.totalGames > 0 ? Math.round((u.wins / u.totalGames) * 100) : 0;
                  const displayRating =
                    modeFilter !== 'ALL' && u.modeRatings?.[modeFilter]
                      ? u.modeRatings[modeFilter]
                      : u.rating;
                  return (
                    <tr key={u.id} className="hover:bg-white/5">
                      <td className="py-3.5 px-5 font-mono font-bold text-[#E7B65B] tabular-nums">
                        #{i + 1}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-[#F5F5F7] flex items-center gap-1.5">
                        {u.clanTag && (
                          <span className="text-[10px] font-mono font-bold text-[#E7B65B]">
                            [{u.clanTag}]
                          </span>
                        )}
                        <span>{u.username}</span>
                        <span className="text-[11px] text-[#F5F5F7]/45 ml-1">{u.country}</span>
                      </td>
                      <td className="py-3.5 px-5 font-mono tabular-nums text-[#E7B65B]">
                        {displayRating}
                      </td>
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
  const { t, lang, showToast } = useApp();
  const [items, setItems] = useState<GameHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Replay modal state
  const [selectedReplay, setSelectedReplay] = useState<ReplayRecord | null>(null);
  const [loadingReplay, setLoadingReplay] = useState(false);
  const [currentEventIdx, setCurrentEventIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2 | 4>(1);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => setItems(d.history || []))
      .finally(() => setLoading(false));
  }, []);

  const openReplay = async (roomCode: string) => {
    setLoadingReplay(true);
    setIsPlaying(false);
    setCurrentEventIdx(0);
    try {
      const res = await fetch(`/api/replays/${roomCode}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedReplay(data.replay);
    } catch (err: unknown) {
      showToast(
        err instanceof Error
          ? err.message
          : lang === 'uz'
            ? 'Replay topilmadi'
            : 'Повтор не найден',
        'error'
      );
    } finally {
      setLoadingReplay(false);
    }
  };

  // Replay auto-play ticker
  useEffect(() => {
    if (!isPlaying || !selectedReplay) return;
    const intervalMs = 2000 / playSpeed;
    const interval = setInterval(() => {
      setCurrentEventIdx((prev) => {
        if (prev >= selectedReplay.events.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, selectedReplay]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7]">{t.history.title}</h1>
          <p className="text-xs text-[#F5F5F7]/60 mt-1">
            {lang === 'uz'
              ? 'Tugallangan o‘yinlar va takror ko‘rish (Replay) arxivi'
              : 'Архив завершённых матчей и интерактивный просмотр повторов (Replay)'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-sm text-[#F5F5F7]/50">...</div>
      ) : items.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-sm text-[#F5F5F7]/60">
          {t.history.noHistory}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((h) => (
            <div key={h.id} className="glass-panel rounded-2xl p-5 hover:border-white/20 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-white/10 font-bold text-[#E7B65B]">
                    #{h.roomCode}
                  </span>
                  <span className="text-sm font-bold text-[#F5F5F7]">{h.mode}</span>
                  <span className="text-xs text-[#F5F5F7]/60">
                    {new Date(h.endedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-[#F5F5F7]/65 tabular-nums">
                    {t.history.winner}: <strong className="text-emerald-400">{h.winner}</strong> · {h.rounds}{' '}
                    {t.history.rounds} · {h.durationSec}s
                  </div>
                  <button
                    onClick={() => openReplay(h.roomCode)}
                    disabled={loadingReplay}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E63946]/20 border border-[#E63946]/40 hover:bg-[#E63946] text-[#F5F5F7] text-xs font-bold transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-[#E63946] group-hover:text-white" />
                    {lang === 'uz' ? 'Replay' : 'Повтор'}
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#F5F5F7]/70">
                {h.players.map((p, idx) => (
                  <span key={idx} className={p.won ? 'text-emerald-400 font-semibold' : ''}>
                    {p.username} ({ROLES[p.roleId]?.name[lang] || p.roleId})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MATCH REPLAY MODAL */}
      {selectedReplay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-white/15 max-h-[90vh] flex flex-col space-y-5">
            {/* Replay Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-black uppercase text-[#E7B65B] tracking-wider">
                  {lang === 'uz' ? 'Rasmiy O‘yin Takrori' : 'Официальный Replay матча'}
                </span>
                <h2 className="text-2xl font-black text-[#F5F5F7] flex items-center gap-2 mt-0.5">
                  <Play className="w-5 h-5 text-[#E63946]" />
                  #{selectedReplay.roomCode} · {selectedReplay.mode}
                </h2>
                <p className="text-xs text-[#F5F5F7]/60">
                  {lang === 'uz' ? 'G‘olib' : 'Победитель'}:{' '}
                  <span className="font-bold text-emerald-400">{selectedReplay.winner}</span> · {selectedReplay.rounds} {lang === 'uz' ? 'raund' : 'раундов'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedReplay(null);
                  setIsPlaying(false);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#F5F5F7] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Revealed Player Roster */}
            <div className="p-3.5 rounded-2xl bg-[#090B12] border border-white/10">
              <p className="text-[11px] font-bold text-[#F5F5F7]/60 mb-2">
                {lang === 'uz' ? 'O‘yinchilar va ularning rollari (Sir ochilgan):' : 'Игроки и их роли:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedReplay.players.map((p) => {
                  const roleDef = ROLES[p.roleId as keyof typeof ROLES];
                  const isMafia = roleDef?.team === 'MAFIA';
                  return (
                    <span
                      key={p.userId}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                        p.won
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : isMafia
                            ? 'bg-red-500/15 border-red-500/40 text-red-300'
                            : 'bg-white/5 border-white/10 text-white/80'
                      }`}
                    >
                      {p.username} <span className="opacity-70 font-mono text-[10px]">({roleDef ? roleDef.name[lang] : p.roleId})</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Event Timeline Viewer */}
            <div className="flex-1 overflow-y-auto min-h-[160px] p-4 rounded-2xl bg-[#090B12]/80 border border-white/5 space-y-3">
              {selectedReplay.events.length === 0 ? (
                <p className="text-center text-xs text-[#F5F5F7]/50 py-8">
                  {lang === 'uz' ? 'Hodisalar topilmadi' : 'События отсутствуют'}
                </p>
              ) : (
                (() => {
                  const currentEvent = selectedReplay.events[currentEventIdx];
                  if (!currentEvent) return null;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-[#F5F5F7]/70">
                        <span className="px-2.5 py-1 rounded-lg bg-[#E63946]/20 text-[#E63946] font-mono">
                          {currentEvent.phase} · {lang === 'uz' ? 'Raund' : 'Раунд'} {currentEvent.round}
                        </span>
                        <span className="font-mono text-white/50">
                          {currentEventIdx + 1} / {selectedReplay.events.length}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                        <p className="text-sm font-bold text-[#F5F5F7]">{currentEvent.text || currentEvent.type}</p>
                        {currentEvent.actorName && (
                          <p className="text-xs text-[#F5F5F7]/70">
                            {lang === 'uz' ? 'Ijrochi' : 'Игрок'}: <strong>{currentEvent.actorName}</strong>
                          </p>
                        )}
                        {currentEvent.targetName && (
                          <p className="text-xs text-[#E7B65B]">
                            {lang === 'uz' ? 'Nishon' : 'Цель'}: <strong>{currentEvent.targetName}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Playback Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 rounded-xl bg-[#E63946] text-white hover:bg-[#E63946]/90 transition-all font-bold text-xs flex items-center gap-1.5"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? (lang === 'uz' ? 'Pauza' : 'Пауза') : (lang === 'uz' ? 'Ijro' : 'Пуск')}
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentEventIdx(0);
                  }}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-[#F5F5F7] transition-all"
                  title="Boshiga qaytish"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="inline-flex items-center rounded-xl bg-[#090B12] p-1 border border-white/10">
                  {([1, 2, 4] as const).map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaySpeed(spd)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                        playSpeed === spd ? 'bg-[#E7B65B] text-[#090B12]' : 'text-white/60'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrubber Range */}
              <div className="flex-1 min-w-[200px] flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, selectedReplay.events.length - 1)}
                  value={currentEventIdx}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentEventIdx(Number(e.target.value));
                  }}
                  className="w-full accent-[#E63946]"
                />
              </div>
            </div>
          </div>
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
