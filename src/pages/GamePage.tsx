import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Clock,
  Compass,
  Crown,
  Eye,
  EyeOff,
  FileSearch,
  FileText,
  Flag,
  Flame,
  Ghost,
  Heart,
  Lock,
  Moon,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  SkipForward,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Users,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROLES } from '../shared/roles';
import { resolveEffectiveRoleMeta } from '../shared/roleArtwork';
import { RARITY_LABELS, ROLE_VISUALS } from '../shared/roleCards';
import { InventoryItemRecord, ShopProduct } from '../shared/types';
import { PhaseTransitions } from '../components/PhaseTransitions';
import { PlayerCard } from '../components/PlayerCard';
import { RolePortrait } from '../components/RolePortrait';
import { RoleRevealModal } from '../components/RoleRevealModal';
import { VoicePanel } from '../components/VoicePanel';
import { playTone, startAmbientLoop, stopAmbientLoop } from '../utils/sound';
import cardBackImg from '../assets/images/mafia_card_back_1794372514453.jpg';

export const GamePage: React.FC = () => {
  const {
    roomState,
    t,
    lang,
    chatMessages,
    sendChat,
    reactChat,
    submitNightAction,
    revealMayor,
    castVote,
    skipPhase,
    playAgain,
    useGameItem,
    leaveRoom,
    showToast,
    token,
    soundEnabled,
    uiVolume,
    ambientVolume,
    rainEnabled,
    serverClockOffset,
    roleConfigs,
  } = useApp();

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [roleVisible, setRoleVisible] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [secondaryTarget, setSecondaryTarget] = useState<string>('');
  const [activeChatTab, setActiveChatTab] = useState<'PUBLIC' | 'MAFIA' | 'DEAD'>('PUBLIC');
  const [msgText, setMsgText] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState('');
  const [reportReasonType, setReportReasonType] = useState('Toxic');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [tacticalItems, setTacticalItems] = useState<(InventoryItemRecord & { product?: ShopProduct })[]>([]);
  const [itemTargetId, setItemTargetId] = useState<string>('');
  const [usingItemId, setUsingItemId] = useState<string | null>(null);
  const lastTickRef = useRef<number>(-1);

  const loadTacticalItems = () => {
    if (!token || !roomState) {
      setTacticalItems([]);
      return;
    }
    fetch('/api/inventory', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d?.functionalItems) setTacticalItems(d.functionalItems);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadTacticalItems();
  }, [token, roomState?.code, roomState?.phase, roomState?.round]);

  useEffect(() => {
    if (!roomState) {
      stopAmbientLoop();
      return;
    }
    const ambPhase =
      roomState.phase === 'NIGHT'
        ? 'NIGHT'
        : roomState.phase === 'VOTING'
          ? 'VOTING'
          : roomState.phase === 'DAY' || roomState.phase === 'DISCUSSION'
            ? 'DAY'
            : 'NONE';
    startAmbientLoop(ambPhase, {
      enabled: soundEnabled,
      uiVolume,
      ambientVolume,
      rainEnabled,
    });
    return () => {
      stopAmbientLoop();
    };
  }, [roomState?.phase, soundEnabled, uiVolume, ambientVolume, rainEnabled]);

  useEffect(() => {
    if (!roomState) return;
    const update = () => {
      const serverNow = Date.now() + serverClockOffset;
      const diff = Math.max(0, Math.ceil((roomState.phaseEndsAt - serverNow) / 1000));
      setSecondsLeft(diff);
      if (lastTickRef.current !== diff && diff > 0) {
        if (roomState.phase === 'VOTING') {
          lastTickRef.current = diff;
          playTone(diff <= 5 ? 'countdown' : 'tick', { enabled: soundEnabled, uiVolume, ambientVolume });
        } else if (roomState.phase === 'NIGHT' && diff <= 5) {
          lastTickRef.current = diff;
          playTone('countdown', { enabled: soundEnabled, uiVolume, ambientVolume });
        }
      }
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [roomState?.phaseEndsAt, roomState?.phase, serverClockOffset, soundEnabled, uiVolume, ambientVolume]);

  if (!roomState) return null;

  const priv = roomState.myPrivateData;
  const myId = priv?.playerId;
  const me = roomState.players.find((p) => p.id === myId);
  const myRole = priv?.roleId ? ROLES[priv.roleId] : undefined;
  const isNight = roomState.phase === 'NIGHT';
  const isDay = roomState.phase === 'DAY' || roomState.phase === 'DISCUSSION';
  const isVoting = roomState.phase === 'VOTING';
  const isVictory = roomState.phase === 'VICTORY';

  const panelClass = isDay ? 'glass-panel-day' : 'glass-panel';

  const canUseNightAction =
    isNight &&
    Boolean(me?.isAlive) &&
    !me?.isJailed &&
    !me?.isSpectator &&
    Boolean(myRole) &&
    (myRole!.actionPhase === 'NIGHT' || myRole!.actionPhase === 'BOTH') &&
    (priv?.cooldownRemaining ?? 0) === 0 &&
    (priv?.usesRemaining ?? -1) !== 0;

  const handleConfirmNight = async (overrideTargetId?: string) => {
    if (!myRole) return;
    const targetToUse = overrideTargetId || selectedTarget;

    if (myRole.targetType === 'SELF') {
      await submitNightAction(myId);
    } else if (myRole.id === 'arsonist' && targetToUse === myId) {
      // Arsonist self-ignite
      await submitNightAction(myId);
    } else if (myRole.targetType === 'TWO_ALIVE') {
      if (!targetToUse || !secondaryTarget || targetToUse === secondaryTarget) {
        showToast(lang === 'uz' ? '2 ta har xil o‘yinchi tanlang' : 'Выберите 2 разных игроков', 'error');
        return;
      }
      await submitNightAction(targetToUse, secondaryTarget);
    } else {
      if (!targetToUse) {
        showToast(t.game.selectTarget, 'error');
        return;
      }
      await submitNightAction(targetToUse);
    }
  };

  const reportablePlayers = roomState.players.filter((p) => !p.isSpectator && p.id !== myId);

  const reportReasons = [
    { value: 'Toxic', label: lang === 'uz' ? 'Haqorat / Toksiklik' : 'Токсичность / Оскорбления' },
    { value: 'Cheating', label: lang === 'uz' ? 'Chit / Qoidabuzarlik' : 'Читерство / Нарушение' },
    { value: 'AFK / Griefing', label: lang === 'uz' ? 'AFK / O‘yinni buzish' : 'AFK / Саботаж' },
    { value: 'Spam', label: lang === 'uz' ? 'Spam / Reklama' : 'Спам / Реклама' },
    { value: 'Other', label: lang === 'uz' ? 'Boshqa sabab' : 'Другая причина' },
  ];

  const openReportModal = (preselectedPlayerId?: string) => {
    if (!token) {
      showToast(lang === 'uz' ? 'Shikoyat uchun tizimga kiring' : 'Войдите для отправки жалобы', 'info');
      return;
    }
    const defaultTarget =
      preselectedPlayerId || reportablePlayers[0]?.id || '';
    if (!defaultTarget) {
      showToast(lang === 'uz' ? 'Shikoyat qilish uchun o‘yinchi yo‘q' : 'Нет игроков для жалобы', 'info');
      return;
    }
    setReportTargetId(defaultTarget);
    setReportReasonType('Toxic');
    setReportDetails('');
    setReportModalOpen(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showToast(lang === 'uz' ? 'Shikoyat uchun tizimga kiring' : 'Войдите для отправки жалобы', 'info');
      return;
    }
    const target = roomState.players.find((p) => p.id === reportTargetId);
    if (!target) {
      showToast(lang === 'uz' ? 'O‘yinchi tanlang' : 'Выберите игрока', 'error');
      return;
    }
    const trimmedDetails = reportDetails.trim();
    const reason = trimmedDetails ? `${reportReasonType}: ${trimmedDetails}` : reportReasonType;

    setReportSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: target.id,
          targetUsername: target.username,
          roomCode: roomState.code,
          reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || (lang === 'uz' ? 'Shikoyat yuborishda xatolik' : 'Ошибка отправки жалобы'), 'error');
        return;
      }
      setReportModalOpen(false);
      setReportDetails('');
      showToast(lang === 'uz' ? 'Shikoyat adminga yuborildi' : 'Жалоба отправлена администратору', 'success');
    } catch {
      showToast(lang === 'uz' ? 'Tarmoq xatoligi' : 'Ошибка сети', 'error');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    sendChat(activeChatTab, msgText);
    setMsgText('');
  };

  const visibleChats = chatMessages.filter(
    (m) => m.channel === 'SYSTEM' || m.channel === activeChatTab
  );

  const voteCounts: Record<string, number> = {};
  for (const [, targetId] of Object.entries(roomState.votes)) {
    voteCounts[targetId] = (voteCounts[targetId] ?? 0) + 1;
  }

  const victoryBorder =
    roomState.winnerTeam === 'TOWN'
      ? 'border-[#FCD34D]/50 shadow-[0_0_50px_rgba(252,211,77,0.2)]'
      : roomState.winnerTeam === 'MAFIA'
        ? 'border-[#E63946]/50 shadow-[0_0_50px_rgba(230,57,70,0.25)]'
        : 'border-[#8B5CF6]/50 shadow-[0_0_50px_rgba(139,92,246,0.25)]';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-16 space-y-5">
      <PhaseTransitions />
      <RoleRevealModal />

      {/* Phase Banner */}
      <motion.div
        layout
        className={`glass-panel-elevated rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 transition-colors ${
          isVoting ? 'border-[#E63946]/45' : isDay ? 'border-[#F59E0B]/35' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          {isNight ? (
            <Moon className="w-6 h-6 text-[#A5B4FC]" />
          ) : (
            <Sun className="w-6 h-6 text-[#FCD34D]" />
          )}
          <div>
            <p className="text-xs text-[#F5F5F7]/65 tabular-nums">
              {roomState.settings.mode} · {lang === 'uz' ? `${roomState.round}-tur` : `Раунд ${roomState.round}`}
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#F5F5F7]">
              {t.game.phases[roomState.phase]}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.div
            animate={secondsLeft > 0 && secondsLeft <= 5 && !isVictory ? { scale: [1, 1.06, 1] } : undefined}
            transition={{ duration: 0.6, repeat: Infinity }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-[#050711]/85 border font-mono text-lg font-bold tabular-nums ${
              secondsLeft > 0 && secondsLeft <= 5 && !isVictory
                ? 'border-[#E63946] text-[#E63946]'
                : 'border-white/10 text-[#FCD34D]'
            }`}
          >
            <Clock className="w-4 h-4 text-[#E63946]" />
            <span>{secondsLeft}s</span>
          </motion.div>

          {reportablePlayers.length > 0 && (
            <button
              type="button"
              onClick={() => openReportModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#E63946]/15 border border-[#E63946]/35 hover:bg-[#E63946]/25 text-xs font-semibold text-[#FCA5A5] transition-colors"
              title={t.game.reportPlayer}
            >
              <Flag className="w-3.5 h-3.5 text-[#E63946]" />
              <span className="hidden sm:inline">{t.game.reportPlayer}</span>
            </button>
          )}

          {me?.isHost && !isVictory && (
            <button
              onClick={skipPhase}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F5F7] transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'uz' ? 'Keyingi bosqich' : 'След. фаза'}</span>
            </button>
          )}
        </div>
      </motion.div>

      <VoicePanel />

      {/* Victory Banner */}
      <AnimatePresence>
        {isVictory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className={`glass-panel-elevated rounded-2xl p-6 sm:p-8 text-center ${victoryBorder}`}
          >
            <Trophy
              className={`w-12 h-12 mx-auto mb-3 ${
                roomState.winnerTeam === 'TOWN'
                  ? 'text-[#FCD34D]'
                  : roomState.winnerTeam === 'MAFIA'
                    ? 'text-[#E63946]'
                    : 'text-[#A855F7]'
              }`}
            />
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F5F5F7]">
              {lang === 'uz' ? 'G‘alaba!' : 'Победа!'} — {roomState.winnerTeam}
            </h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {me?.isHost && (
                <button
                  onClick={playAgain}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E63946] text-sm font-bold text-white hover:bg-[#E63946]/90 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t.game.playAgain}
                </button>
              )}
              <button
                onClick={leaveRoom}
                className="px-6 py-3 rounded-xl bg-white/10 text-sm font-semibold text-[#F5F5F7] hover:bg-white/15 transition-colors"
              >
                {t.game.backToDashboard}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-12 gap-5">
        {/* Left Column: Secret Role Card + Event Log */}
        <div className="lg:col-span-4 space-y-5">
          <div className={`${panelClass} rounded-2xl p-5 transition-colors duration-700`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#F5F5F7]/65">{t.game.yourRole}</span>
              <button
                onClick={() => setRoleVisible(!roleVisible)}
                className="inline-flex items-center gap-1.5 text-xs text-[#E7B65B] hover:underline"
              >
                {roleVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {roleVisible ? t.game.hideRole : t.game.showRole}
              </button>
            </div>

            {me?.isSpectator ? (
              <div className="py-6 text-center text-sm text-[#F5F5F7]/70">
                {t.game.spectatorMode}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {!roleVisible ? (
                  <motion.div
                    key="card-back"
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -90, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => setRoleVisible(true)}
                    className="relative rounded-xl overflow-hidden aspect-[3/4] max-h-[260px] mx-auto border border-[#E7B65B]/35 cursor-pointer"
                  >
                    <img
                      src={cardBackImg}
                      alt="Hidden Role Card"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ) : myRole ? (
                  <motion.div
                    key="card-front"
                    initial={{ rotateY: -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-xl p-3.5"
                    style={{
                      background: ROLE_VISUALS[myRole.id].bgGradient,
                      border: `1px solid ${ROLE_VISUALS[myRole.id].borderColor}`,
                      boxShadow: `0 12px 32px -12px ${ROLE_VISUALS[myRole.id].glowColor}`,
                    }}
                  >
                    <RolePortrait
                      roleId={myRole.id}
                      roleConfigs={roleConfigs}
                      lazy={false}
                      alt={resolveEffectiveRoleMeta(myRole.id, lang, roleConfigs).name}
                      className="w-full aspect-square max-h-56 mx-auto rounded-xl mb-3 border border-white/10"
                    />
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="font-display text-lg font-extrabold text-[#F5F5F7]">
                        {resolveEffectiveRoleMeta(myRole.id, lang, roleConfigs).name}
                      </h3>
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: RARITY_LABELS[ROLE_VISUALS[myRole.id].rarity].color }}
                      >
                        {RARITY_LABELS[ROLE_VISUALS[myRole.id].rarity][lang]} · {t.game.teams[myRole.team]}
                      </span>
                    </div>
                    <p className="text-xs text-[#F5F5F7]/80 leading-relaxed">
                      {resolveEffectiveRoleMeta(myRole.id, lang, roleConfigs).shortDesc}
                    </p>

                    <div className="mt-4 pt-3 border-t border-white/10">
                      <p className="text-xs font-semibold text-[#E7B65B]">
                        {resolveEffectiveRoleMeta(myRole.id, lang, roleConfigs).abilityName}
                      </p>
                      <p className="mt-1 text-xs text-[#F5F5F7]/70 leading-relaxed">
                        {myRole.abilityDesc[lang]}
                      </p>
                    </div>

                    {priv?.roleId === 'mayor' && me?.isAlive && !me.isMayorRevealed && !isNight && (
                      <button
                        onClick={revealMayor}
                        className="mt-4 w-full py-2.5 rounded-xl bg-[#E7B65B] text-xs font-bold text-[#090B12] hover:bg-[#E7B65B]/90"
                      >
                        <Crown className="w-3.5 h-3.5 inline mr-1.5" />
                        {t.game.mayorReveal}
                      </button>
                    )}

                    {priv?.mafiaTeammates && priv.mafiaTeammates.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/10 text-xs">
                        <span className="text-[#E63946] font-semibold">
                          {lang === 'uz' ? 'Mafiya sheriklari: ' : 'Союзники мафии: '}
                        </span>
                        <span className="text-[#F5F5F7]/85">
                          {priv.mafiaTeammates
                            .map((id) => roomState.players.find((p) => p.id === id)?.username)
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            )}

            {priv?.nightFeedback && priv.nightFeedback.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                {priv.nightFeedback.map((line, i) => (
                  <p key={i} className="text-xs text-[#FCD34D] font-medium">
                    {line}
                  </p>
                ))}
              </div>
            )}

            {/* Tergov Daftarchasi / Investigation Dossier */}
            {(Boolean(priv?.investigationDossier?.length) ||
              ['sheriff', 'detective', 'consigliere', 'tracker', 'lookout'].includes(myRole?.id || '')) && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#E7B65B]/15 border border-[#E7B65B]/30 flex items-center justify-center">
                      <FileSearch className="w-3.5 h-3.5 text-[#E7B65B]" />
                    </div>
                    <h4 className="font-display text-xs font-bold text-[#F5F5F7] tracking-wider uppercase">
                      {lang === 'uz' ? 'Tergov daftarchasi' : 'Досье расследований'}
                    </h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono text-[#F5F5F7]/70 font-semibold">
                    {priv?.investigationDossier?.length || 0} {lang === 'uz' ? 'ta ish' : 'дел'}
                  </span>
                </div>

                {!priv?.investigationDossier || priv.investigationDossier.length === 0 ? (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                    <p className="text-[11px] text-[#F5F5F7]/50 italic">
                      {lang === 'uz'
                        ? 'Hozircha tergov o‘tkazilmagan. Kechasi o‘yinchining kartasidagi "Tekshirish" tugmasini bosing.'
                        : 'Пока расследований нет. Ночью выберите игрока и нажмите "Проверить".'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {priv.investigationDossier.map((dossier, idx) => (
                      <div
                        key={`${dossier.targetId}-${idx}`}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                          dossier.result === 'SUSPICIOUS' || dossier.team === 'MAFIA'
                            ? 'bg-[#E63946]/15 border-[#E63946]/40 shadow-sm shadow-[#E63946]/15'
                            : 'bg-emerald-500/15 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-[#F5F5F7]/50 font-bold">R{dossier.round}</span>
                            <span className="font-bold text-[#F5F5F7] truncate">{dossier.targetUsername}</span>
                          </div>
                          <p className="text-[10px] text-[#F5F5F7]/75 mt-0.5">
                            {dossier.label[lang]}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {dossier.result === 'SUSPICIOUS' || dossier.team === 'MAFIA' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E63946] text-white font-black text-[10px] tracking-wide animate-pulse">
                              <ShieldAlert className="w-3 h-3" />
                              {lang === 'uz' ? 'SHUBHALI' : 'ПОДОЗРИТЕЛЬНЫЙ'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500 text-white font-bold text-[10px] tracking-wide">
                              <Shield className="w-3 h-3" />
                              {lang === 'uz' ? 'TOZA' : 'НЕВИНЕН'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Shields & Tactical Functional Items */}
          {me?.isAlive && !me?.isSpectator && !isVictory && (
            (() => {
              const aliveOthers = roomState.players.filter(
                (p) => !p.isSpectator && p.isAlive && p.id !== myId
              );
              const usableNow = tacticalItems.filter((inv) => {
                if (inv.status !== 'ACTIVE' && inv.status !== 'EQUIPPED') return false;
                if (inv.category === 'STATISTICS_RESET' || inv.category === 'ROLE_PURCHASE') return false;
                const cfg = inv.product?.effectConfig;
                if (cfg?.allowedModes && !cfg.allowedModes.includes(roomState.settings.mode)) return false;
                if (cfg?.allowedPhases && !cfg.allowedPhases.includes(roomState.phase)) return false;
                if (!cfg?.allowedPhases && roomState.phase !== 'NIGHT') return false;
                const usedCount = priv?.usedItemCountsInMatch?.[inv.category] || 0;
                if (cfg?.maxPerMatch && usedCount >= cfg.maxPerMatch) return false;
                return true;
              });
              const activeShields = (priv?.activeMatchItems || []).filter((it) => !it.consumed);
              if (usableNow.length === 0 && activeShields.length === 0) return null;

              const targetedEffects = ['DOC_INVESTIGATE', 'DOC_EVIDENCE', 'RIFLE_NIGHT_STRIKE'];
              const hasTargetedUsable = usableNow.some((u) =>
                targetedEffects.includes(u.effectType || u.product?.effectType || '')
              );
              const resolvedTarget = itemTargetId || selectedTarget || aliveOthers[0]?.id || '';

              return (
                <div className={`${panelClass} rounded-2xl p-4 space-y-3 border border-[#E7B65B]/25 transition-colors duration-700`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-xs font-bold text-[#E7B65B] uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      {lang === 'uz' ? 'Taktik Buyumlar' : 'Тактические предметы'}
                    </h3>
                    {activeShields.length > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        {activeShields.length} {lang === 'uz' ? 'faol' : 'акт.'}
                      </span>
                    )}
                  </div>

                  {activeShields.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {activeShields.map((sh) => (
                        <span
                          key={sh.inventoryItemId}
                          className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300"
                        >
                          {sh.effectType}
                        </span>
                      ))}
                    </div>
                  )}

                  {usableNow.length > 0 && (
                    <div className="space-y-2">
                      {hasTargetedUsable && aliveOthers.length > 0 && (
                        <select
                          value={resolvedTarget}
                          onChange={(e) => setItemTargetId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#050711]/90 border border-white/15 text-xs text-[#F5F5F7]"
                        >
                          {aliveOthers.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.username}
                            </option>
                          ))}
                        </select>
                      )}

                      <div className="space-y-1.5">
                        {usableNow.map((inv) => {
                          const eff = inv.effectType || inv.product?.effectType || 'DOC_IDENTITY';
                          const needsTarget = targetedEffects.includes(eff);
                          return (
                            <button
                              key={inv.id}
                              type="button"
                              disabled={usingItemId === inv.id || (needsTarget && !resolvedTarget)}
                              onClick={async () => {
                                setUsingItemId(inv.id);
                                const ok = await useGameItem(inv.id, needsTarget ? resolvedTarget : undefined);
                                setUsingItemId(null);
                                if (ok) loadTacticalItems();
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-[#111522] hover:bg-[#E7B65B]/15 border border-white/10 hover:border-[#E7B65B]/45 text-left text-xs flex items-center justify-between gap-2 transition-colors disabled:opacity-45"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-[#F5F5F7] truncate">
                                  {(inv.itemName || inv.product?.name)?.[lang] || inv.productId}
                                </p>
                                <p className="text-[10px] font-mono text-[#F5F5F7]/50">
                                  {needsTarget
                                    ? `${lang === 'uz' ? 'Nishon:' : 'Цель:'} ${
                                        aliveOthers.find((o) => o.id === resolvedTarget)?.username || '—'
                                      }`
                                    : lang === 'uz'
                                      ? 'Shaxsiy himoya'
                                      : 'Личная активация'}
                                </p>
                              </div>
                              <span className="px-2 py-1 rounded-lg bg-[#E63946] text-[10px] font-bold text-white shrink-0">
                                {usingItemId === inv.id
                                  ? '...'
                                  : lang === 'uz'
                                    ? 'Qo‘llash'
                                    : 'Применить'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}

          <div className={`${panelClass} rounded-2xl p-5 max-h-[260px] overflow-y-auto transition-colors duration-700`}>
            <h3 className="font-display text-sm font-bold text-[#F5F5F7] mb-3">
              {t.game.eventsLog}
            </h3>
            <div className="space-y-2">
              {roomState.events.slice(-12).reverse().map((ev) => (
                <div key={ev.id} className="text-xs text-[#F5F5F7]/80 leading-relaxed">
                  <span className="font-mono text-[10px] text-[#F5F5F7]/45 mr-2">R{ev.round}</span>
                  <span>{ev.text[lang]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Premium Player Cards */}
        <div className={`${panelClass} lg:col-span-5 rounded-2xl p-5 flex flex-col justify-between transition-colors duration-700`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-[#F5F5F7]">
                {lang === 'uz' ? 'O‘yinchilar' : 'Игроки'}
              </h2>
              {isVoting && me?.isAlive && !me.isSilenced && (
                <button
                  onClick={() => castVote('SKIP')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    roomState.votes[myId || ''] === 'SKIP'
                      ? 'bg-[#E7B65B] text-[#090B12] border-[#E7B65B]'
                      : 'border-white/15 text-[#F5F5F7]/80 hover:bg-white/10'
                  }`}
                >
                  {t.game.skipVote}
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {roomState.players
                .filter((p) => !p.isSpectator)
                .map((p) => {
                  const isCurrentTarget = (priv?.currentNightTargetId || selectedTarget) === p.id;
                  const isSecondary = secondaryTarget === p.id;
                  return (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      lang={lang}
                      isMe={p.id === myId}
                      isSelected={isCurrentTarget || isSecondary}
                      isSecondarySelected={isSecondary}
                      canSelectNight={canUseNightAction}
                      isNight={isNight}
                      isVoting={isVoting}
                      canVote={Boolean(me?.isAlive && !me.isSilenced)}
                      votesForPlayer={voteCounts[p.id] ?? 0}
                      iVotedForPlayer={roomState.votes[myId || ''] === p.id}
                      myRoleId={myRole?.id}
                      myTeam={myRole?.team}
                      isMafiaTeammate={priv?.mafiaTeammates?.includes(p.id)}
                      hasActedThisNight={priv?.hasActedThisNight}
                      currentNightTargetId={priv?.currentNightTargetId || selectedTarget}
                      roleConfigs={roleConfigs}
                      onSelectNight={() => {
                        if (myRole?.targetType === 'SELF' || (myRole?.id === 'arsonist' && p.id === myId)) {
                          handleConfirmNight(myId);
                        } else if (myRole?.targetType === 'TWO_ALIVE') {
                          if (!selectedTarget) {
                            setSelectedTarget(p.id);
                          } else if (selectedTarget === p.id) {
                            setSelectedTarget('');
                          } else {
                            setSecondaryTarget(p.id);
                          }
                        } else {
                          if (selectedTarget === p.id) {
                            // Clicking the already selected card confirms the action
                            handleConfirmNight(p.id);
                          } else {
                            setSelectedTarget(p.id);
                          }
                        }
                      }}
                      onVote={() => castVote(p.id)}
                      onReport={() => openReportModal(p.id)}
                      onRevealMayor={revealMayor}
                      labels={{
                        alive: t.game.alive,
                        dead: t.game.dead,
                        silenced: t.game.silenced,
                        jailed: t.game.jailed,
                        voteBtn: t.game.voteBtn,
                        reportPlayer: t.game.reportPlayer,
                      }}
                    />
                  );
                })}
            </div>
          </div>

          {/* Role Action Control Center */}
          {canUseNightAction && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-white/10 space-y-2.5"
            >
              {(() => {
                const effectiveTargetId = selectedTarget || priv?.currentNightTargetId;
                const targetPlayer = roomState.players.find((p) => p.id === effectiveTargetId);
                const secondaryPlayer = roomState.players.find((p) => p.id === secondaryTarget);

                // Self action roles
                if (myRole?.targetType === 'SELF') {
                  return (
                    <button
                      onClick={() => handleConfirmNight(myId)}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white text-sm font-bold shadow-lg shadow-[#F59E0B]/25 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      {myRole.id === 'veteran'
                        ? lang === 'uz'
                          ? '⚡ Shay holatga o‘tish (Alert - Har qanday tashrifchini yo‘q qilish)'
                          : '⚡ Встать на боевое дежурство (Alert)'
                        : lang === 'uz'
                          ? '🛡️ Zirh kiyish (Vest - Bir martalik himoya)'
                          : '🛡️ Надеть бронежилет (Vest)'}
                    </button>
                  );
                }

                // Witch 2-target action
                if (myRole?.targetType === 'TWO_ALIVE') {
                  const ready = Boolean(selectedTarget && secondaryTarget && selectedTarget !== secondaryTarget);
                  return (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold">1-Boshqariluvchi: </span>
                          <span className="text-white font-semibold">
                            {targetPlayer?.username || (lang === 'uz' ? 'Tanlanmagan' : 'Не выбран')}
                          </span>
                          <span className="mx-2 text-purple-400">➔</span>
                          <span className="font-bold">2-Nishon: </span>
                          <span className="text-white font-semibold">
                            {secondaryPlayer?.username || (lang === 'uz' ? 'Tanlanmagan' : 'Не выбран')}
                          </span>
                        </div>
                        {(selectedTarget || secondaryTarget) && (
                          <button
                            onClick={() => {
                              setSelectedTarget('');
                              setSecondaryTarget('');
                            }}
                            className="text-[11px] text-purple-300 hover:text-white underline ml-2"
                          >
                            {lang === 'uz' ? 'Tozalash' : 'Сброс'}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleConfirmNight()}
                        disabled={!ready}
                        className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                          ready
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 hover:brightness-110'
                            : 'bg-white/10 text-[#F5F5F7]/40 cursor-not-allowed'
                        }`}
                      >
                        <Wand2 className="w-4 h-4" />
                        {lang === 'uz' ? '🔮 Boshqaruvni amalga oshirish' : '🔮 Применить контроль'}
                      </button>
                    </div>
                  );
                }

                // If target selected
                if (targetPlayer) {
                  let btnColor = 'from-[#8B5CF6] to-[#6D28D9] text-white shadow-[#8B5CF6]/25';
                  let actionTitle = `${t.game.confirmAction}: ${targetPlayer.username}`;
                  let icon = <Shield className="w-4 h-4" />;

                  if (myRole?.id === 'sheriff') {
                    btnColor = 'from-[#E7B65B] to-[#B45309] text-[#090B12] shadow-[#E7B65B]/25';
                    icon = <Search className="w-4 h-4 text-[#090B12]" />;
                    actionTitle =
                      lang === 'uz'
                        ? `🔍 "${targetPlayer.username}"ni tekshirish (Sherif Tergovi)`
                        : `🔍 Проверить "${targetPlayer.username}" (Дознание Шерифа)`;
                  } else if (myRole?.id === 'doctor') {
                    btnColor = 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/25';
                    icon = <Heart className="w-4 h-4 text-white" />;
                    actionTitle =
                      lang === 'uz'
                        ? `💚 "${targetPlayer.username}"ni davolash (Himoya)`
                        : `💚 Лечить "${targetPlayer.username}" (Защита)`;
                  } else if (myRole?.team === 'MAFIA') {
                    btnColor = 'from-[#E63946] to-[#991B1B] text-white shadow-[#E63946]/30';
                    icon = <Target className="w-4 h-4 text-white" />;
                    actionTitle =
                      lang === 'uz'
                        ? `🎯 "${targetPlayer.username}"ga suiqasdni tasdiqlash`
                        : `🎯 Казнить "${targetPlayer.username}" (Приказ Мафии)`;
                  } else if (myRole?.id === 'bodyguard') {
                    btnColor = 'from-sky-500 to-blue-600 text-white shadow-sky-500/25';
                    icon = <Shield className="w-4 h-4 text-white" />;
                    actionTitle =
                      lang === 'uz'
                        ? `🛡️ "${targetPlayer.username}"ni qo‘riqlash (O‘z jonim evaziga)`
                        : `🛡️ Охранять "${targetPlayer.username}"`;
                  } else if (myRole?.id === 'vigilante') {
                    btnColor = 'from-amber-600 to-orange-600 text-white shadow-amber-600/25';
                    icon = <Zap className="w-4 h-4 text-white" />;
                    actionTitle =
                      lang === 'uz'
                        ? `🔫 "${targetPlayer.username}"ni otish (Qasd o‘qi)`
                        : `🔫 Выстрелить в "${targetPlayer.username}"`;
                  } else if (myRole?.id === 'detective') {
                    btnColor = 'from-amber-500 to-amber-700 text-white shadow-amber-500/25';
                    icon = <Search className="w-4 h-4 text-white" />;
                    actionTitle =
                      lang === 'uz'
                        ? `🕵️ "${targetPlayer.username}"ning izlarini tekshirish`
                        : `🕵️ Следить за следами "${targetPlayer.username}"`;
                  } else if (myRole?.id === 'consigliere') {
                    btnColor = 'from-purple-600 to-pink-600 text-white shadow-purple-600/25';
                    icon = <FileSearch className="w-4 h-4 text-white" />;
                    actionTitle =
                      lang === 'uz'
                        ? `📜 "${targetPlayer.username}"ning maxfiy rolini aniqlash`
                        : `📜 Узнать точную роль "${targetPlayer.username}"`;
                  } else if (myRole?.id === 'escort') {
                    btnColor = 'from-pink-500 to-rose-600 text-white shadow-pink-500/25';
                    icon = <Sparkles className="w-4 h-4 text-white" />;
                    actionTitle =
                      lang === 'uz'
                        ? `✨ "${targetPlayer.username}"ni bloklash (Chalg‘itish)`
                        : `✨ Заблокировать "${targetPlayer.username}"`;
                  } else if (myRole?.id === 'jailer') {
                    btnColor = 'from-slate-600 to-slate-800 text-white shadow-slate-600/25';
                    icon = <Lock className="w-4 h-4 text-white" />;
                    actionTitle =
                      lang === 'uz'
                        ? `⛓️ "${targetPlayer.username}"ni hibsga olish`
                        : `⛓️ Взять под стражу "${targetPlayer.username}"`;
                  } else if (myRole?.id === 'arsonist') {
                    if (targetPlayer.id === myId) {
                      btnColor = 'from-amber-500 via-orange-600 to-red-600 text-white shadow-orange-600/30';
                      icon = <Flame className="w-4 h-4 text-white" />;
                      actionTitle =
                        lang === 'uz'
                          ? '🔥 Barcha moy sepilganlarni YOQISH (Ignite)'
                          : '🔥 ПОДЖЕЧЬ всех облитых игроков (Ignite)';
                    } else {
                      btnColor = 'from-orange-500 to-amber-600 text-white shadow-orange-500/25';
                      icon = <Flame className="w-4 h-4 text-white" />;
                      actionTitle =
                        lang === 'uz'
                          ? `🛢️ "${targetPlayer.username}"ga moy sepish (Douse)`
                          : `🛢️ Облить бензином "${targetPlayer.username}"`;
                    }
                  } else if (myRole?.id === 'medium') {
                    btnColor = 'from-indigo-500 to-purple-600 text-white shadow-indigo-500/25';
                    icon = <Ghost className="w-4 h-4 text-white" />;
                    actionTitle =
                      lang === 'uz'
                        ? `👻 Marhum "${targetPlayer.username}" bilan muloqot`
                        : `👻 Сеанс с погибшим "${targetPlayer.username}"`;
                  } else if (myRole?.id === 'amnesiac') {
                    btnColor = 'from-cyan-600 to-blue-600 text-white shadow-cyan-600/25';
                    icon = <Wand2 className="w-4 h-4 text-white" />;
                    actionTitle =
                      lang === 'uz'
                        ? `🧠 Marhum "${targetPlayer.username}" rolini eslash`
                        : `🧠 Вспомнить роль "${targetPlayer.username}"`;
                  }

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-white/[0.04]">
                        <span className="text-[#F5F5F7]/70">
                          {lang === 'uz' ? 'Tanlangan o‘yinchi:' : 'Выбранная цель:'}{' '}
                          <span className="font-bold text-white">{targetPlayer.username}</span>
                        </span>
                        <button
                          onClick={() => setSelectedTarget('')}
                          className="text-[#E63946] hover:text-[#ff6b6b] text-[11px] font-semibold"
                        >
                          {lang === 'uz' ? 'Nishonni bekor qilish' : 'Отменить выбор'}
                        </button>
                      </div>

                      <button
                        onClick={() => handleConfirmNight(targetPlayer.id)}
                        className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${btnColor} text-sm font-bold shadow-lg hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2`}
                      >
                        {icon}
                        <span>{actionTitle}</span>
                      </button>
                    </div>
                  );
                }

                // If no target selected yet
                return (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-dashed border-white/15 text-center space-y-1">
                    <p className="text-xs font-semibold text-[#F5F5F7]">
                      {myRole?.id === 'sheriff'
                        ? lang === 'uz'
                          ? '🔍 Gumondor o‘yinchining kartasidagi "Tekshirish" tugmasini bosing'
                          : '🔍 Нажмите "Проверить" на карточке подозреваемого игрока'
                        : myRole?.id === 'doctor'
                          ? lang === 'uz'
                            ? '💚 Davolamoqchi bo‘lgan o‘yinchining kartasidagi "Davolash" tugmasini bosing'
                            : '💚 Нажмите "Лечить" на карточке игрока для защиты'
                          : myRole?.team === 'MAFIA'
                            ? lang === 'uz'
                              ? '🎯 Qatl qilmoqchi bo‘lgan o‘yinchining kartasidagi "Hujum" tugmasini bosing'
                              : '🎯 Нажмите "Атака" на карточке жертвы'
                            : lang === 'uz'
                              ? 'Yuqoridagi o‘yinchilar kartasidan harakat nishonini tanlang'
                              : 'Выберите цель действия на карточке игрока выше'}
                    </p>
                    <p className="text-[11px] text-[#F5F5F7]/50">
                      {lang === 'uz'
                        ? 'Har bir rol o‘ziga xos tugmaga ega. Tanlaganingizdan so‘ng tasdiqlang.'
                        : 'Каждая роль имеет свою специальную кнопку. После выбора подтвердите действие.'}
                    </p>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {isNight && priv?.hasActedThisNight && (
            <div className="mt-4 pt-3 border-t border-white/10 text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
              <span>✓</span>
              <span>
                {lang === 'uz'
                  ? 'Kechasi harakatingiz belgilangan. Kecha tugaguncha uni o‘zgartirishingiz mumkin.'
                  : 'Ночное действие выбрано. Вы можете изменить его до окончания ночи.'}
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Multi-channel Chat */}
        <div className={`${panelClass} lg:col-span-3 rounded-2xl p-4 flex flex-col h-[520px] transition-colors duration-700`}>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#050711]/80 border border-white/10 mb-3">
            <button
              onClick={() => setActiveChatTab('PUBLIC')}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                activeChatTab === 'PUBLIC' ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/60'
              }`}
            >
              {t.game.chatPublic}
            </button>
            {priv?.team === 'MAFIA' && (
              <button
                onClick={() => setActiveChatTab('MAFIA')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  activeChatTab === 'MAFIA' ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/60'
                }`}
              >
                {t.game.chatMafia}
              </button>
            )}
            {(!me?.isAlive || me?.isSpectator || priv?.roleId === 'medium') && (
              <button
                onClick={() => setActiveChatTab('DEAD')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  activeChatTab === 'DEAD' ? 'bg-[#8B5CF6] text-white' : 'text-[#F5F5F7]/60'
                }`}
              >
                {t.game.chatDead}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {visibleChats.map((m) => (
              <div key={m.id} className="group text-xs leading-relaxed">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`font-semibold ${
                      m.channel === 'SYSTEM'
                        ? 'text-[#E7B65B]'
                        : m.channel === 'MAFIA'
                          ? 'text-[#E63946]'
                          : 'text-[#F5F5F7]'
                    }`}
                  >
                    {m.senderName}
                  </span>
                  <span className="text-[10px] text-[#F5F5F7]/35 font-mono">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[#F5F5F7]/85 mt-0.5 break-words">{m.text}</p>
                <div className="flex items-center gap-1 mt-1">
                  {['👍', '🔥', '🕵️'].map((em) => {
                    const cnt = m.reactions[em]?.length ?? 0;
                    return (
                      <button
                        key={em}
                        onClick={() => reactChat(m.id, em)}
                        className={`text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 transition-opacity ${
                          cnt > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {em} {cnt > 0 ? cnt : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="mt-3 flex items-center gap-2">
            <input
              type="text"
              disabled={
                (activeChatTab === 'PUBLIC' && (isNight || !me?.isAlive || me?.isSilenced)) ||
                (activeChatTab === 'MAFIA' && (!isNight || !me?.isAlive))
              }
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder={
                me?.isSilenced
                  ? t.game.silencedPlaceholder
                  : isNight && activeChatTab === 'PUBLIC'
                    ? t.game.nightChatLocked
                    : t.game.messagePlaceholder
              }
              className="flex-1 px-3 py-2.5 rounded-xl bg-[#050711]/85 border border-white/10 text-xs text-[#F5F5F7] disabled:opacity-40 focus:outline-none focus:border-[#E63946]"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-[#E63946] text-white hover:bg-[#E63946]/90 min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Report Player Modal */}
      <AnimatePresence>
        {reportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => !reportSubmitting && setReportModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel-elevated w-full max-w-md rounded-2xl p-5 sm:p-6 border border-white/15 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E63946]/15 border border-[#E63946]/30 flex items-center justify-center">
                    <Flag className="w-4 h-4 text-[#E63946]" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-[#F5F5F7]">
                      {t.game.reportPlayer}
                    </h3>
                    <p className="text-[11px] text-[#F5F5F7]/55">
                      {lang === 'uz'
                        ? 'Admin ko‘rib chiqishi uchun shikoyat yuboring'
                        : 'Отправьте жалобу на рассмотрение администратору'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={reportSubmitting}
                  onClick={() => setReportModalOpen(false)}
                  className="p-1.5 rounded-lg text-[#F5F5F7]/60 hover:text-[#F5F5F7] hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#F5F5F7]/75 mb-1.5">
                    {lang === 'uz' ? 'O‘yinchini tanlang' : 'Выберите игрока'}
                  </label>
                  <select
                    value={reportTargetId}
                    onChange={(e) => setReportTargetId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#050711]/90 border border-white/15 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#E63946]"
                  >
                    {reportablePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.username} {p.isBot ? '(BOT)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#F5F5F7]/75 mb-1.5">
                    {lang === 'uz' ? 'Sabab' : 'Причина'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {reportReasons.map((r) => {
                      const active = reportReasonType === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setReportReasonType(r.value)}
                          className={`px-3 py-2 rounded-xl text-left text-xs font-semibold border transition-colors ${
                            active
                              ? 'bg-[#E63946]/20 border-[#E63946] text-[#F5F5F7]'
                              : 'bg-white/5 border-white/10 text-[#F5F5F7]/70 hover:bg-white/10'
                          }`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#F5F5F7]/75 mb-1.5">
                    {lang === 'uz' ? 'Qo‘shimcha izoh (ixtiyoriy)' : 'Комментарий (необязательно)'}
                  </label>
                  <textarea
                    rows={3}
                    maxLength={280}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder={
                      lang === 'uz'
                        ? 'Nima sodir bo‘lganini qisqacha yozing...'
                        : 'Кратко опишите нарушение...'
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#050711]/90 border border-white/15 text-xs text-[#F5F5F7] placeholder:text-[#F5F5F7]/35 focus:outline-none focus:border-[#E63946] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={reportSubmitting}
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F5F7] transition-colors"
                  >
                    {lang === 'uz' ? 'Bekor qilish' : 'Отмена'}
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting || !reportTargetId}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E63946] hover:bg-[#E63946]/90 disabled:opacity-50 text-xs font-bold text-white transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {reportSubmitting
                      ? lang === 'uz'
                        ? 'Yuborilmoqda...'
                        : 'Отправка...'
                      : lang === 'uz'
                        ? 'Shikoyat yuborish'
                        : 'Отправить жалобу'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
