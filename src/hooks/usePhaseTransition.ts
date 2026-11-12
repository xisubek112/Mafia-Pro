import { useEffect, useMemo, useRef, useState } from 'react';
import { GamePhase, PublicPlayerView, RoomStateView } from '../shared/types';
import { playTone } from '../utils/sound';

export type EnvironmentMode = 'LOBBY' | 'NIGHT' | 'DAWN' | 'DAYTIME' | 'VOTING' | 'VICTORY';

export interface PhaseTransitionOverlay {
  kind: 'NIGHT' | 'DAWN' | 'VOTING' | 'ELIMINATION';
  title: string;
  subtitle: string;
  eliminatedPlayer?: PublicPlayerView;
  durationMs: number;
}

export function resolveEnvironmentMode(
  phase: GamePhase | undefined,
  inGame: boolean,
  isDawnWindow: boolean
): EnvironmentMode {
  if (!inGame || !phase || phase === 'LOBBY' || phase === 'ROLE_ASSIGNMENT' || phase === 'NEW_GAME') {
    return 'LOBBY';
  }
  if (phase === 'NIGHT') return 'NIGHT';
  if (phase === 'DAY') return isDawnWindow ? 'DAWN' : 'DAYTIME';
  if (phase === 'DISCUSSION') return 'DAYTIME';
  if (phase === 'VOTING' || phase === 'EXECUTION') return 'VOTING';
  if (phase === 'VICTORY') return 'VICTORY';
  return 'LOBBY';
}

interface UsePhaseTransitionOptions {
  roomState: RoomStateView | null;
  inGame: boolean;
  lang: 'uz' | 'ru';
  soundEnabled: boolean;
  uiVolume: number;
  ambientVolume: number;
  getRoleName: (roleId: string) => string;
}

export function usePhaseTransition({
  roomState,
  inGame,
  lang,
  soundEnabled,
  uiVolume,
  ambientVolume,
  getRoleName,
}: UsePhaseTransitionOptions) {
  const [overlay, setOverlay] = useState<PhaseTransitionOverlay | null>(null);
  const [isDawnWindow, setIsDawnWindow] = useState(false);

  const prevPhaseRef = useRef<GamePhase | null>(null);
  const knownDeadIdsRef = useRef<Set<string>>(new Set());

  const phase = roomState?.phase;
  const phaseEndsAt = roomState?.phaseEndsAt;

  // Synchronize Dawn -> Daytime window with server phase timestamps
  useEffect(() => {
    if (!inGame || phase !== 'DAY') {
      setIsDawnWindow(false);
      return;
    }

    // Check remaining time vs typical day duration so late-joining/reconnecting clients stay synced
    const remainingMs = phaseEndsAt ? Math.max(0, phaseEndsAt - Date.now()) : 4000;
    const dawnDuration = Math.min(3600, remainingMs);
    if (dawnDuration <= 400) {
      setIsDawnWindow(false);
      return;
    }

    setIsDawnWindow(true);
    const t = setTimeout(() => setIsDawnWindow(false), dawnDuration);
    return () => clearTimeout(t);
  }, [inGame, phase, phaseEndsAt]);

  useEffect(() => {
    if (!inGame || !roomState) {
      prevPhaseRef.current = null;
      knownDeadIdsRef.current = new Set();
      setOverlay(null);
      return;
    }

    const currentDead = roomState.players.filter((p) => !p.isAlive && !p.isSpectator);
    const newlyDead = currentDead.find((p) => !knownDeadIdsRef.current.has(p.id));
    for (const d of currentDead) {
      knownDeadIdsRef.current.add(d.id);
    }

    const prevPhase = prevPhaseRef.current;
    if (prevPhase !== roomState.phase) {
      prevPhaseRef.current = roomState.phase;
      const sOpts = { enabled: soundEnabled, uiVolume, ambientVolume };

      if (newlyDead && (roomState.phase === 'DAY' || roomState.phase === 'EXECUTION')) {
        playTone('elimination', sOpts);
        setOverlay({
          kind: 'ELIMINATION',
          title:
            lang === 'uz'
              ? `${newlyDead.username} halok bo‘ldi`
              : `${newlyDead.username} выбывает из игры`,
          subtitle: newlyDead.revealedRoleId
            ? getRoleName(newlyDead.revealedRoleId)
            : lang === 'uz'
              ? 'Rol sir saqlandi'
              : 'Роль скрыта',
          eliminatedPlayer: newlyDead,
          durationMs: 3200,
        });
      } else if (roomState.phase === 'NIGHT') {
        playTone('wind', sOpts);
        if (Math.random() > 0.45) playTone('thunder', sOpts);
        setOverlay({
          kind: 'NIGHT',
          title: lang === 'uz' ? 'TUN KIRIB KELMOQDA' : 'НАСТУПАЕТ НОЧЬ',
          subtitle:
            lang === 'uz'
              ? 'Shahar uyquga ketadi. Mafiya uyg‘onadi.'
              : 'Город засыпает. Просыпается мафия.',
          durationMs: 3500,
        });
      } else if (roomState.phase === 'DAY') {
        playTone('sunrise_ambience', sOpts);
        setOverlay({
          kind: 'DAWN',
          title: lang === 'uz' ? 'QUYOSH CHIQMOQDA' : 'ВОСХОТ СОЛНЦА',
          subtitle:
            lang === 'uz'
              ? 'Yangi tong otmoqda. Tungi voqealar oshkor bo‘ladi.'
              : 'Наступает новый день. Итоги ночи раскрыты.',
          durationMs: 3500,
        });
      } else if (roomState.phase === 'DISCUSSION') {
        setOverlay({
          kind: 'DAWN',
          title: lang === 'uz' ? 'KUNDUZGI MUHOKAMA' : 'ДНЕВНОЕ ОБСУЖДЕНИЕ',
          subtitle:
            lang === 'uz'
              ? 'Dalillarni tahlil qiling va shubhalilarni aniqlang.'
              : 'Обсудите улики и найдите мафию.',
          durationMs: 2000,
        });
      } else if (roomState.phase === 'VOTING') {
        setOverlay({
          kind: 'VOTING',
          title: lang === 'uz' ? 'OVOZ BERISH BOSHLANDI' : 'НАЧАЛО ГОЛОСОВАНИЯ',
          subtitle:
            lang === 'uz'
              ? 'Shubhali o‘yinchini tanlang va hukm chiqaring.'
              : 'Выберите подозреваемого и вынесите приговор.',
          durationMs: 2000,
        });
      } else if (roomState.phase === 'VICTORY') {
        setOverlay({
          kind: 'VOTING',
          title:
            lang === 'uz'
              ? `G‘ALABA — ${roomState.winnerTeam}`
              : `ПОБЕДА — ${roomState.winnerTeam}`,
          subtitle:
            lang === 'uz'
              ? 'O‘yin yakunlandi!'
              : 'Партия завершена!',
          durationMs: 4000,
        });
      }
    }
  }, [inGame, roomState, lang, soundEnabled, uiVolume, ambientVolume, getRoleName]);

  useEffect(() => {
    if (!overlay) return;
    const t = setTimeout(() => setOverlay(null), overlay.durationMs);
    return () => clearTimeout(t);
  }, [overlay]);

  const environmentMode = useMemo(
    () => resolveEnvironmentMode(phase, inGame, isDawnWindow),
    [phase, inGame, isDawnWindow]
  );

  return {
    environmentMode,
    overlay,
    dismissOverlay: () => setOverlay(null),
  };
}
