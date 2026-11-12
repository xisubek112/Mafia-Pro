import React, { useEffect, useState } from 'react';
import { Ban, Check, Clock, Flag, Link2, Search, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RecentPlayerEntry, UserProfile } from '../shared/types';

interface SocialUserCard {
  id: string;
  username: string;
  avatar: string;
  level: number;
  rating: number;
  country: string;
  isOnline: boolean;
}

interface SocialOverview {
  friends: SocialUserCard[];
  requestsIn: SocialUserCard[];
  requestsOut: SocialUserCard[];
  blocked: SocialUserCard[];
  recentPlayers: RecentPlayerEntry[];
}

export const SocialPage: React.FC = () => {
  const { user, token, lang, roomState, showToast, navigate } = useApp();
  const [data, setData] = useState<SocialOverview | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [reportTarget, setReportTarget] = useState<{ id: string; username: string } | null>(null);
  const [reportReason, setReportReason] = useState('');

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !reportTarget || reportReason.trim().length < 3) return;
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        targetUserId: reportTarget.id,
        targetUsername: reportTarget.username,
        reason: reportReason.trim(),
      }),
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Shikoyat adminga yuborildi' : 'Жалоба отправлена админу', 'success');
      setReportTarget(null);
      setReportReason('');
    } else {
      const err = await res.json();
      showToast(err.error || 'Error', 'error');
    }
  };

  const load = async () => {
    if (!token) return;
    const res = await fetch('/api/social', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setData(await res.json());
  };

  useEffect(() => {
    load();
  }, [token]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[#F5F5F7]/70 mb-4">
          {lang === 'uz' ? 'Do‘stlar bo‘limi uchun hisobga kiring.' : 'Войдите для доступа к списку друзей.'}
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const res = await fetch(`/api/social/search?q=${encodeURIComponent(search)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json();
    setResults(d.players || []);
  };

  const postAction = async (endpoint: string, body: Record<string, string>, msg?: string) => {
    if (!token) return;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) return showToast(d.error || 'Error', 'error');
    setData(d);
    if (msg) showToast(msg, 'success');
  };

  const copyInvite = () => {
    const url = roomState
      ? `${window.location.origin}/?room=${roomState.code}`
      : window.location.origin;
    navigator.clipboard.writeText(url);
    showToast(lang === 'uz' ? 'Taklif havolasi nusxalandi' : 'Ссылка-приглашение скопирована', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-[#F5F5F7] flex items-center gap-3">
          <Users className="w-7 h-7 text-[#E7B65B]" />
          {lang === 'uz' ? 'Do‘stlar va Hamjamiyat' : 'Друзья и Сообщество'}
        </h1>

        <button
          onClick={copyInvite}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111522] border border-white/15 text-xs font-semibold text-[#F5F5F7] hover:bg-white/10"
        >
          <Link2 className="w-4 h-4 text-[#E7B65B]" />
          {roomState
            ? `${lang === 'uz' ? 'Xonaga taklif:' : 'Пригласить в комнату:'} ${roomState.code}`
            : lang === 'uz'
              ? 'Platforma havolasi'
              : 'Ссылка на платформу'}
        </button>
      </div>

      {/* Player Search */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#F5F5F7]/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'uz' ? 'O‘yinchi ismini qidiring...' : 'Поиск игрока по имени...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-sm text-[#F5F5F7]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#E63946] text-xs font-bold text-white"
          >
            {lang === 'uz' ? 'Qidirish' : 'Найти'}
          </button>
        </form>

        {results.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((r) => (
              <div key={r.id} className="p-3.5 rounded-xl bg-[#090B12] border border-white/10 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#F5F5F7]">{r.username}</p>
                  <p className="text-xs text-[#F5F5F7]/55">
                    Lv.{r.level} · {r.rating} MMR · {r.country}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      postAction('/api/social/request', { targetId: r.id }, lang === 'uz' ? 'So‘rov yuborildi' : 'Заявка отправлена')
                    }
                    className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                    title="Add friend"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setReportTarget({ id: r.id, username: r.username })}
                    className="p-2 rounded-lg bg-[#E7B65B]/15 text-[#E7B65B] hover:bg-[#E7B65B]/25"
                    title={lang === 'uz' ? 'Shikoyat yuborish' : 'Пожаловаться'}
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => postAction('/api/social/block', { targetId: r.id })}
                    className="p-2 rounded-lg bg-[#E63946]/15 text-[#E63946]"
                    title="Block"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {reportTarget && (
          <form
            onSubmit={submitReport}
            className="p-4 rounded-xl bg-[#090B12] border border-[#E7B65B]/30 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
          >
            <span className="text-xs font-semibold text-[#E7B65B] shrink-0">
              {lang === 'uz' ? `Shikoyat: ${reportTarget.username}` : `Жалоба: ${reportTarget.username}`}
            </span>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder={lang === 'uz' ? 'Sababini yozing...' : 'Укажите причину...'}
              className="flex-1 px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#E63946] text-xs font-bold text-white"
              >
                {lang === 'uz' ? 'Yuborish' : 'Отправить'}
              </button>
              <button
                type="button"
                onClick={() => { setReportTarget(null); setReportReason(''); }}
                className="px-3 py-2 rounded-lg bg-white/10 text-xs text-[#F5F5F7]/75"
              >
                {lang === 'uz' ? 'Bekor' : 'Отмена'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Friends List */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#F5F5F7]">
            {lang === 'uz' ? 'Do‘stlar' : 'Друзья'} ({data?.friends.length ?? 0})
          </h2>
          {!data || data.friends.length === 0 ? (
            <p className="text-xs text-[#F5F5F7]/55 py-6 text-center">
              {lang === 'uz' ? 'Hozircha do‘stlar yo‘q.' : 'Список друзей пуст.'}
            </p>
          ) : (
            <div className="divide-y divide-white/10">
              {data.friends.map((f) => (
                <div key={f.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        f.isOnline ? 'bg-emerald-400' : 'bg-[#F5F5F7]/25'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#F5F5F7]">{f.username}</p>
                      <p className="text-xs text-[#F5F5F7]/55">
                        Lv.{f.level} · {f.rating} MMR · {f.country}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => postAction('/api/social/remove', { friendId: f.id })}
                    className="p-2 rounded-lg bg-white/5 hover:bg-[#E63946]/20 text-[#F5F5F7]/60 hover:text-[#E63946]"
                    title="Remove friend"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Requests & Recent Players */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-[#F5F5F7]">
              {lang === 'uz' ? 'Kiruvchi so‘rovlar' : 'Входящие заявки'} ({data?.requestsIn.length ?? 0})
            </h2>
            {data?.requestsIn.map((req) => (
              <div key={req.id} className="p-3 rounded-xl bg-[#090B12] flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#F5F5F7]">{req.username}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => postAction('/api/social/accept', { requesterId: req.id })}
                    className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => postAction('/api/social/decline', { requesterId: req.id })}
                    className="p-1.5 rounded-lg bg-white/10 text-[#F5F5F7]/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-[#F5F5F7] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#A855F7]" />
              {lang === 'uz' ? 'Yaqinda birga o‘ynaganlar' : 'Недавние игроки'}
            </h2>
            {!data || data.recentPlayers.length === 0 ? (
              <p className="text-xs text-[#F5F5F7]/50">—</p>
            ) : (
              data.recentPlayers.slice(0, 6).map((rp) => (
                <div key={rp.userId} className="flex items-center justify-between text-xs py-1.5">
                  <span className="font-semibold text-[#F5F5F7]">{rp.username}</span>
                  <button
                    onClick={() => postAction('/api/social/request', { targetId: rp.userId })}
                    className="text-[#E7B65B] hover:underline"
                  >
                    + {lang === 'uz' ? 'Qo‘shish' : 'Добавить'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
