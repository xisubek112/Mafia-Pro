import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  Coins,
  Crown,
  Flame,
  Gem,
  Gift,
  Lock,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { DAILY_REWARD_CALENDAR, getUtcDayKey, getUtcWeekKey, MISSIONS } from '../shared/ecosystem';
import { SeasonRecord, UserSeasonProgress } from '../shared/types';

export const RewardsPage: React.FC = () => {
  const { user, token, lang, refreshUser, showToast, navigate } = useApp();
  const [activeTab, setActiveTab] = useState<'battlepass' | 'daily' | 'missions'>('battlepass');

  // Daily & Mission state
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [claimingMission, setClaimingMission] = useState<string | null>(null);
  const [lastRewardBanner, setLastRewardBanner] = useState<string | null>(null);

  // Battle Pass state
  const [season, setSeason] = useState<SeasonRecord | null>(null);
  const [seasonProgress, setSeasonProgress] = useState<UserSeasonProgress | null>(null);
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [claimingReward, setClaimingReward] = useState<string | null>(null);

  const fetchSeasonData = async () => {
    try {
      setLoadingSeason(true);
      const res = await fetch('/api/seasons/active');
      const data = await res.json();
      if (data.season) setSeason(data.season);

      if (token) {
        const progRes = await fetch('/api/seasons/progress', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const progData = await progRes.json();
        if (progData.progress) setSeasonProgress(progData.progress);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSeason(false);
    }
  };

  useEffect(() => {
    fetchSeasonData();
  }, [token]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[#F5F5F7]/70 mb-4">
          {lang === 'uz'
            ? 'Kunlik mukofotlar va Battle Pass uchun hisobga kiring.'
            : 'Войдите в аккаунт для получения наград и Battle Pass.'}
        </p>
        <button
          onClick={() => navigate('auth')}
          className="px-6 py-3 rounded-xl bg-[#E63946] text-sm font-bold text-white shadow-lg shadow-[#E63946]/30"
        >
          {lang === 'uz' ? 'Kirish' : 'Войти'}
        </button>
      </div>
    );
  }

  const todayKey = getUtcDayKey();
  const weekKey = getUtcWeekKey();
  const claimedToday = Boolean(user.dailyReward.lastClaimAt && getUtcDayKey(user.dailyReward.lastClaimAt) === todayKey);

  const handleClaimDaily = async () => {
    if (!token) return;
    setClaimingDaily(true);
    try {
      const res = await fetch('/api/rewards/daily/claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshUser();
      setLastRewardBanner(
        `+${data.reward.gold} Gold${data.reward.diamonds ? ` +${data.reward.diamonds} Diamonds` : ''} +${data.reward.xp} XP`
      );
      showToast(lang === 'uz' ? 'Kunlik mukofot olindi!' : 'Ежедневная награда получена!', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setClaimingDaily(false);
    }
  };

  const handleClaimMission = async (missionId: string) => {
    if (!token) return;
    setClaimingMission(missionId);
    try {
      const res = await fetch(`/api/missions/${missionId}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshUser();
      showToast(lang === 'uz' ? 'Vazifa mukofoti olindi!' : 'Награда за миссию получена!', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setClaimingMission(null);
    }
  };

  const handleClaimBattlePass = async (level: number, track: 'FREE' | 'VIP') => {
    if (!token) return;
    const claimKey = `${level}-${track}`;
    setClaimingReward(claimKey);
    try {
      const res = await fetch('/api/seasons/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ level, track }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.progress) setSeasonProgress(data.progress);
      await refreshUser();
      showToast(
        lang === 'uz'
          ? `${level}-daraja mukofoti muvaffaqiyatli olindi!`
          : `Награда за ${level} уровень успешно получена!`,
        'success'
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setClaimingReward(null);
    }
  };

  const isVip = user.subscription?.status === 'ACTIVE' || user.role === 'ADMIN';
  const currentLevel = seasonProgress?.currentLevel || 1;
  const currentXp = seasonProgress?.currentXp || 0;
  const xpNeeded = currentLevel * (season?.totalXpPerLevel || 350);
  const progressPct = Math.min(100, Math.round((currentXp / xpNeeded) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
      {/* Header and Tab Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7] flex items-center gap-3">
            <Gift className="w-7 h-7 text-[#E7B65B]" />
            {lang === 'uz' ? 'Mukofotlar & Battle Pass' : 'Награды и Battle Pass'}
          </h1>
          <p className="mt-1 text-sm text-[#F5F5F7]/65">
            {lang === 'uz'
              ? `Joriy kunlik seriya: ${user.dailyReward.streak} kun • Mavsum darajasi: ${currentLevel}`
              : `Текущая серия: ${user.dailyReward.streak} дн. • Уровень сезона: ${currentLevel}`}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 p-1 bg-[#101426] border border-white/10 rounded-2xl">
          <button
            onClick={() => setActiveTab('battlepass')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'battlepass'
                ? 'bg-[#E7B65B] text-[#090B12] shadow-md shadow-[#E7B65B]/30'
                : 'text-[#F5F5F7]/70 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            {lang === 'uz' ? 'Battle Pass' : 'Боевой пропуск'}
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'daily'
                ? 'bg-[#E63946] text-white shadow-md shadow-[#E63946]/30'
                : 'text-[#F5F5F7]/70 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {lang === 'uz' ? 'Kunlik Taqvimi' : 'Ежедневные'}
          </button>
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'missions'
                ? 'bg-[#E63946] text-white shadow-md shadow-[#E63946]/30'
                : 'text-[#F5F5F7]/70 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            {lang === 'uz' ? 'Vazifalar' : 'Миссии'}
          </button>
        </div>
      </div>

      {lastRewardBanner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel-elevated rounded-2xl p-4 border border-emerald-500/40 text-center text-sm font-bold text-emerald-300"
        >
          {lastRewardBanner}
        </motion.div>
      )}

      {/* BATTLE PASS TAB */}
      {activeTab === 'battlepass' && (
        <div className="space-y-6">
          {/* Season Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-[#E7B65B]/30 bg-gradient-to-r from-[#170B14] via-[#101426] to-[#0A1026] shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#E7B65B]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#E7B65B]/20 text-[#E7B65B] border border-[#E7B65B]/40">
                    {lang === 'uz' ? '1-Mavsum Faol' : 'Сезон 1 Активен'}
                  </span>
                  {isVip && (
                    <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Crown className="w-3 h-3" /> VIP PASS UNLOCKED
                    </span>
                  )}
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F5F5F7]">
                  {season ? season.title[lang] : lang === 'uz' ? 'Qonli Tutilish' : 'Кровавое Затмение'}
                </h2>
                <p className="text-xs sm:text-sm text-[#F5F5F7]/70 max-w-xl">
                  {season
                    ? season.description[lang]
                    : lang === 'uz'
                      ? '30 ta elita darajalar, bepul va VIP mukofotlar: Oltin, Olmoslar, Eksklyuziv ramkalar va unvonlar!'
                      : '30 элитных уровней, бесплатные и VIP награды: Золото, Алмазы, Эксклюзивные рамки и титулы!'}
                </p>
              </div>

              {/* Progress Summary Card */}
              <div className="bg-[#090B12]/80 backdrop-blur-md rounded-2xl p-5 border border-white/10 min-w-[280px] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#F5F5F7]/70 font-semibold">{lang === 'uz' ? 'Daraja' : 'Уровень'}</span>
                  <span className="font-mono text-xl font-black text-[#E7B65B]">{currentLevel} / 30</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-[#F5F5F7]/60">
                    <span>
                      {currentXp} / {xpNeeded} XP
                    </span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#E63946] to-[#E7B65B] transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
                {!isVip && (
                  <button
                    onClick={() => navigate('store')}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-[#E7B65B] text-[#090B12] text-xs font-black flex items-center justify-center gap-1.5 hover:brightness-110 transition-all shadow-md"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    {lang === 'uz' ? 'VIP Pass Faollashtirish' : 'Активировать VIP Pass'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Battle Pass Track Horizontal Scroller */}
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-[#F5F5F7] flex items-center gap-2">
                  <Swords className="w-5 h-5 text-[#E63946]" />
                  {lang === 'uz' ? '30 Darajali Mukofot Yo‘lakchasi' : '30-уровневая дорожка наград'}
                </h3>
                <p className="text-xs text-[#F5F5F7]/60">
                  {lang === 'uz'
                    ? 'O‘yin o‘ynang va g‘alaba qozonib Season XP to‘plang. Darajalarni yorib mukofotlarni oling!'
                    : 'Играйте и побеждайте, зарабатывая XP сезона. Открывайте уровни и забирайте награды!'}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-white/80">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" /> {lang === 'uz' ? 'Bepul' : 'Бесплатно'}
                </span>
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span className="w-3 h-3 rounded-full bg-[#E7B65B]" /> VIP
                </span>
              </div>
            </div>

            {/* Level Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 pt-2">
              {(season?.levels || []).map((lvl) => {
                const isLevelReached = currentLevel >= lvl.level;
                const freeClaimed = seasonProgress?.claimedFreeLevels?.includes(lvl.level);
                const vipClaimed = seasonProgress?.claimedVipLevels?.includes(lvl.level);

                return (
                  <div
                    key={lvl.level}
                    className={`rounded-2xl p-4 border flex flex-col justify-between transition-all ${
                      isLevelReached
                        ? 'bg-[#10152D] border-emerald-500/40 shadow-lg'
                        : 'bg-[#090C16] border-white/5 opacity-80'
                    }`}
                  >
                    {/* Level header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-white/10 font-mono text-xs font-black text-white">
                        LVL {lvl.level}
                      </span>
                      {isLevelReached ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-white/40" />
                      )}
                    </div>

                    {/* FREE Reward */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1 mb-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-white/60">
                        <span>FREE</span>
                        <Coins className="w-3 h-3 text-[#E7B65B]" />
                      </div>
                      <p className="text-xs font-bold text-[#F5F5F7] truncate">{lvl.freeReward.label[lang]}</p>
                      {freeClaimed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <Check className="w-3 h-3" /> {lang === 'uz' ? 'Olingan' : 'Получено'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimBattlePass(lvl.level, 'FREE')}
                          disabled={!isLevelReached || claimingReward === `${lvl.level}-FREE`}
                          className="w-full mt-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-[11px] font-bold text-white transition-colors"
                        >
                          {lang === 'uz' ? 'Olish' : 'Забрать'}
                        </button>
                      )}
                    </div>

                    {/* VIP Reward */}
                    <div className="p-2.5 rounded-xl bg-[#E7B65B]/10 border border-[#E7B65B]/30 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
                        <span className="flex items-center gap-1">
                          <Crown className="w-3 h-3" /> VIP
                        </span>
                        <Gem className="w-3 h-3 text-[#38BDF8]" />
                      </div>
                      <p className="text-xs font-bold text-[#E7B65B] truncate">{lvl.vipReward.label[lang]}</p>
                      {vipClaimed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <Check className="w-3 h-3" /> {lang === 'uz' ? 'Olingan' : 'Получено'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimBattlePass(lvl.level, 'VIP')}
                          disabled={!isLevelReached || !isVip || claimingReward === `${lvl.level}-VIP`}
                          className="w-full mt-1 py-1 rounded-lg bg-[#E7B65B] hover:bg-[#E7B65B]/90 disabled:opacity-30 text-[11px] font-black text-[#090B12] transition-colors"
                        >
                          {!isVip
                            ? lang === 'uz'
                              ? 'VIP Talab'
                              : 'VIP Нужен'
                            : lang === 'uz'
                              ? 'Olish'
                              : 'Забрать'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 7-DAY CALENDAR TAB */}
      {activeTab === 'daily' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-lg font-bold text-[#F5F5F7] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#E7B65B]" />
              {lang === 'uz' ? '7 kunlik uzluksiz taqvim' : '7-дневный календарь наград'}
            </h2>
            <button
              onClick={handleClaimDaily}
              disabled={claimedToday || claimingDaily}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E7B65B] text-xs font-bold text-[#090B12] hover:bg-[#E7B65B]/90 disabled:opacity-45 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {claimedToday
                ? lang === 'uz'
                  ? 'Bugungi mukofot olingan'
                  : 'Награда на сегодня получена'
                : lang === 'uz'
                  ? 'Kunlik mukofotni olish'
                  : 'Забрать награду'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {DAILY_REWARD_CALENDAR.map((d) => {
              const isPast = d.day <= user.dailyReward.streak && (claimedToday || d.day <= user.dailyReward.streak);
              const isNext = !claimedToday && d.day === (user.dailyReward.streak % 7) + 1;
              return (
                <div
                  key={d.day}
                  className={`rounded-xl p-4 border flex flex-col justify-between text-center ${
                    d.special
                      ? 'bg-[#E7B65B]/15 border-[#E7B65B]/50'
                      : isNext
                        ? 'bg-[#E63946]/15 border-[#E63946]/50'
                        : isPast
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-[#090B12] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#F5F5F7]/70 mb-2">
                    <span>{lang === 'uz' ? `${d.day}-kun` : `День ${d.day}`}</span>
                    {isPast && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-sm font-bold text-[#E7B65B] inline-flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      {d.gold}
                    </p>
                    {d.diamonds > 0 && (
                      <p className="font-mono text-xs font-bold text-[#38BDF8] flex items-center justify-center gap-1">
                        <Gem className="w-3 h-3" />
                        {d.diamonds}
                      </p>
                    )}
                    <p className="text-[11px] text-[#A855F7] font-mono">+{d.xp} XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MISSIONS TAB */}
      {activeTab === 'missions' && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#F5F5F7] flex items-center gap-2">
            <Target className="w-5 h-5 text-[#E63946]" />
            {lang === 'uz' ? 'Kunlik va Haftalik Vazifalar' : 'Ежедневные и еженедельные миссии'}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {MISSIONS.map((m) => {
              const pKey = m.period === 'DAILY' ? todayKey : weekKey;
              const st = user.missionProgress[m.id];
              const progress = st && st.periodKey === pKey ? st.progress : 0;
              const claimed = Boolean(st && st.periodKey === pKey && st.claimed);
              const completed = progress >= m.target;
              const pct = Math.min(100, Math.round((progress / m.target) * 100));

              return (
                <div key={m.id} className="p-4 rounded-xl bg-[#090B12] border border-white/10 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-[#E7B65B] inline-flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {m.period}
                      </span>
                      <h3 className="text-sm font-bold text-[#F5F5F7] mt-0.5">{m.name[lang]}</h3>
                      <p className="text-xs text-[#F5F5F7]/65">{m.description[lang]}</p>
                    </div>
                    <div className="text-right font-mono text-xs shrink-0">
                      <p className="text-[#E7B65B]">+{m.goldReward} G</p>
                      <p className="text-[#A855F7]">+{m.xpReward} XP</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#F5F5F7]/60">
                      <span>
                        {progress}/{m.target}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-[#E63946] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {claimed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      {lang === 'uz' ? 'Olingan' : 'Получено'}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleClaimMission(m.id)}
                      disabled={!completed || claimingMission === m.id}
                      className="px-4 py-2 rounded-lg bg-[#E63946] text-xs font-bold text-white disabled:opacity-35"
                    >
                      {lang === 'uz' ? 'Mukofotni olish' : 'Забрать'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

