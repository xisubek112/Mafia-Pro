import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { CinematicEnvironment } from './components/CinematicEnvironment';
import { Navbar, OfflineIndicator } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateRoomPage, JoinRoomPage, LobbyPage } from './pages/RoomPages';
import { GamePage } from './pages/GamePage';
import {
  AdminPage,
  HistoryPage,
  LeaderboardPage,
  ProfilePage,
  RolesPage,
  SettingsPage,
} from './pages/SecondaryPages';
import { StorePage } from './pages/StorePage';
import { InventoryPage } from './pages/InventoryPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { RewardsPage } from './pages/RewardsPage';
import { SocialPage } from './pages/SocialPage';
import { AiSupportModal } from './components/AiSupportModal';
import { Bot } from 'lucide-react';

const MainShell: React.FC = () => {
  const { page, user, lang } = useApp();
  const [showAiSupport, setShowAiSupport] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="relative min-h-screen text-[#F5F5F7]">
      <CinematicEnvironment />
      <Navbar />
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={isAdmin ? (page === 'settings' ? 'settings' : 'admin') : page}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {isAdmin ? (
              page === 'settings' ? <SettingsPage /> : <AdminPage />
            ) : (
              <>
                {page === 'landing' && <LandingPage />}
                {page === 'auth' && <AuthPage />}
                {page === 'dashboard' && <DashboardPage />}
                {page === 'create_room' && <CreateRoomPage />}
                {page === 'join_room' && <JoinRoomPage />}
                {page === 'lobby' && <LobbyPage />}
                {page === 'game' && <GamePage />}
                {page === 'roles' && <RolesPage />}
                {page === 'profile' && <ProfilePage />}
                {page === 'leaderboard' && <LeaderboardPage />}
                {page === 'history' && <HistoryPage />}
                {page === 'settings' && <SettingsPage />}
                {page === 'admin' && <AdminPage />}
                {page === 'store' && <StorePage />}
                {page === 'inventory' && <InventoryPage />}
                {page === 'tournaments' && <TournamentsPage />}
                {page === 'rewards' && <RewardsPage />}
                {page === 'social' && <SocialPage />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating AI Support & Knowledge Base Assistant Button */}
      {page !== 'game' && (
        <button
          onClick={() => setShowAiSupport(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#E63946] via-[#B91C1C] to-[#E7B65B] text-white shadow-xl shadow-red-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 text-xs font-black border border-white/20"
        >
          <Bot className="w-4 h-4 text-amber-200 animate-pulse" />
          <span className="hidden sm:inline">
            {lang === 'uz' ? 'AI Yordamchi & Qoidalar' : 'AI Помощник и База'}
          </span>
        </button>
      )}

      <AiSupportModal isOpen={showAiSupport} onClose={() => setShowAiSupport(false)} />
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}
