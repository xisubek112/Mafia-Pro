import React from 'react';
import { Mic, MicOff, PhoneCall, PhoneOff, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useVoiceChat } from '../hooks/useVoiceChat';

export const VoicePanel: React.FC = () => {
  const { socket, roomState, t } = useApp();
  const {
    status,
    isMuted,
    isSpeaking,
    allowedChannel,
    peerStates,
    joinVoice,
    leaveVoice,
    toggleMute,
  } = useVoiceChat(socket, roomState);

  if (!roomState) return null;

  const myId = roomState.myPrivateData?.playerId;
  const me = roomState.players.find((p) => p.id === myId);

  const activeSpeakers = roomState.players.filter((p) => {
    if (p.id === myId) return status === 'connected' && isSpeaking;
    const ps = peerStates[p.id];
    return ps?.isSpeaking && !ps?.isMuted;
  });

  const statusText =
    status === 'connected'
      ? t.game.voiceConnected
      : status === 'connecting'
        ? t.game.voiceConnecting
        : status === 'denied'
          ? t.game.voiceDenied
          : t.game.voiceDisconnected;

  const lockNote =
    allowedChannel === 'MUTED'
      ? me?.isSilenced
        ? t.game.voiceLockedSilenced
        : t.game.voiceLockedNight
      : allowedChannel === 'MAFIA'
        ? t.game.voiceMafiaOnly
        : allowedChannel === 'DEAD'
          ? t.game.voiceDeadOnly
          : null;

  return (
    <div className="glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 border border-white/10">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
            status === 'connected'
              ? isSpeaking
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
              : 'bg-white/5 border-white/10 text-[#F5F5F7]/60'
          }`}
        >
          <Volume2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#F5F5F7]">{t.game.voiceTitle}</span>
            <span
              className={`text-[11px] font-semibold ${
                status === 'connected'
                  ? 'text-emerald-400'
                  : status === 'denied'
                    ? 'text-[#E63946]'
                    : 'text-[#F5F5F7]/50'
              }`}
            >
              · {statusText}
            </span>
          </div>
          {lockNote ? (
            <p className="text-[11px] text-[#E7B65B] truncate">{lockNote}</p>
          ) : activeSpeakers.length > 0 ? (
            <p className="text-[11px] text-emerald-300 truncate">
              {activeSpeakers.map((s) => s.username).join(', ')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {status === 'connected' ? (
          <>
            <button
              type="button"
              onClick={toggleMute}
              disabled={allowedChannel === 'MUTED'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 ${
                isMuted
                  ? 'bg-[#E63946]/20 text-[#E63946] border border-[#E63946]/40'
                  : 'bg-white/10 text-[#F5F5F7] hover:bg-white/15'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isMuted ? t.game.voiceUnmute : t.game.voiceMute}</span>
            </button>
            <button
              type="button"
              onClick={leaveVoice}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E63946]/15 hover:bg-[#E63946]/25 text-[#E63946] text-xs font-semibold border border-[#E63946]/30 transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.game.voiceLeave}</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={joinVoice}
            disabled={status === 'connecting'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>{t.game.voiceJoin}</span>
          </button>
        )}
      </div>
    </div>
  );
};
