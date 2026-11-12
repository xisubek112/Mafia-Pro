import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { RoomStateView } from '../shared/types';

export type VoiceStatus = 'disconnected' | 'connecting' | 'connected' | 'denied';
export type VoiceChannel = 'PUBLIC' | 'MAFIA' | 'DEAD' | 'MUTED';

export interface PeerVoiceState {
  isMuted: boolean;
  isSpeaking: boolean;
  channel: VoiceChannel;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useVoiceChat(socket: Socket | null, roomState: RoomStateView | null) {
  const [status, setStatus] = useState<VoiceStatus>('disconnected');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [peerStates, setPeerStates] = useState<Record<string, PeerVoiceState>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const speakingTimerRef = useRef<number | null>(null);
  const activeCodeRef = useRef<string | null>(null);

  const myId = roomState?.myPrivateData?.playerId;
  const me = roomState?.players.find((p) => p.id === myId);
  const myTeam = roomState?.myPrivateData?.team;

  const allowedChannel: VoiceChannel = useMemo(() => {
    if (!roomState || !me) return 'PUBLIC';
    if (me.isSpectator || !me.isAlive) return 'DEAD';
    if (me.isSilenced && ['DAY', 'DISCUSSION', 'VOTING'].includes(roomState.phase)) return 'MUTED';
    if (roomState.phase === 'NIGHT') {
      return myTeam === 'MAFIA' ? 'MAFIA' : 'MUTED';
    }
    return 'PUBLIC';
  }, [roomState?.phase, me?.isAlive, me?.isSpectator, me?.isSilenced, myTeam]);

  const effectiveMuted = isMuted || allowedChannel === 'MUTED';

  const cleanupAllPeers = useCallback(() => {
    for (const pc of peersRef.current.values()) {
      pc.close();
    }
    peersRef.current.clear();
    for (const el of audioElsRef.current.values()) {
      el.pause();
      el.srcObject = null;
      el.remove();
    }
    audioElsRef.current.clear();
    setPeerStates({});
  }, []);

  const leaveVoice = useCallback(() => {
    if (speakingTimerRef.current) {
      window.clearInterval(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    cleanupAllPeers();
    if (socket && activeCodeRef.current) {
      socket.emit('voice:leave', { code: activeCodeRef.current });
    }
    activeCodeRef.current = null;
    setIsSpeaking(false);
    setStatus('disconnected');
  }, [socket, cleanupAllPeers]);

  // Enforce mute/unmute on local audio track & filter remote audio by channel
  useEffect(() => {
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getAudioTracks()) {
        track.enabled = !effectiveMuted;
      }
    }
    for (const [peerId, el] of audioElsRef.current.entries()) {
      const pState = peerStates[peerId];
      const compatible =
        allowedChannel === 'PUBLIC'
          ? !pState || pState.channel === 'PUBLIC'
          : pState?.channel === allowedChannel;
      el.muted = !compatible;
    }
    if (socket && activeCodeRef.current && status === 'connected') {
      socket.emit('voice:state', {
        code: activeCodeRef.current,
        isMuted: effectiveMuted,
        isSpeaking: effectiveMuted ? false : isSpeaking,
      });
    }
  }, [effectiveMuted, isSpeaking, allowedChannel, peerStates, socket, status]);

  // Auto-disconnect when leaving room
  useEffect(() => {
    if (!roomState && status !== 'disconnected') {
      leaveVoice();
    }
  }, [roomState, status, leaveVoice]);

  const createPeerConnection = useCallback(
    (peerId: string, code: string, initiator: boolean) => {
      if (peersRef.current.has(peerId)) {
        return peersRef.current.get(peerId)!;
      }
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peersRef.current.set(peerId, pc);

      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          pc.addTrack(track, localStreamRef.current);
        }
      }

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) {
          socket.emit('voice:ice-candidate', {
            code,
            targetId: peerId,
            candidate: e.candidate,
          });
        }
      };

      pc.ontrack = (e) => {
        let audio = audioElsRef.current.get(peerId);
        if (!audio) {
          audio = document.createElement('audio');
          audio.autoplay = true;
          audio.setAttribute('playsinline', 'true');
          document.body.appendChild(audio);
          audioElsRef.current.set(peerId, audio);
        }
        audio.srcObject = e.streams[0];
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          pc.close();
          peersRef.current.delete(peerId);
        }
      };

      if (initiator && socket) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('voice:offer', {
              code,
              targetId: peerId,
              sdp: pc.localDescription,
            });
          })
          .catch(() => {});
      }

      return pc;
    },
    [socket]
  );

  // Socket signaling listeners
  useEffect(() => {
    if (!socket || !roomState) return;
    const code = roomState.code;

    const onPeers = ({ peers }: { peers: string[] }) => {
      for (const peerId of peers) {
        if (peerId !== myId) {
          createPeerConnection(peerId, code, true);
        }
      }
    };

    const onPeerJoined = ({ peerId }: { peerId: string }) => {
      if (status === 'connected' && peerId !== myId) {
        createPeerConnection(peerId, code, false);
      }
    };

    const onPeerLeft = ({ peerId }: { peerId: string }) => {
      const pc = peersRef.current.get(peerId);
      if (pc) {
        pc.close();
        peersRef.current.delete(peerId);
      }
      const el = audioElsRef.current.get(peerId);
      if (el) {
        el.pause();
        el.srcObject = null;
        el.remove();
        audioElsRef.current.delete(peerId);
      }
      setPeerStates((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    };

    const onOffer = async ({ fromId, sdp }: { fromId: string; sdp: RTCSessionDescriptionInit }) => {
      if (status !== 'connected') return;
      const pc = createPeerConnection(fromId, code, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:answer', { code, targetId: fromId, sdp: pc.localDescription });
      } catch {
        // ignore signaling race
      }
    };

    const onAnswer = async ({ fromId, sdp }: { fromId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(fromId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch {
        // ignore
      }
    };

    const onIceCandidate = async ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(fromId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore
      }
    };

    const onPeerState = (payload: { peerId: string; isMuted: boolean; isSpeaking: boolean; channel: VoiceChannel }) => {
      setPeerStates((prev) => ({
        ...prev,
        [payload.peerId]: {
          isMuted: payload.isMuted,
          isSpeaking: payload.isSpeaking,
          channel: payload.channel,
        },
      }));
    };

    socket.on('voice:peers', onPeers);
    socket.on('voice:peer-joined', onPeerJoined);
    socket.on('voice:peer-left', onPeerLeft);
    socket.on('voice:offer', onOffer);
    socket.on('voice:answer', onAnswer);
    socket.on('voice:ice-candidate', onIceCandidate);
    socket.on('voice:peer-state', onPeerState);

    return () => {
      socket.off('voice:peers', onPeers);
      socket.off('voice:peer-joined', onPeerJoined);
      socket.off('voice:peer-left', onPeerLeft);
      socket.off('voice:offer', onOffer);
      socket.off('voice:answer', onAnswer);
      socket.off('voice:ice-candidate', onIceCandidate);
      socket.off('voice:peer-state', onPeerState);
    };
  }, [socket, roomState?.code, myId, status, createPeerConnection]);

  const joinVoice = useCallback(async () => {
    if (!socket || !roomState || status === 'connecting' || status === 'connected') return;
    setStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      activeCodeRef.current = roomState.code;

      // Setup Web Audio speaking detector
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        speakingTimerRef.current = window.setInterval(() => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          setIsSpeaking(avg > 18);
        }, 180);
      }

      setStatus('connected');
      socket.emit('voice:join', { code: roomState.code });
    } catch {
      setStatus('denied');
    }
  }, [socket, roomState, status]);

  const toggleMute = useCallback(() => {
    if (allowedChannel === 'MUTED') return;
    setIsMuted((prev) => !prev);
  }, [allowedChannel]);

  useEffect(() => {
    return () => {
      leaveVoice();
    };
  }, [leaveVoice]);

  return {
    status,
    isMuted: effectiveMuted,
    isSpeaking: effectiveMuted ? false : isSpeaking,
    allowedChannel,
    peerStates,
    joinVoice,
    leaveVoice,
    toggleMute,
  };
}
