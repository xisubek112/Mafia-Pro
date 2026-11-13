import React, { useEffect, useState } from 'react';
import { Bot, Check, Copy, Link2, LogOut, Play, Send, Shield, UserX, Users, Wifi, WifiOff } from 'lucide-react';
import { VoicePanel } from '../components/VoicePanel';
import { useApp } from '../context/AppContext';
import { ROLES } from '../shared/roles';
import { GameMode, RoleId } from '../shared/types';

export const CreateRoomPage: React.FC = () => {
  const { t, lang, createRoom } = useApp();
  const [name, setName] = useState(lang === 'uz' ? 'Tungi Mafiya' : 'Ночная Мафия');
  const [mode, setMode] = useState<GameMode>('CLASSIC');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [isPrivate, setIsPrivate] = useState(false);
  const [fillWithBots, setFillWithBots] = useState(false);
  const [revealRolesOnDeath, setRevealRolesOnDeath] = useState(true);
  const [nightSec, setNightSec] = useState(30);
  const [discussionSec, setDiscussionSec] = useState(45);
  const [votingSec, setVotingSec] = useState(25);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await createRoom(name, {
      mode,
      maxPlayers,
      isPrivate,
      allowSpectators: true,
      fillWithBots,
      revealRolesOnDeath,
      timers: {
        roleAssignment: 6,
        night: nightSec,
        day: 8,
        discussion: discussionSec,
        voting: votingSec,
        execution: 6,
      },
    });
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24">
      <div className="glass-panel-elevated rounded-2xl p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[#F5F5F7] mb-6">
          {t.room.createTitle}
        </h1>

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-[#F5F5F7]/75 mb-1.5">
              {t.room.roomName}
            </label>
            <input
              type="text"
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#090B12] border border-white/10 text-sm text-[#F5F5F7] focus:outline-none focus:border-[#E63946]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#F5F5F7]/75 mb-2">
              {t.room.gameMode}
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-[#090B12] border border-white/10">
              {(['CLASSIC', 'ADVANCED', 'CHAOS'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-colors ${
                    mode === m
                      ? 'bg-[#E63946] text-white'
                      : 'text-[#F5F5F7]/65 hover:text-[#F5F5F7]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[#F5F5F7]/75">{t.room.maxPlayers}</label>
              <span className="font-mono text-sm font-bold text-[#E7B65B] tabular-nums">
                {maxPlayers}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={20}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-[#E63946]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-[#F5F5F7]/65 mb-1">{t.room.nightTime} (s)</label>
              <input
                type="number"
                min={10}
                max={120}
                value={nightSec}
                onChange={(e) => setNightSec(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-sm font-mono tabular-nums text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#F5F5F7]/65 mb-1">{t.room.discussionTime} (s)</label>
              <input
                type="number"
                min={15}
                max={180}
                value={discussionSec}
                onChange={(e) => setDiscussionSec(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-sm font-mono tabular-nums text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#F5F5F7]/65 mb-1">{t.room.votingTime} (s)</label>
              <input
                type="number"
                min={10}
                max={120}
                value={votingSec}
                onChange={(e) => setVotingSec(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-sm font-mono tabular-nums text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#090B12] border border-white/10 cursor-pointer">
              <span className="text-sm text-[#F5F5F7]">{t.room.privateRoom}</span>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 accent-[#E63946]"
              />
            </label>
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#090B12] border border-white/10 cursor-pointer">
              <span className="text-sm text-[#F5F5F7]">{t.room.botFill}</span>
              <input
                type="checkbox"
                checked={fillWithBots}
                onChange={(e) => setFillWithBots(e.target.checked)}
                className="w-4 h-4 accent-[#A855F7]"
              />
            </label>
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#090B12] border border-white/10 cursor-pointer">
              <span className="text-sm text-[#F5F5F7]">{t.room.revealRolesOnDeath}</span>
              <input
                type="checkbox"
                checked={revealRolesOnDeath}
                onChange={(e) => setRevealRolesOnDeath(e.target.checked)}
                className="w-4 h-4 accent-[#E7B65B]"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#E63946] text-sm font-bold text-white hover:bg-[#E63946]/90 transition-colors min-h-[48px]"
          >
            {submitting ? '...' : t.room.createBtn}
          </button>
        </form>
      </div>
    </div>
  );
};

export const JoinRoomPage: React.FC = () => {
  const { t, joinRoom } = useApp();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) return;
    setJoining(true);
    await joinRoom(code.trim().toUpperCase());
    setJoining(false);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12 pb-24">
      <div className="glass-panel-elevated w-full max-w-md rounded-2xl p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[#F5F5F7]">{t.room.joinTitle}</h1>
        <form onSubmit={handleJoin} className="mt-6 space-y-4">
          <label className="block text-xs font-medium text-[#F5F5F7]/75">{t.room.enterCode}</label>
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="AB12CD"
            className="w-full px-4 py-4 rounded-xl bg-[#090B12] border border-white/15 text-center font-mono text-2xl font-bold tracking-[0.3em] text-[#E7B65B] uppercase focus:outline-none focus:border-[#E63946]"
          />
          <button
            type="submit"
            disabled={joining || code.trim().length < 4}
            className="w-full py-3.5 rounded-xl bg-[#E63946] text-sm font-bold text-white hover:bg-[#E63946]/90 disabled:opacity-50 transition-colors min-h-[48px]"
          >
            {joining ? '...' : t.room.joinBtn}
          </button>
        </form>
      </div>
    </div>
  );
};

export const LobbyPage: React.FC = () => {
  const {
    roomState,
    token,
    user,
    t,
    lang,
    toggleReady,
    fillBots,
    startGame,
    kickPlayer,
    leaveRoom,
    selectDesiredRole,
    chatMessages,
    sendChat,
    askConfirm,
    showToast,
  } = useApp();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [eligibleRoles, setEligibleRoles] = useState<
    Array<{
      roleId: RoleId;
      source: 'UNLOCK' | 'TOKEN';
      remainingUses: number;
      minPlayers: number;
      compatibleWithMode: boolean;
    }>
  >([]);
  const [roleBusy, setRoleBusy] = useState(false);

  useEffect(() => {
    if (!token || !roomState || roomState.phase !== 'LOBBY') {
      setEligibleRoles([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/shop/eligible-roles?mode=${encodeURIComponent(roomState.settings.mode)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.roles) {
          setEligibleRoles(data.roles);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, roomState?.code, roomState?.phase, roomState?.settings.mode]);

  if (!roomState) return null;

  const myId = roomState.myPrivateData?.playerId;
  const me = roomState.players.find((p) => p.id === myId);
  const isHost = Boolean(me?.isHost);
  const activePlayers = roomState.players.filter((p) => !p.isSpectator);
  const desiredRoleId = roomState.myPrivateData?.desiredRoleId;

  const copyCode = () => {
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/?room=${roomState.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast(t.room.inviteCopied, 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    sendChat('PUBLIC', msgText);
    setMsgText('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16 space-y-6">
      {/* Room Header */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 text-xs text-[#F5F5F7]/60">
            <span>{roomState.settings.mode}</span>
            <span>·</span>
            <span className="tabular-nums">
              {activePlayers.length}/{roomState.settings.maxPlayers} {t.dashboard.players}
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F5F5F7] mt-1">{roomState.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#090B12] border border-[#E7B65B]/40 text-sm font-mono font-bold text-[#E7B65B]"
          >
            <span>{roomState.code}</span>
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={copyInviteLink}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#111522] border border-white/15 text-xs font-semibold text-[#F5F5F7] hover:bg-white/10"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4 text-[#E7B65B]" />}
            <span className="hidden sm:inline">{t.room.copyInviteLink}</span>
          </button>

          {isHost && (
            <button
              onClick={() => fillBots(roomState.settings.maxPlayers)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111522] border border-white/15 text-xs font-semibold text-[#F5F5F7] hover:bg-white/10"
            >
              <Bot className="w-4 h-4 text-[#A855F7]" />
              {t.room.fillBots} ({roomState.settings.maxPlayers})
            </button>
          )}

          <button
            onClick={() =>
              askConfirm(
                t.room.leaveRoom,
                lang === 'uz' ? 'Xonadan chiqishni tasdiqlaysizmi?' : 'Вы уверены, что хотите покинуть комнату?',
                leaveRoom
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-[#F5F5F7]/80 hover:bg-[#E63946]/20 hover:text-[#E63946]"
          >
            <LogOut className="w-4 h-4" />
            {t.room.leaveRoom}
          </button>
        </div>
      </div>

      <VoicePanel />

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Player Roster */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#F5F5F7] flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-[#E7B65B]" />
              {lang === 'uz' ? 'O‘yinchilar ro‘yxati' : 'Список игроков'}
            </h2>

            <div className="divide-y divide-white/10">
              {activePlayers.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#1a2035] border border-white/15 flex items-center justify-center text-xs font-bold text-[#E7B65B] shrink-0">
                      {p.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#F5F5F7] truncate">{p.username}</p>
                      <p className="text-xs text-[#F5F5F7]/50">
                        {p.isHost ? t.room.hostLabel : p.isBot ? t.room.botLabel : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {p.isConnected ? (
                      <Wifi className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-[#E63946]" />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        p.isReady ? 'text-emerald-400' : 'text-[#F5F5F7]/40'
                      }`}
                    >
                      {p.isReady ? t.room.ready : t.room.notReady}
                    </span>
                    {isHost && p.id !== myId && (
                      <button
                        type="button"
                        onClick={() =>
                          askConfirm(
                            t.room.kickPlayer,
                            `${p.username} — ${t.room.kickPlayer}?`,
                            () => kickPlayer(p.id)
                          )
                        }
                        title={t.room.kickPlayer}
                        className="p-1.5 rounded-lg text-[#F5F5F7]/50 hover:text-[#E63946] hover:bg-[#E63946]/15 transition-colors"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lobby Role Pass / Unlock Selector */}
          {user && !me?.isSpectator && eligibleRoles.length > 0 && (
            <div className="mt-5 p-4 rounded-xl bg-[#090B12]/80 border border-[#E7B65B]/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#E7B65B]" />
                  <span className="text-xs font-bold text-[#F5F5F7]">
                    {lang === 'uz'
                      ? 'Sotib olingan rol tanlovi (o‘yin oldidan)'
                      : 'Выбор купленной роли (до старта)'}
                  </span>
                </div>
                {desiredRoleId && (
                  <button
                    type="button"
                    disabled={roleBusy}
                    onClick={async () => {
                      setRoleBusy(true);
                      await selectDesiredRole(null);
                      setRoleBusy(false);
                    }}
                    className="text-[11px] font-semibold text-[#E63946] hover:underline"
                  >
                    {lang === 'uz' ? 'Tasodifiy rolga qaytarish' : 'Сбросить на случайную'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {eligibleRoles.map((entry) => {
                  const roleDef = ROLES[entry.roleId];
                  const selected = desiredRoleId === entry.roleId;
                  const enoughPlayers =
                    activePlayers.length >= entry.minPlayers || roomState.settings.fillWithBots;
                  const disabled = roleBusy || !entry.compatibleWithMode || !enoughPlayers;
                  return (
                    <button
                      key={`${entry.roleId}_${entry.source}`}
                      type="button"
                      disabled={disabled}
                      onClick={async () => {
                        setRoleBusy(true);
                        await selectDesiredRole(selected ? null : entry.roleId);
                        setRoleBusy(false);
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-45 ${
                        selected
                          ? 'bg-[#E7B65B] text-[#090B12] border-[#E7B65B]'
                          : 'bg-[#111522] text-[#F5F5F7] border-white/15 hover:border-[#E7B65B]/50'
                      }`}
                    >
                      <span>{roleDef ? roleDef.name[lang] : entry.roleId}</span>
                      <span className="font-mono text-[10px] opacity-80">
                        {entry.source === 'UNLOCK'
                          ? lang === 'uz'
                            ? 'Doimiy'
                            : 'Пост.'
                          : `x${entry.remainingUses}`}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#F5F5F7]/55">
                {lang === 'uz'
                  ? 'Jeton faqat o‘yin boshlanib, rol berilgandan keyin sarflanadi.'
                  : 'Жетон списывается только после старта матча и выдачи роли.'}
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            {activePlayers.length < 5 && (
              <p className="text-xs text-[#E7B65B]">{t.room.waitingPlayers}</p>
            )}
            <div className="flex items-center gap-3 ml-auto">
              {!isHost && (
                <button
                  onClick={toggleReady}
                  className={`px-5 py-3 rounded-xl text-sm font-bold transition-colors min-h-[44px] ${
                    me?.isReady
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-[#E63946] text-white'
                  }`}
                >
                  {me?.isReady ? t.room.ready : t.room.notReady}
                </button>
              )}

              {isHost && (
                <button
                  onClick={startGame}
                  disabled={activePlayers.length < 5 && !roomState.settings.fillWithBots}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E63946] text-sm font-bold text-white hover:bg-[#E63946]/90 disabled:opacity-40 transition-colors min-h-[44px]"
                >
                  <Play className="w-4 h-4" />
                  {t.room.startGame}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lobby Chat */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col h-[420px]">
          <h3 className="font-display text-base font-bold text-[#F5F5F7] mb-3">
            {t.game.chatPublic}
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {chatMessages.map((m) => (
              <div key={m.id} className="text-xs leading-relaxed">
                <span className="font-semibold text-[#E7B65B]">{m.senderName}: </span>
                <span className="text-[#F5F5F7]/85">{m.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSend} className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder={t.game.messagePlaceholder}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#E63946]"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-[#E63946] text-white hover:bg-[#E63946]/90 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
