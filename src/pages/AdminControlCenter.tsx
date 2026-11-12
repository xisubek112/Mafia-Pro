import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  ChevronRight,
  CreditCard,
  Crown,
  Gamepad2,
  Globe,
  LayoutDashboard,
  Lock,
  Menu,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingBag,
  Tag,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdminModuleId, AdminOverview } from '../shared/types';
import { AdminEconomyPanel } from '../components/AdminEconomyPanel';
import { AdminDashboardAnalytics } from '../components/admin/AdminDashboardAnalytics';
import { AdminUsersModeration } from '../components/admin/AdminUsersModeration';
import { AdminGameplayModules } from '../components/admin/AdminGameplayModules';
import { AdminCommsSettings } from '../components/admin/AdminCommsSettings';
import { AdminSecuritySystem } from '../components/admin/AdminSecuritySystem';

interface NavItem {
  id: AdminModuleId;
  num: string;
  label: { uz: string; ru: string };
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', num: '01', label: { uz: 'Boshqaruv paneli', ru: 'Дашборд' }, icon: LayoutDashboard },
  { id: 'users', num: '02', label: { uz: 'Foydalanuvchilar', ru: 'Пользователи' }, icon: Users },
  { id: 'vip', num: '03', label: { uz: 'VIP boshqaruvi', ru: 'Управление VIP' }, icon: Crown },
  { id: 'shop', num: '04', label: { uz: 'Mafia Do‘koni', ru: 'Магазин Mafia' }, icon: ShoppingBag },
  { id: 'payments', num: '05', label: { uz: 'To‘lovlar', ru: 'Платежи' }, icon: CreditCard },
  { id: 'rooms', num: '06', label: { uz: 'O‘yin xonalari', ru: 'Игровые комнаты' }, icon: Gamepad2 },
  { id: 'roles', num: '07', label: { uz: 'Rollar ensiklopediyasi', ru: 'Роли' }, icon: BookOpen },
  { id: 'tournaments', num: '08', label: { uz: 'Turnirlar', ru: 'Турниры' }, icon: Trophy },
  { id: 'moderation', num: '09', label: { uz: 'Moderatsiya markazi', ru: 'Модерация' }, icon: ShieldAlert },
  { id: 'notifications', num: '10', label: { uz: 'Bildirishnomalar', ru: 'Уведомления' }, icon: Bell },
  { id: 'promos', num: '11', label: { uz: 'Promokodlar', ru: 'Промокоды' }, icon: Tag },
  { id: 'settings', num: '12', label: { uz: 'Sayt sozlamalari', ru: 'Настройки сайта' }, icon: Globe },
  { id: 'admins', num: '13', label: { uz: 'Adminlar va RBAC', ru: 'Админы и права' }, icon: Lock },
  { id: 'analytics', num: '14', label: { uz: 'Analitika', ru: 'Аналитика' }, icon: BarChart3 },
  { id: 'system', num: '15', label: { uz: 'Tizim va xavfsizlik', ru: 'Система' }, icon: Activity },
];

export const AdminControlCenter: React.FC = () => {
  const { token, user, showToast, lang } = useApp();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<AdminModuleId>('dashboard');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load admin overview');
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const roleDef = useMemo(() => {
    if (!data || !user) return null;
    const slug = user.adminRole || 'SUPER_ADMIN';
    return data.adminRoles.find((r) => r.slug === slug) || null;
  }, [data, user]);

  const visibleItems = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    return ADMIN_NAV_ITEMS.filter((item) => {
      const canRead = roleDef ? Boolean(roleDef.permissions[item.id]?.read) : true;
      if (!canRead) return false;
      if (!q) return true;
      return (
        item.label.uz.toLowerCase().includes(q) ||
        item.label.ru.toLowerCase().includes(q) ||
        item.num.includes(q)
      );
    });
  }, [roleDef, sidebarSearch]);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-sm text-[#E63946]">
        {lang === 'uz' ? 'Administrator huquqi talab qilinadi.' : 'Требуются права администратора.'}
      </div>
    );
  }

  const activeNav = ADMIN_NAV_ITEMS.find((i) => i.id === activeModule) || ADMIN_NAV_ITEMS[0];
  const openAlertsCount =
    (data?.reports.filter((r) => r.status === 'OPEN').length || 0) + (data?.pendingRefundsCount || 0);

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-sm font-black tracking-wider text-[#F5F5F7]">
              MAFIA <span className="text-[#E63946]">PRO</span>
            </p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#E7B65B]">
              Control Center 2.0
            </p>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1.5 rounded-lg bg-white/5 text-[#F5F5F7]/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="w-3.5 h-3.5 text-[#F5F5F7]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder={lang === 'uz' ? 'Modul qidirish...' : 'Поиск модуля...'}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7] outline-none focus:border-[#E7B65B]/40"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveModule(item.id);
                setMobileNavOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                active
                  ? 'bg-[#E63946] text-white shadow-lg shadow-[#E63946]/20'
                  : 'text-[#F5F5F7]/70 hover:bg-white/5 hover:text-[#F5F5F7]'
              }`}
            >
              <span className={`font-mono text-[10px] ${active ? 'text-white/80' : 'text-[#E7B65B]/70'}`}>
                {item.num}
              </span>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1 text-left">{item.label[lang]}</span>
              {item.id === 'moderation' && (data?.reports.filter((r) => r.status === 'OPEN').length || 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#090B12]/70 text-[#E7B65B] text-[10px] font-mono">
                  {data?.reports.filter((r) => r.status === 'OPEN').length}
                </span>
              )}
              {item.id === 'payments' && (data?.pendingRefundsCount || 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#090B12]/70 text-[#E7B65B] text-[10px] font-mono">
                  {data?.pendingRefundsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 bg-[#090B12]/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E7B65B]/20 border border-[#E7B65B]/40 flex items-center justify-center text-xs font-bold text-[#E7B65B]">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#F5F5F7] truncate">{user.username}</p>
            <p className="text-[10px] font-mono text-[#E7B65B] truncate">
              {user.adminRole || 'SUPER_ADMIN'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5">
      <div className="flex gap-6 items-start">
        {/* Desktop Deep Navy Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 bg-[#111522] border border-white/10 rounded-2xl sticky top-20 h-[calc(100vh-6.5rem)] overflow-hidden">
          {renderSidebarContent()}
        </aside>

        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="w-72 bg-[#111522] border-r border-white/10 h-full">
              {renderSidebarContent()}
            </div>
            <div className="flex-1 bg-black/70" onClick={() => setMobileNavOpen(false)} />
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Top Breadcrumb & Controls */}
          <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#F5F5F7]"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#F5F5F7]/45 font-mono">ADMIN</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#F5F5F7]/30" />
                <span className="font-mono text-[#E7B65B]">{activeNav.num}</span>
                <span className="font-display font-bold text-[#F5F5F7] text-sm sm:text-base">
                  {activeNav.label[lang]}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModule('moderation')}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7]/80 hover:border-[#E7B65B]/40"
              >
                <Bell className="w-3.5 h-3.5 text-[#E7B65B]" />
                <span className="font-mono">{openAlertsCount}</span>
              </button>
              <button
                onClick={load}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F5F7]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{lang === 'uz' ? 'Yangilash' : 'Обновить'}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="glass-panel rounded-2xl p-4 border border-[#E63946]/40 text-xs text-[#E63946]">
              {error}
            </div>
          )}

          {loading && !data ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-xs text-[#F5F5F7]/60">
              {lang === 'uz' ? 'Yuklanmoqda...' : 'Загрузка...'}
            </div>
          ) : (
            data && (
              <>
                {(activeModule === 'dashboard' || activeModule === 'analytics') && (
                  <AdminDashboardAnalytics
                    mode={activeModule}
                    data={data}
                    token={token!}
                    lang={lang}
                    onRefresh={load}
                  />
                )}

                {(activeModule === 'users' || activeModule === 'moderation') && (
                  <AdminUsersModeration
                    mode={activeModule}
                    data={data}
                    token={token!}
                    lang={lang}
                    onReload={load}
                    showToast={showToast}
                  />
                )}

                {(activeModule === 'vip' || activeModule === 'shop' || activeModule === 'payments') && (
                  <AdminEconomyPanel
                    data={data}
                    token={token!}
                    lang={lang}
                    onReload={load}
                    showToast={showToast}
                    initialTab={
                      activeModule === 'vip' ? 'vip' : activeModule === 'payments' ? 'orders' : 'products'
                    }
                  />
                )}

                {(activeModule === 'rooms' || activeModule === 'roles' || activeModule === 'tournaments') && (
                  <AdminGameplayModules
                    moduleId={activeModule}
                    data={data}
                    token={token!}
                    lang={lang}
                    onRefresh={load}
                    showToast={showToast}
                  />
                )}

                {(activeModule === 'notifications' || activeModule === 'promos' || activeModule === 'settings') && (
                  <AdminCommsSettings
                    moduleId={activeModule}
                    data={data}
                    token={token!}
                    lang={lang}
                    onRefresh={load}
                    showToast={showToast}
                  />
                )}

                {(activeModule === 'admins' || activeModule === 'system') && (
                  <AdminSecuritySystem
                    moduleId={activeModule}
                    data={data}
                    token={token!}
                    lang={lang}
                    onRefresh={load}
                    showToast={showToast}
                  />
                )}
              </>
            )
          )}
        </main>
      </div>
    </div>
  );
};
