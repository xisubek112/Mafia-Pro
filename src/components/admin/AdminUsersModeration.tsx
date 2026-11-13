import React, { useState } from 'react';
import { AlertTriangle, Ban, CheckCircle, Clock, Flag, RotateCcw, Search, Shield, XCircle } from 'lucide-react';
import { AdminOverview, Language } from '../../shared/types';

export const AdminUsersModeration: React.FC<{
  mode: 'users' | 'moderation';
  data: AdminOverview;
  token: string;
  lang: Language;
  onReload: () => Promise<void> | void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}> = ({ mode, data, token, lang, onReload, showToast }) => {
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'ALL' | 'VIP' | 'BANNED' | 'SUSPENDED'>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [reportFilter, setReportFilter] = useState<'OPEN' | 'ALL' | 'RESOLVED'>('OPEN');
  const [modNote, setModNote] = useState<Record<string, string>>({});

  const callPost = async (url: string, body: unknown, successMsg: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      showToast(successMsg, 'success');
      await onReload();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Action failed', 'error');
    }
  };

  if (mode === 'users') {
    const filtered = data.users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q);
      const isSuspended = Boolean(u.suspendedUntil && u.suspendedUntil > Date.now());
      const matchFilter =
        userFilter === 'ALL' ||
        (userFilter === 'VIP' && u.subscription.status === 'ACTIVE') ||
        (userFilter === 'BANNED' && u.isBanned) ||
        (userFilter === 'SUSPENDED' && isSuspended);
      return matchSearch && matchFilter;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-[#F5F5F7]">
            {lang === 'uz' ? 'Foydalanuvchilar Boshqaruvi' : 'Управление пользователями'}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#F5F5F7]/45 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={lang === 'uz' ? 'Ism, email yoki ID...' : 'Имя, email или ID...'}
                className="pl-8 pr-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7]"
              />
            </div>
            <div className="inline-flex p-1 rounded-xl bg-[#090B12] border border-white/10">
              {(['ALL', 'VIP', 'SUSPENDED', 'BANNED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setUserFilter(f);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                    userFilter === f ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-[#F5F5F7]/55">
              <tr>
                <th className="py-3 px-4">ID / {lang === 'uz' ? 'Foydalanuvchi' : 'Пользователь'}</th>
                <th className="py-3 px-3">VIP / MMR</th>
                <th className="py-3 px-3">{lang === 'uz' ? 'O‘yinlar (G‘/M)' : 'Матчи (П/П)'}</th>
                <th className="py-3 px-3">{lang === 'uz' ? 'Holat' : 'Статус'}</th>
                <th className="py-3 px-4 text-right">{lang === 'uz' ? 'Amallar' : 'Действия'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {paged.map((u) => {
                const isSuspended = Boolean(u.suspendedUntil && u.suspendedUntil > Date.now());
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#F5F5F7]">{u.username}</p>
                      <p className="font-mono text-[10px] text-[#F5F5F7]/45">
                        {u.id} · {u.email}
                      </p>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className={u.subscription.status === 'ACTIVE' ? 'text-[#E7B65B] font-bold' : 'text-[#F5F5F7]/50'}>
                        {u.subscription.status === 'ACTIVE' ? 'VIP' : 'FREE'}
                      </span>{' '}
                      · {u.rating}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      {u.totalGames} ({u.wins}/{u.losses})
                    </td>
                    <td className="py-3 px-3">
                      {u.isBanned ? (
                        <span className="text-[#E63946] font-semibold">BANNED</span>
                      ) : isSuspended ? (
                        <span className="text-[#E7B65B] font-semibold">SUSPENDED</span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">ACTIVE</span>
                      )}
                      {(u.warningsCount ?? 0) > 0 && (
                        <span className="ml-2 text-[10px] text-[#E7B65B]">({u.warningsCount}⚠)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'ADMIN' && (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              callPost(
                                '/api/admin/warn',
                                { userId: u.id, reason: 'Admin moderation warning' },
                                lang === 'uz' ? 'Ogohlantirish yuborildi' : 'Предупреждение отправлено'
                              )
                            }
                            className="px-2 py-1 rounded-lg bg-[#E7B65B]/15 text-[#E7B65B] font-semibold"
                            title="Warn"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              callPost(
                                `/api/admin/users/${u.id}/suspend`,
                                { hours: 24, reason: '24h temporary suspension' },
                                lang === 'uz' ? '24 soatga to‘xtatildi' : 'Приостановлен на 24ч'
                              )
                            }
                            className="px-2 py-1 rounded-lg bg-white/10 text-[#F5F5F7] font-semibold"
                            title="Suspend 24h"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          {u.isBanned || isSuspended ? (
                            <button
                              onClick={() =>
                                callPost(
                                  `/api/admin/users/${u.id}/restore`,
                                  {},
                                  lang === 'uz' ? 'Hisob tiklandi' : 'Аккаунт восстановлен'
                                )
                              }
                              className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold"
                              title="Restore"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                callPost(
                                  '/api/admin/ban',
                                  { userId: u.id, reason: 'Admin ban' },
                                  lang === 'uz' ? 'Bloklandi' : 'Заблокирован'
                                )
                              }
                              className="px-2 py-1 rounded-lg bg-[#E63946]/20 text-[#E63946] font-semibold"
                              title="Ban"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-[#F5F5F7]/65">
          <span>
            {filtered.length} {lang === 'uz' ? 'ta foydalanuvchi' : 'пользователей'}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-white/10 disabled:opacity-40"
            >
              ←
            </button>
            <span className="font-mono">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-white/10 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MODERATION CENTER (Module 09 + Anti-Cheat + Support + Elo Reset)
  const [modSubTab, setModSubTab] = useState<'reports' | 'antiCheat' | 'tickets' | 'eloReset'>('reports');
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [loadingSec, setLoadingSec] = useState(false);
  const [ticketReplyText, setTicketReplyText] = useState<Record<string, string>>({});
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resettingElo, setResettingElo] = useState(false);

  const loadSecurityEvents = async () => {
    setLoadingSec(true);
    try {
      const res = await fetch('/api/admin/anti-cheat/events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.events) setSecurityEvents(d.events);
    } catch {
      // ignore
    } finally {
      setLoadingSec(false);
    }
  };

  const loadSupportTickets = async () => {
    try {
      const res = await fetch('/api/admin/support/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.tickets) setSupportTickets(d.tickets);
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    if (mode === 'moderation') {
      if (modSubTab === 'antiCheat') loadSecurityEvents();
      if (modSubTab === 'tickets') loadSupportTickets();
    }
  }, [mode, modSubTab, token]);

  const handleReviewSecEvent = async (id: string, status: 'ACTIONED' | 'DISMISSED' | 'REVIEWED') => {
    try {
      const res = await fetch(`/api/admin/anti-cheat/review/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, note: 'Reviewed by admin' }),
      });
      if (res.ok) {
        showToast(lang === 'uz' ? 'Hodisa ko‘rib chiqildi' : 'Событие рассмотрено', 'success');
        loadSecurityEvents();
      }
    } catch {
      showToast('Error', 'error');
    }
  };

  const handleReplyTicket = async (ticketId: string) => {
    const text = ticketReplyText[ticketId]?.trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        showToast(lang === 'uz' ? 'Javob yuborildi' : 'Ответ отправлен', 'success');
        setTicketReplyText((prev) => ({ ...prev, [ticketId]: '' }));
        loadSupportTickets();
      }
    } catch {
      showToast('Error', 'error');
    }
  };

  const handleResetElo = async () => {
    if (resetConfirmText !== 'RESET-CONFIRM') {
      showToast(lang === 'uz' ? 'Tasdiqlash kodi noto‘g‘ri' : 'Неверный код подтверждения', 'error');
      return;
    }
    setResettingElo(true);
    try {
      const res = await fetch('/api/admin/rankings/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirm: 'RESET-CONFIRM', targetRating: 1000 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      showToast(lang === 'uz' ? 'Barcha Elo reytinglari muvaffaqiyatli tiklandi!' : 'Рейтинги сброшены!', 'success');
      setResetConfirmText('');
      await onReload();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setResettingElo(false);
    }
  };

  const visibleReports = data.reports.filter((r) => {
    if (reportFilter === 'OPEN') return r.status === 'OPEN';
    if (reportFilter === 'RESOLVED') return r.status !== 'OPEN';
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-[#F5F5F7] flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#E63946]" />
          {lang === 'uz' ? 'Moderatsiya & Xavfsizlik Markazi' : 'Центр модерации и безопасности'}
        </h2>

        {/* Sub-tab switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090B12] border border-white/10">
          <button
            onClick={() => setModSubTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              modSubTab === 'reports' ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65 hover:text-white'
            }`}
          >
            {lang === 'uz' ? 'Shikoyatlar' : 'Жалобы'} ({data.reports.filter((r) => r.status === 'OPEN').length})
          </button>
          <button
            onClick={() => setModSubTab('antiCheat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              modSubTab === 'antiCheat' ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65 hover:text-white'
            }`}
          >
            Anti-Cheat
          </button>
          <button
            onClick={() => setModSubTab('tickets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              modSubTab === 'tickets' ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65 hover:text-white'
            }`}
          >
            {lang === 'uz' ? 'Biletlar' : 'Тикеты'}
          </button>
          <button
            onClick={() => setModSubTab('eloReset')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              modSubTab === 'eloReset' ? 'bg-[#E7B65B] text-[#090B12] font-bold' : 'text-[#F5F5F7]/65 hover:text-white'
            }`}
          >
            {lang === 'uz' ? 'Reyting Reset' : 'Сброс рейтинга'}
          </button>
        </div>
      </div>

      {/* SUB-TAB: REPORTS */}
      {modSubTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="inline-flex p-1 rounded-xl bg-[#090B12] border border-white/10">
              {(['OPEN', 'ALL', 'RESOLVED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setReportFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    reportFilter === f ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {visibleReports.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 text-center text-sm text-[#F5F5F7]/55">
              {lang === 'uz' ? 'Shikoyatlar mavjud emas' : 'Жалоб нет'}
            </div>
          ) : (
        <div className="space-y-3">
          {visibleReports.map((rep) => {
            const targetUser = data.users.find((u) => u.id === rep.targetUserId);
            return (
              <div key={rep.id} className="glass-panel rounded-2xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#F5F5F7]">
                      {rep.targetUsername}{' '}
                      <span className="text-xs font-normal text-[#F5F5F7]/55">
                        ({rep.category || 'USER'} · {rep.roomCode})
                      </span>
                    </p>
                    <p className="text-xs text-[#F5F5F7]/75 mt-1">{rep.reason}</p>
                    <p className="text-[11px] font-mono text-[#F5F5F7]/45 mt-1">
                      {lang === 'uz' ? 'Yuboruvchi:' : 'От:'} {rep.reporterName} ·{' '}
                      {new Date(rep.createdAt).toLocaleString()} · Strikes: {targetUser?.warningsCount ?? 0}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#E7B65B]">{rep.status}</span>
                </div>

                {rep.status === 'OPEN' && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                    <input
                      value={modNote[rep.id] || ''}
                      onChange={(e) => setModNote((prev) => ({ ...prev, [rep.id]: e.target.value }))}
                      placeholder={lang === 'uz' ? 'Moderator izohi...' : 'Заметка модератора...'}
                      className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7]"
                    />
                    <button
                      onClick={() =>
                        callPost(
                          '/api/admin/flag',
                          { userId: rep.targetUserId, reason: rep.reason },
                          lang === 'uz' ? 'Belgilandi' : 'Помечен'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 text-xs font-semibold"
                    >
                      <Flag className="w-3.5 h-3.5 text-[#E7B65B]" /> Flag
                    </button>
                    <button
                      onClick={() =>
                        callPost(
                          '/api/admin/warn',
                          { userId: rep.targetUserId, reason: rep.reason },
                          lang === 'uz' ? 'Ogohlantirildi' : 'Предупреждён'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#E7B65B]/15 text-[#E7B65B] text-xs font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Warn
                    </button>
                    <button
                      onClick={() =>
                        callPost(
                          `/api/admin/reports/${rep.id}`,
                          { status: 'RESOLVED', moderatorNote: modNote[rep.id] || 'Resolved' },
                          lang === 'uz' ? 'Yopildi' : 'Закрыто'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Resolve
                    </button>
                    <button
                      onClick={() =>
                        callPost(
                          `/api/admin/reports/${rep.id}`,
                          { status: 'DISMISSED', moderatorNote: modNote[rep.id] || 'Dismissed' },
                          lang === 'uz' ? 'Rad etildi' : 'Отклонено'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 text-xs font-semibold"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
      )}

      {/* SUB-TAB: ANTI-CHEAT */}
      {modSubTab === 'antiCheat' && (
        <div className="space-y-4">
          <p className="text-xs text-[#F5F5F7]/60">
            {lang === 'uz'
              ? 'Multiplayer yaxlitligi, tezkor ovoz berish va noqonuniy harakatlar monitoringi'
              : 'Мониторинг целостности мультиплеера, таймингов и подозрительных действий'}
          </p>
          {loadingSec ? (
            <div className="p-8 text-center text-sm text-[#F5F5F7]/50">...</div>
          ) : securityEvents.length === 0 ? (
            <div className="p-12 text-center text-sm text-emerald-400 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              {lang === 'uz' ? 'Xavfsizlik buzilishlari aniqlanmadi (Tizim toza)' : 'Нарушений не зафиксировано'}
            </div>
          ) : (
            <div className="grid gap-3">
              {securityEvents.map((evt) => (
                <div key={evt.id} className="p-4 rounded-xl bg-[#090B12] border border-red-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 font-bold">
                      {evt.type} · {evt.severity}
                    </span>
                    <span className="text-xs text-[#F5F5F7]/50">{new Date(evt.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-[#F5F5F7]">
                    <strong>{evt.username}</strong> · IP: <code>{evt.ip}</code>
                  </p>
                  <p className="text-xs text-[#F5F5F7]/70 font-mono bg-white/5 p-2.5 rounded-lg">
                    {evt.details}
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-[11px] font-bold text-white/50">{evt.status}</span>
                    {evt.status === 'PENDING' && (
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => handleReviewSecEvent(evt.id, 'ACTIONED')}
                          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white"
                        >
                          {lang === 'uz' ? 'Tasdiqlash (Chora ko‘rish)' : 'Подтвердить (Меры)'}
                        </button>
                        <button
                          onClick={() => handleReviewSecEvent(evt.id, 'DISMISSED')}
                          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
                        >
                          {lang === 'uz' ? 'Bekor qilish' : 'Отклонить'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: SUPPORT TICKETS */}
      {modSubTab === 'tickets' && (
        <div className="space-y-4">
          <p className="text-xs text-[#F5F5F7]/60">
            {lang === 'uz' ? 'Foydalanuvchilardan kelgan murojaat va muammolar' : 'Тикеты поддержки пользователей'}
          </p>
          {supportTickets.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#F5F5F7]/50 rounded-2xl bg-[#090B12] border border-white/10">
              {lang === 'uz' ? 'Hozircha ochiq murojaatlar yo‘q' : 'Обращений нет'}
            </div>
          ) : (
            <div className="grid gap-4">
              {supportTickets.map((tk) => (
                <div key={tk.id} className="p-5 rounded-2xl bg-[#090B12] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs text-[#E7B65B] font-bold">#{tk.id.slice(0, 8)}</span>
                      <h4 className="text-sm font-bold text-[#F5F5F7] mt-0.5">{tk.subject}</h4>
                      <p className="text-xs text-[#F5F5F7]/60">{tk.username} · {tk.priority}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      tk.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#E7B65B]/20 text-[#E7B65B]'
                    }`}>
                      {tk.status}
                    </span>
                  </div>

                  {/* Messages timeline */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    {(tk.responses || []).map((m: any, idx: number) => (
                      <div
                        key={m.id || idx}
                        className={`p-3 rounded-xl text-xs ${
                          !m.isStaff ? 'bg-white/5 text-white/90' : 'bg-[#E63946]/15 border border-[#E63946]/30 text-white'
                        }`}
                      >
                        <p className="font-bold text-[11px] text-white/50 mb-1">{m.authorName}</p>
                        <p>{m.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Admin Reply Input */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={ticketReplyText[tk.id] || ''}
                      onChange={(e) => setTicketReplyText((prev) => ({ ...prev, [tk.id]: e.target.value }))}
                      placeholder={lang === 'uz' ? 'Admin nomidan javob yozish...' : 'Ответ администратора...'}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E63946]"
                    />
                    <button
                      onClick={() => handleReplyTicket(tk.id)}
                      className="px-4 py-2 rounded-xl bg-[#E63946] text-xs font-bold text-white hover:bg-[#E63946]/90 transition-colors"
                    >
                      {lang === 'uz' ? 'Yuborish' : 'Отправить'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: ELO RANKING RESET */}
      {modSubTab === 'eloReset' && (
        <div className="p-6 rounded-2xl bg-[#110B12] border border-[#E63946]/30 space-y-4 max-w-xl">
          <div className="flex items-center gap-3 text-[#E63946]">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-display text-lg font-bold">
              {lang === 'uz' ? 'Mavsumiy Elo Reyting Reset' : 'Сезонный сброс рейтинга Elo'}
            </h3>
          </div>
          <p className="text-xs text-[#F5F5F7]/70 leading-relaxed">
            {lang === 'uz'
              ? 'Ushbu operatsiya barcha o‘yinchilar reytingini 1000 MMR ga tiklaydi, ammo ularning o‘yinlar soni, g‘alabalari va inventarini to‘liq saqlab qoladi.'
              : 'Данная операция сбрасывает текущий MMR игроков к 1000, сохраняя при этом общее число матчей, побед и инвентарь.'}
          </p>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-2">
            <p className="text-white/80">
              {lang === 'uz'
                ? 'Tasdiqlash uchun quyidagi maydonga «RESET-CONFIRM» deb yozing:'
                : 'Для подтверждения введите «RESET-CONFIRM»:'}
            </p>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET-CONFIRM"
              className="w-full px-3 py-2 rounded-lg bg-[#090B12] border border-white/20 text-xs font-mono text-amber-300"
            />
          </div>
          <button
            onClick={handleResetElo}
            disabled={resettingElo || resetConfirmText !== 'RESET-CONFIRM'}
            className="px-5 py-2.5 rounded-xl bg-[#E63946] hover:bg-[#E63946]/90 disabled:opacity-40 text-xs font-bold text-white transition-colors"
          >
            {resettingElo
              ? '...'
              : lang === 'uz'
                ? 'Reytinglarni tiklash'
                : 'Выполнить сброс'}
          </button>
        </div>
      )}
    </div>
  );
};
