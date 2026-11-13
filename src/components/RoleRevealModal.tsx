import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { ROLES } from '../shared/roles';
import { RARITY_LABELS, ROLE_VISUALS } from '../shared/roleCards';
import { playTone } from '../utils/sound';
import { RoleCard } from './RoleCard';
import cardBackImg from '../assets/images/mafia_card_back_1794372514453.jpg';

export const RoleRevealModal: React.FC = () => {
  const { roomState, page, lang, t, soundEnabled, uiVolume, ambientVolume, roleConfigs } = useApp();
  const [visible, setVisible] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const revealedRoundRef = useRef<string | null>(null);

  const myRoleId = roomState?.myPrivateData?.roleId;
  const phase = roomState?.phase;
  const roomCode = roomState?.code;

  useEffect(() => {
    if (page !== 'game' || !roomState || !myRoleId || !roomCode) {
      setVisible(false);
      return;
    }

    const key = `${roomCode}:${roomState.round}:${myRoleId}`;
    if (phase === 'ROLE_ASSIGNMENT' && revealedRoundRef.current !== key) {
      revealedRoundRef.current = key;
      setFlipped(false);
      setVisible(true);

      const sOpts = { enabled: soundEnabled, uiVolume, ambientVolume };
      const flipTimer = setTimeout(() => {
        setFlipped(true);
        const team = ROLES[myRoleId].team;
        playTone(team === 'MAFIA' ? 'night' : team === 'TOWN' ? 'day' : 'victory', sOpts);
      }, 650);

      const closeTimer = setTimeout(() => {
        setVisible(false);
      }, 4200);

      return () => {
        clearTimeout(flipTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [page, roomState, phase, myRoleId, roomCode, soundEnabled, uiVolume, ambientVolume]);

  if (!myRoleId) return null;

  const spec = ROLE_VISUALS[myRoleId];
  const role = ROLES[myRoleId];
  const rarity = RARITY_LABELS[spec.rarity];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-mono tracking-widest uppercase mb-4"
            style={{ color: rarity.color }}
          >
            {lang === 'uz' ? 'SIZNING MAXFIY ROLINGIZ' : 'ВАША СЕКРЕТНАЯ РОЛЬ'}
          </motion.p>

          <div className="w-full max-w-xs" style={{ perspective: 1200 }}>
            <AnimatePresence mode="wait">
              {!flipped ? (
                <motion.div
                  key="back"
                  initial={{ rotateY: 0, scale: 0.9 }}
                  animate={{ rotateY: 0, scale: 1 }}
                  exit={{ rotateY: 90, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl overflow-hidden border border-[#E7B65B]/50 aspect-[3/4] shadow-[0_0_50px_rgba(231,182,91,0.28)]"
                >
                  <img
                    src={cardBackImg}
                    alt="Role Card Back"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="front"
                  initial={{ rotateY: -90, scale: 0.95 }}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  style={{ boxShadow: `0 0 60px ${spec.glowColor}` }}
                  className="rounded-2xl"
                >
                  <RoleCard
                    roleId={myRoleId}
                    lang={lang}
                    teamLabel={t.game.teams[role.team]}
                    abilityLabel={t.rolesPage.ability}
                    roleConfigs={roleConfigs}
                    compact
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setVisible(false)}
            className="mt-6 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-[#F5F5F7] transition-colors"
          >
            {lang === 'uz' ? 'O‘tkazib yuborish' : 'Пропустить'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
