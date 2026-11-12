import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Moon, Skull, Sun, Vote } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePhaseTransition } from '../hooks/usePhaseTransition';
import { ROLES } from '../shared/roles';
import { RoleId } from '../shared/types';

export const PhaseTransitions: React.FC = () => {
  const { roomState, page, lang, soundEnabled, uiVolume, ambientVolume } = useApp();

  const { overlay, dismissOverlay } = usePhaseTransition({
    roomState,
    inGame: page === 'game',
    lang,
    soundEnabled,
    uiVolume,
    ambientVolume,
    getRoleName: (r) => ROLES[r as RoleId]?.name[lang] || r,
  });

  return (
    <AnimatePresence>
      {overlay && (
        <motion.div
          key={`${overlay.kind}-${overlay.title}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          onClick={dismissOverlay}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 cursor-pointer"
          style={{
            background:
              overlay.kind === 'NIGHT'
                ? 'radial-gradient(circle at 50% 40%, rgba(139,92,246,0.22), rgba(5,7,17,0.92) 70%)'
                : overlay.kind === 'DAWN'
                  ? 'radial-gradient(circle at 50% 60%, rgba(245,158,11,0.34), rgba(23,27,42,0.9) 72%)'
                  : 'radial-gradient(circle at 50% 50%, rgba(230,57,70,0.34), rgba(9,11,18,0.92) 70%)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -12, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-lg"
          >
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/15 bg-black/40">
              {overlay.kind === 'NIGHT' && <Moon className="w-8 h-8 text-[#A5B4FC]" />}
              {overlay.kind === 'DAWN' && <Sun className="w-8 h-8 text-[#FCD34D]" />}
              {overlay.kind === 'VOTING' && <Vote className="w-8 h-8 text-[#E63946]" />}
              {overlay.kind === 'ELIMINATION' && <Skull className="w-8 h-8 text-[#E63946]" />}
            </div>

            <h2
              className={`font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-balance ${
                overlay.kind === 'DAWN'
                  ? 'text-[#FFF7ED]'
                  : overlay.kind === 'NIGHT'
                    ? 'text-[#A5B4FC]'
                    : 'text-[#F5F5F7]'
              }`}
            >
              {overlay.title}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#F5F5F7]/80">{overlay.subtitle}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
