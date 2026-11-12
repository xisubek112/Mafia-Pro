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

  // MODERATION CENTER (Module 09)
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
          {lang === 'uz' ? 'Moderatsiya Markazi' : 'Центр модерации'}
        </h2>
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
  );
};
