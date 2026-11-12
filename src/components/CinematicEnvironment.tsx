import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { usePhaseTransition } from '../hooks/usePhaseTransition';
import { ROLES } from '../shared/roles';
import { RoleId } from '../shared/types';

export const CinematicEnvironment: React.FC = () => {
  const { roomState, page, lang, soundEnabled, uiVolume, ambientVolume, rainEnabled } = useApp();

  const { environmentMode } = usePhaseTransition({
    roomState,
    inGame: page === 'game',
    lang,
    soundEnabled,
    uiVolume,
    ambientVolume,
    getRoleName: (r) => ROLES[r as RoleId]?.name[lang] || r,
  });

  const isNight = environmentMode === 'NIGHT';
  const isDawn = environmentMode === 'DAWN';
  const isDaytime = environmentMode === 'DAYTIME';
  const isVoting = environmentMode === 'VOTING';
  const isVictory = environmentMode === 'VICTORY';

  const stars = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        id: i,
        left: `${(i * 31 + 5) % 98}%`,
        top: `${(i * 19 + 3) % 55}%`,
        size: (i % 3) + 1.5,
        delay: `${(i * 0.4) % 4}s`,
      })),
    []
  );

  const raindrops = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${(i * 17 + 3) % 98}%`,
        delay: `${(i * 0.19) % 1.3}s`,
        duration: `${1.0 + (i % 3) * 0.18}s`,
      })),
    []
  );

  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${(i * 39 + 9) % 95}%`,
        bottom: `${(i * 17 + 5) % 48}%`,
        delay: `${(i * 0.65) % 6}s`,
        duration: `${7 + (i % 4)}s`,
      })),
    []
  );

  const distantTowers = useMemo(
    () => [
      { x: 0, w: 68, h: 120 },
      { x: 64, w: 84, h: 168 },
      { x: 144, w: 56, h: 105 },
      { x: 196, w: 92, h: 192 },
      { x: 284, w: 74, h: 148 },
      { x: 354, w: 104, h: 210 },
      { x: 454, w: 64, h: 130 },
      { x: 514, w: 88, h: 178 },
      { x: 598, w: 72, h: 140 },
      { x: 666, w: 98, h: 200 },
      { x: 760, w: 66, h: 128 },
      { x: 822, w: 92, h: 184 },
      { x: 910, w: 78, h: 152 },
      { x: 984, w: 44, h: 112 },
    ],
    []
  );

  const foregroundBuildings = useMemo(
    () => [
      { w: 54, h: 112, x: 0, spire: false, windows: [18, 44, 76] },
      { w: 72, h: 162, x: 52, spire: true, windows: [22, 54, 88, 120] },
      { w: 48, h: 98, x: 120, spire: false, windows: [20, 56] },
      { w: 86, h: 194, x: 164, spire: true, windows: [26, 62, 98, 134, 162] },
      { w: 62, h: 132, x: 246, spire: false, windows: [24, 60, 96] },
      { w: 94, h: 212, x: 304, spire: true, windows: [30, 68, 106, 144, 174] },
      { w: 58, h: 120, x: 394, spire: false, windows: [22, 58, 90] },
      { w: 78, h: 170, x: 448, spire: false, windows: [24, 64, 104, 136] },
      { w: 66, h: 136, x: 522, spire: false, windows: [20, 56, 92] },
      { w: 90, h: 196, x: 584, spire: true, windows: [28, 66, 104, 142] },
      { w: 60, h: 126, x: 670, spire: false, windows: [22, 58, 94] },
      { w: 84, h: 176, x: 726, spire: false, windows: [24, 60, 96, 134] },
      { w: 70, h: 146, x: 806, spire: false, windows: [26, 66, 106] },
      { w: 96, h: 202, x: 872, spire: true, windows: [30, 70, 110, 150] },
      { w: 64, h: 122, x: 964, spire: false, windows: [24, 62] },
    ],
    []
  );

  const skyBackground = isNight
    ? 'linear-gradient(180deg, #050711 0%, #0A1020 58%, #1A0B1B 100%)'
    : isDawn
      ? 'linear-gradient(180deg, #171B2A 0%, #4C1D95 36%, #EA580C 74%, #FCD34D 100%)'
      : isDaytime
        ? 'linear-gradient(180deg, #1E293B 0%, #334155 54%, #64748B 100%)'
        : isVoting
          ? 'linear-gradient(180deg, #0B0710 0%, #240A16 62%, #3A0E1B 100%)'
          : 'linear-gradient(180deg, #060812 0%, #0D1326 65%, #151428 100%)';

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none transition-all duration-[1800ms]"
      style={{ background: skyBackground }}
    >
      {/* Ambient Lighting */}
      <motion.div
        animate={{ opacity: isNight || isVoting ? 0.95 : isDawn ? 0.8 : 0.6 }}
        transition={{ duration: 1.4 }}
        className="absolute inset-0"
        style={{
          backgroundImage: isNight
            ? 'radial-gradient(ellipse 65% 45% at 80% 16%, rgba(165, 180, 252, 0.2), transparent 65%), radial-gradient(ellipse 55% 40% at 18% 82%, rgba(230, 57, 70, 0.16), transparent 65%)'
            : isVoting
              ? 'radial-gradient(ellipse 75% 55% at 50% 40%, rgba(230, 57, 70, 0.26), transparent 70%)'
              : isDawn
                ? 'radial-gradient(ellipse 75% 50% at 50% 82%, rgba(252, 211, 77, 0.32), transparent 70%)'
                : isDaytime
                  ? 'radial-gradient(ellipse 60% 45% at 75% 22%, rgba(252, 211, 77, 0.22), transparent 65%)'
                  : 'radial-gradient(ellipse 65% 45% at 80% 16%, rgba(165, 180, 252, 0.12), transparent 65%), radial-gradient(ellipse 55% 40% at 15% 80%, rgba(230, 57, 70, 0.1), transparent 65%)',
        }}
      />

      {/* Twinkling Stars */}
      <motion.div
        animate={{ opacity: isDawn || isDaytime ? 0 : isNight ? 1 : 0.55 }}
        transition={{ duration: 1.4 }}
        className="absolute inset-0"
      >
        {stars.map((s) => (
          <span
            key={s.id}
            className="absolute rounded-full bg-[#E0E7FF] animate-star-twinkle"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
            }}
          />
        ))}
      </motion.div>

      {/* Large Clearly Visible Glowing Moon + Clouds Crossing Moon */}
      <motion.div
        animate={{
          y: isNight ? 0 : isDawn || isDaytime ? 160 : -10,
          opacity: isNight ? 1 : isDawn || isDaytime ? 0 : 0.6,
          scale: isNight ? 1 : 0.88,
        }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-12 right-[8%] sm:right-[12%]"
      >
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-[#FFFFFF] via-[#C7D2FE] to-[#6366F1]/85 shadow-[0_0_90px_rgba(165,180,252,0.55)]">
          <div className="absolute top-6 left-7 w-6 h-6 rounded-full bg-[#4338CA]/18" />
          <div className="absolute bottom-7 right-8 w-8 h-8 rounded-full bg-[#4338CA]/15" />
          <div className="absolute top-14 right-6 w-4 h-4 rounded-full bg-[#4338CA]/15" />
        </div>
        {/* Animated clouds moving across the moon */}
        <svg
          viewBox="0 0 260 80"
          className="animate-cloud-slow absolute top-10 -left-14 w-56 sm:w-64 opacity-70"
        >
          <path
            d="M18 65 Q40 28 82 40 Q112 10 156 32 Q196 22 222 48 Q246 50 248 68 Z"
            fill="#0A1020"
          />
        </svg>
      </motion.div>

      {/* Spectacular Sunrise / Daytime Sun + Sunlight Rays */}
      <motion.div
        animate={{
          y: isDawn ? 18 : isDaytime ? -115 : 190,
          opacity: isDawn ? 1 : isDaytime ? 0.8 : 0,
        }}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center justify-center"
      >
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full animate-sun-rays opacity-45"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgba(252,211,77,0.55) 18deg, transparent 36deg, transparent 72deg, rgba(245,158,11,0.45) 90deg, transparent 108deg, transparent 144deg, rgba(252,211,77,0.5) 162deg, transparent 180deg, transparent 216deg, rgba(245,158,11,0.45) 234deg, transparent 252deg, transparent 288deg, rgba(252,211,77,0.5) 306deg, transparent 324deg)',
            }}
          />
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-t from-[#EA580C] via-[#FCD34D] to-[#FFF7ED] shadow-[0_0_110px_rgba(245,158,11,0.75)]" />
        </div>
      </motion.div>

      {/* Dawn & Daytime Animated Clouds */}
      <motion.div
        animate={{ opacity: isDawn || isDaytime ? 0.75 : 0 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-x-0 top-10 h-44 overflow-hidden"
      >
        <svg viewBox="0 0 260 80" className="animate-cloud-slow absolute left-[6%] top-4 w-56 opacity-45">
          <path d="M18 65 Q40 28 82 40 Q112 10 156 32 Q196 22 222 48 Q246 50 248 68 Z" fill="#FFF7ED" />
        </svg>
        <svg viewBox="0 0 260 80" className="animate-cloud-slow absolute right-[8%] top-16 w-64 opacity-35">
          <path d="M18 65 Q40 28 82 40 Q112 10 156 32 Q196 22 222 48 Q246 50 248 68 Z" fill="#FCD34D" />
        </svg>
      </motion.div>

      {/* Subtle Atmospheric Rain */}
      {isNight && rainEnabled && (
        <div className="absolute inset-0 overflow-hidden">
          {raindrops.map((r) => (
            <span
              key={r.id}
              className="animate-rain-fall absolute top-0 w-[1.5px] h-11 bg-gradient-to-b from-transparent via-[#A5B4FC]/50 to-transparent"
              style={{
                left: r.left,
                animationDelay: r.delay,
                animationDuration: r.duration,
              }}
            />
          ))}
        </div>
      )}

      {/* Distant Parallax City Layer */}
      <div className="absolute inset-x-0 bottom-0 h-48 sm:h-56 opacity-60">
        <svg viewBox="0 0 1024 220" preserveAspectRatio="none" className="w-full h-full">
          {distantTowers.map((t, idx) => (
            <rect
              key={idx}
              x={t.x}
              y={220 - t.h}
              width={t.w}
              height={t.h}
              fill={isDawn || isDaytime ? '#293047' : '#0B1124'}
            />
          ))}
        </svg>
      </div>

      {/* Multi-Layered Dynamic Fog Bands (Intensify in Night, Dissipate in Dawn) */}
      <div className="absolute inset-x-0 bottom-4 h-64 overflow-hidden pointer-events-none">
        {/* Layer 1: High-altitude slow mist */}
        <motion.div
          animate={{ opacity: isDaytime ? 0 : isDawn ? 0.16 : isNight ? 0.72 : 0.38 }}
          transition={{ duration: isDawn ? 3.2 : 2.2, ease: 'easeInOut' }}
          className="animate-fog-slow absolute -left-20 bottom-20 w-[135%] h-32"
          style={{
            background: isVoting
              ? 'linear-gradient(90deg, transparent, rgba(230,57,70,0.22), rgba(139,92,246,0.1), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(165,180,252,0.14), rgba(139,92,246,0.18), transparent)',
          }}
        />
        {/* Layer 2: Mid-altitude faster drifting fog */}
        <motion.div
          animate={{ opacity: isDaytime ? 0 : isDawn ? 0.12 : isNight ? 0.85 : 0.45 }}
          transition={{ duration: isDawn ? 2.8 : 2.0, ease: 'easeInOut' }}
          className="animate-fog-mid absolute -left-12 bottom-10 w-[130%] h-28"
          style={{
            background: isVoting
              ? 'linear-gradient(90deg, transparent, rgba(230,57,70,0.18), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), rgba(165,180,252,0.12), transparent)',
          }}
        />
        {/* Layer 3: Low street-level reverse-drifting dense fog */}
        <motion.div
          animate={{ opacity: isDaytime ? 0 : isDawn ? 0.08 : isNight ? 0.9 : 0.5 }}
          transition={{ duration: isDawn ? 2.5 : 1.8, ease: 'easeInOut' }}
          className="animate-fog-reverse absolute -right-20 bottom-0 w-[135%] h-24"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(10,16,32,0.82), rgba(26,16,40,0.55), transparent)',
          }}
        />
      </div>

      {/* Detailed Foreground City Skyline with Camera Pan & Distant Red Lights */}
      <div className="animate-camera-pan absolute inset-x-0 bottom-0 h-44 sm:h-56 opacity-95">
        <svg viewBox="0 0 1024 220" preserveAspectRatio="none" className="w-full h-full">
          {foregroundBuildings.map((b, idx) => (
            <g key={idx}>
              <rect
                x={b.x}
                y={220 - b.h}
                width={b.w}
                height={b.h}
                fill={isDawn || isDaytime ? '#161C2E' : '#050711'}
              />
              {b.spire && (
                <>
                  <line
                    x1={b.x + b.w / 2}
                    y1={220 - b.h}
                    x2={b.x + b.w / 2}
                    y2={220 - b.h - 14}
                    stroke="#334155"
                    strokeWidth="2"
                  />
                  {!isDawn && !isDaytime && (
                    <circle
                      cx={b.x + b.w / 2}
                      cy={220 - b.h - 15}
                      r="2.8"
                      fill="#E63946"
                      opacity={0.95}
                    />
                  )}
                </>
              )}
              {!isDawn && !isDaytime && idx % 3 === 1 && (
                <rect
                  x={b.x + 8}
                  y={220 - b.h + 4}
                  width={b.w - 16}
                  height={2.5}
                  fill="#E63946"
                  opacity={0.85}
                />
              )}
              {b.windows.map((wy, wIdx) => (
                <g key={wIdx}>
                  <rect
                    x={b.x + 12}
                    y={220 - b.h + wy}
                    width={8}
                    height={10}
                    rx={1}
                    fill={isDawn || isDaytime ? '#FCD34D' : wIdx % 2 === 0 ? '#E7B65B' : '#A5B4FC'}
                    opacity={isDawn || isDaytime ? 0.3 : 0.55}
                  />
                  <rect
                    x={b.x + b.w - 22}
                    y={220 - b.h + wy + 4}
                    width={8}
                    height={10}
                    rx={1}
                    fill={isDawn || isDaytime ? '#F59E0B' : '#E7B65B'}
                    opacity={isDawn || isDaytime ? 0.24 : 0.4}
                  />
                </g>
              ))}
            </g>
          ))}
        </svg>
      </div>

      {/* Subtle Environmental Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.id}
            className={`absolute w-1.5 h-1.5 rounded-full animate-particle-rise ${
              isDawn || isDaytime || (isVictory && roomState?.winnerTeam === 'TOWN')
                ? 'bg-[#FCD34D]/70'
                : isVoting || (isVictory && roomState?.winnerTeam === 'MAFIA')
                  ? 'bg-[#E63946]/70'
                  : 'bg-[#A5B4FC]/55'
            }`}
            style={{
              left: p.left,
              bottom: p.bottom,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>
    </div>
  );
};
