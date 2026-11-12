import React, { useState } from 'react';
import { Calendar, Check, Coins, Flame, Gem, Gift, Sparkles, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { DAILY_REWARD_CALENDAR, getUtcDayKey, getUtcWeekKey, MISSIONS } from '../shared/ecosystem';

export const RewardsPage: React.FC = () => {
  const { user, token, lang, refreshUser, showToast, navigate } = useApp();
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [claimingMission, setClaimingMission] = useState<string | null>(null);
  const [lastRewardBanner, setLastRewardBanner] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[#F5F5F7]/70 mb-4">
          {lang === 'uz'
            ? 'Kunlik mukofotlar va vazifalar uchun hisobga kiring.'
            : 'Войдите в аккаунт для получения наград и выполнения миссий.'}
        </p>
        <button
          onClick={() => navigate('auth')}
          className="px-6 py-3 rounded-xl bg-[#E63946] text-sm font-bold text-white"
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7] flex items-center gap-3">
            <Gift className="w-7 h-7 text-[#E7B65B]" />
            {lang === 'uz' ? 'Kunlik Mukofotlar va Vazifalar' : 'Ежедневные награды и миссии'}
          </h1>
          <p className="mt-1 text-sm text-[#F5F5F7]/65">
            {lang === 'uz'
              ? `Joriy seriya: ${user.dailyReward.streak} kun`
              : `Текущая серия: ${user.dailyReward.streak} дн.`}
          </p>
        </div>

        <button
          onClick={handleClaimDaily}
          disabled={claimedToday || claimingDaily}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E7B65B] text-xs font-bold text-[#090B12] hover:bg-[#E7B65B]/90 disabled:opacity-45 transition-colors"
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

      {lastRewardBanner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel-elevated rounded-2xl p-4 border border-emerald-500/40 text-center text-sm font-bold text-emerald-300"
        >
          {lastRewardBanner}
        </motion.div>
      )}

      {/* 7-Day Calendar */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="font-display text-lg font-bold text-[#F5F5F7] mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#E7B65B]" />
          {lang === 'uz' ? '7 kunlik mukofot taqvimi' : '7-дневный календарь наград'}
        </h2>
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

      {/* Daily & Weekly Missions */}
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
    </div>
  );
};
