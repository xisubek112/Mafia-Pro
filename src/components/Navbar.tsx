import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Download,
  Home,
  LayoutDashboard,
  PlusSquare,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import { PageRoute, useApp } from '../context/AppContext';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { lang } = useApp();

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-[#E7B65B] px-4 py-2 text-xs font-semibold text-[#090B12] hover:bg-[#E7B65B]/90 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-4 h-4" />
        {compact ? 'PWA' : lang === 'uz' ? 'Ilovani o‘rnatish' : 'Установить'}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-[#F5F5F7] hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          iOS PWA
        </button>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="glass-panel-elevated w-full max-w-sm rounded-2xl p-6">
              <h3 className="text-lg font-bold text-[#F5F5F7]">
                {lang === 'uz' ? 'iPhone / iPad ga o‘rnatish' : 'Установка на iPhone / iPad'}
              </h3>
              <p className="mt-2 text-sm text-[#F5F5F7]/75 leading-relaxed">
                {lang === 'uz'
                  ? '1. Safari panelidagi Ulashish (Share) tugmasini bosing. 2. "Bosh ekranga qo‘shish" bandini tanlang.'
                  : '1. Нажмите кнопку «Поделиться» в Safari. 2. Выберите «На экран Домой».'}
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-[#E63946] py-2.5 text-sm font-semibold text-white"
              >
                {lang === 'uz' ? 'Tushunarli' : 'Понятно'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { lang } = useApp();
  if (isOnline) return null;
  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#E63946] px-3 py-2 text-xs font-semibold text-white shadow-lg">
      {lang === 'uz' ? 'Oflayn rejim — internet aloqasi yo‘q' : 'Офлайн режим — нет сети'}
    </div>
  );
};

export const Navbar: React.FC = () => {
  const { page, navigate, t, lang, user, roomState, logout } = useApp();

  const isAdmin = user?.role === 'ADMIN';
  const isInGame = page === 'game' || page === 'lobby';

  const navLinks: { id: PageRoute; label: string }[] = isAdmin
    ? [
        { id: 'admin', label: t.nav.admin },
        { id: 'settings', label: t.nav.settings },
      ]
    : [
        { id: user ? 'dashboard' : 'landing', label: user ? t.nav.dashboard : t.nav.home },
        { id: 'roles', label: t.nav.roles },
        { id: 'leaderboard', label: t.nav.leaderboard },
        { id: 'tournaments', label: t.nav.tournaments },
        { id: 'store', label: t.nav.store },
        ...(user ? [{ id: 'inventory' as PageRoute, label: lang === 'uz' ? 'Inventar' : 'Инвентарь' }] : []),
      ];

  const primaryAction = () => {
    if (isAdmin) {
      logout();
      return;
    }
    if (roomState) {
      navigate(roomState.phase === 'LOBBY' ? 'lobby' : 'game');
    } else if (user) {
      navigate('create_room');
    } else {
      navigate('auth');
    }
  };

  const primaryLabel = isAdmin
    ? t.nav.logout
    : roomState
      ? roomState.code
      : user
        ? t.nav.createRoom
        : t.nav.login;

  return (
    <>
      {/* Desktop & Mobile Top Bar (strict 3-zone contract) */}
      <header className="sticky top-0 z-40 h-14 border-b border-white/10 bg-[#090B12]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => navigate(isAdmin ? 'admin' : user ? 'dashboard' : 'landing')}
            className="font-display text-lg font-extrabold tracking-tight text-[#F5F5F7] hover:text-[#E7B65B] transition-colors whitespace-nowrap shrink-0"
          >
            {isAdmin ? 'MAFIA PRO ADMIN' : 'MAFIA PRO'}
          </button>

          {/* Zone 2: 4-5 Concise Single-Line Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#F5F5F7]/70">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F5F5F7] ${
                  page === item.id ? 'text-[#F5F5F7] underline underline-offset-8 decoration-[#E63946] decoration-2' : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={primaryAction}
              className="px-4 py-2 rounded-lg bg-[#E63946] text-xs font-semibold text-white hover:bg-[#E63946]/90 transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (hidden inside active game/lobby to preserve screen space) */}
      {!isInGame && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090B12]/95 backdrop-blur-lg border-t border-white/10 pb-safe">
          {isAdmin ? (
            <div className="grid grid-cols-2 h-16 items-center">
              <button
                onClick={() => navigate('admin')}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  page === 'admin' ? 'text-[#E63946]' : 'text-[#F5F5F7]/60'
                }`}
              >
                <Shield className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1 truncate max-w-[90px]">
                  {t.nav.admin}
                </span>
              </button>
              <button
                onClick={() => navigate('settings')}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  page === 'settings' ? 'text-[#E63946]' : 'text-[#F5F5F7]/60'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1 truncate max-w-[90px]">
                  {t.nav.settings}
                </span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-5 h-16 items-center">
              <button
                onClick={() => navigate(user ? 'dashboard' : 'landing')}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  page === 'dashboard' || page === 'landing' ? 'text-[#E63946]' : 'text-[#F5F5F7]/60'
                }`}
              >
                {user ? <LayoutDashboard className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                <span className="text-[10px] font-medium mt-1 truncate max-w-[60px]">
                  {user ? t.nav.dashboard : t.nav.home}
                </span>
              </button>

              <button
                onClick={() => navigate('create_room')}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  page === 'create_room' || page === 'join_room' ? 'text-[#E63946]' : 'text-[#F5F5F7]/60'
                }`}
              >
                <PlusSquare className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1 truncate max-w-[60px]">
                  {t.nav.createRoom}
                </span>
              </button>

              <button
                onClick={() => navigate('roles')}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  page === 'roles' ? 'text-[#E63946]' : 'text-[#F5F5F7]/60'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1 truncate max-w-[60px]">
                  {t.nav.roles}
                </span>
              </button>

              <button
                onClick={() => navigate('leaderboard')}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  page === 'leaderboard' ? 'text-[#E63946]' : 'text-[#F5F5F7]/60'
                }`}
              >
                <Award className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1 truncate max-w-[60px]">
                  {t.nav.leaderboard}
                </span>
              </button>

              <button
                onClick={() => navigate(user ? 'profile' : 'settings')}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  page === 'profile' || page === 'settings'
                    ? 'text-[#E63946]'
                    : 'text-[#F5F5F7]/60'
                }`}
              >
                {user ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Settings className="w-5 h-5" />
                )}
                <span className="text-[10px] font-medium mt-1 truncate max-w-[60px]">
                  {user ? t.nav.profile : t.nav.settings}
                </span>
              </button>
            </div>
          )}
        </nav>
      )}
    </>
  );
};
