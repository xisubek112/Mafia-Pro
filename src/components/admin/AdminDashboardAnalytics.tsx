import React, { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminOverview, Language } from '../../shared/types';

interface AnalyticsPayload {
  rangeDays: number;
  dau: number;
  wau: number;
  mau: number;
  grossRevenueUzs: number;
  refundedUzs: number;
  estimatedGatewayFeeUzs: number;
  netRevenueUzs: number;
  avgGameDurationSec: number;
  modePopularity: { mode: string; count: number }[];
  topRoles: { roleId: string; count: number }[];
  dailySeries: { day: string; registrations: number; revenueUzs: number; orders: number }[];
}

export const AdminDashboardAnalytics: React.FC<{
  mode: 'dashboard' | 'analytics';
  data: AdminOverview;
  token: string;
  lang: Language;
  onRefresh: () => void;
}> = ({ mode, data, token, lang, onRefresh }) => {
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/analytics?range=${rangeDays}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setAnalytics(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeDays, token, data.totalGamesPlayed, data.paidOrdersCount]);

  const handleExportCsv = async () => {
    const res = await fetch(`/api/admin/analytics/export.csv?range=${rangeDays}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mafia-pro-analytics-${rangeDays}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#F5F5F7]">
            {mode === 'dashboard'
              ? lang === 'uz'
                ? 'Boshqaruv Paneli (Real vaqt)'
                : 'Панель управления (Live)'
              : lang === 'uz'
                ? 'Tahlil va Moliyaviy Hisobotlar'
                : 'Аналитика и отчёты'}
          </h2>
          <p className="text-xs text-[#F5F5F7]/60 mt-0.5">
            {lang === 'uz'
              ? `Server holati: ${data.dbMode.toUpperCase()} · Ish vaqti: ${Math.floor(data.uptimeSec / 60)} daqiqa`
              : `База: ${data.dbMode.toUpperCase()} · Аптайм: ${Math.floor(data.uptimeSec / 60)} мин`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-[#090B12] border border-white/10">
            {([7, 30, 90] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRangeDays(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  rangeDays === r ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65 hover:text-white'
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
          {mode === 'analytics' && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E7B65B] text-xs font-bold text-[#090B12]"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          )}
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F5F7]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {lang === 'uz' ? 'Yangilash' : 'Обновить'}
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      {mode === 'dashboard' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'Jami foydalanuvchilar' : 'Всего пользователей'}</p>
            <p className="font-mono text-2xl font-bold text-[#F5F5F7] tabular-nums mt-1">
              {data.totalUsers}{' '}
              <span className="text-xs text-emerald-400">+{data.newUsersToday} {lang === 'uz' ? 'bugun' : 'сегодня'}</span>
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'Onlayn / Xonalardagi o‘yinchilar' : 'Онлайн / В комнатах'}</p>
            <p className="font-mono text-2xl font-bold text-[#38BDF8] tabular-nums mt-1">
              {data.onlineUsersCount} <span className="text-sm text-[#F5F5F7]/45">/ {data.activePlayersInRooms}</span>
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'Faol xonalar / VIP' : 'Комнаты / VIP'}</p>
            <p className="font-mono text-2xl font-bold text-[#E7B65B] tabular-nums mt-1">
              {data.activeRooms} <span className="text-sm text-[#F5F5F7]/45">/ {data.activeVipCount} VIP</span>
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-5 border border-[#E7B65B]/25">
            <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'Tasdiqlangan tushum' : 'Выручка (UZS)'}</p>
            <p className="font-mono text-2xl font-bold text-emerald-400 tabular-nums mt-1">
              {data.totalRevenueUzs.toLocaleString()} <span className="text-xs">UZS</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs text-[#F5F5F7]/60">DAU / WAU / MAU</p>
            <p className="font-mono text-xl font-bold text-[#38BDF8] tabular-nums mt-1">
              {analytics?.dau ?? 0} / {analytics?.wau ?? 0} / {analytics?.mau ?? 0}
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'Yalpi tushum (Gross)' : 'Валовая выручка'}</p>
            <p className="font-mono text-xl font-bold text-[#E7B65B] tabular-nums mt-1">
              {(analytics?.grossRevenueUzs ?? 0).toLocaleString()} UZS
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'Sof tushum (Net)' : 'Чистая выручка'}</p>
            <p className="font-mono text-xl font-bold text-emerald-400 tabular-nums mt-1">
              {(analytics?.netRevenueUzs ?? 0).toLocaleString()} UZS
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'Qaytarilgan / O‘rtacha o‘yin' : 'Возвраты / Ср. матч'}</p>
            <p className="font-mono text-xl font-bold text-[#E63946] tabular-nums mt-1">
              {(analytics?.refundedUzs ?? 0).toLocaleString()} <span className="text-xs text-[#F5F5F7]/60">/ {analytics?.avgGameDurationSec ?? 0}s</span>
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="font-display text-base font-bold text-[#F5F5F7] mb-4">
            {lang === 'uz' ? 'Kunlik tushum va ro‘yxatdan o‘tishlar' : 'Выручка и регистрации по дням'}
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.dailySeries || []}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" minTickGap={18} tick={{ fill: 'rgba(245,245,247,0.55)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(245,245,247,0.55)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090B12',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="revenueUzs" name="UZS" stroke="#E7B65B" fill="#E7B65B33" />
                <Area type="monotone" dataKey="registrations" name={lang === 'uz' ? 'Yangi' : 'Рег.'} stroke="#38BDF8" fill="#38BDF822" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h3 className="font-display text-base font-bold text-[#F5F5F7] mb-4">
            {lang === 'uz' ? 'O‘yin rejimlari mashhurligi' : 'Популярность режимов'}
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.modePopularity || []}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="mode" tick={{ fill: '#F5F5F7', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'rgba(245,245,247,0.55)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090B12',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name={lang === 'uz' ? 'O‘yinlar' : 'Игры'} radius={[6, 6, 0, 0]}>
                  {(analytics?.modePopularity || []).map((entry, idx) => (
                    <Cell key={entry.mode} fill={['#38BDF8', '#E7B65B', '#E63946'][idx % 3]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
