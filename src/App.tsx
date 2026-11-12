import React from 'react';
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

const MainShell: React.FC = () => {
  const { page, user } = useApp();
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
