import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { TRANSLATIONS } from '../shared/i18n';
import {
  ChatMessage,
  Language,
  RoomSettings,
  RoomStateView,
  UserProfile,
} from '../shared/types';
import { playTone } from '../utils/sound';

export type PageRoute =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'create_room'
  | 'join_room'
  | 'lobby'
  | 'game'
  | 'roles'
  | 'profile'
  | 'leaderboard'
  | 'history'
  | 'settings'
  | 'admin'
  | 'store'
  | 'inventory'
  | 'tournaments'
  | 'rewards'
  | 'social';

interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ConfirmDialogState {
  title: string;
  message: string;
  onConfirm: () => void;
}

interface AppContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (typeof TRANSLATIONS)[Language];
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  uiVolume: number;
  setUiVolume: (v: number) => void;
  ambientVolume: number;
  setAmbientVolume: (v: number) => void;
  rainEnabled: boolean;
  setRainEnabled: (v: boolean) => void;
  page: PageRoute;
  navigate: (p: PageRoute) => void;
  user: UserProfile | null;
  token: string | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, avatar: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  socketConnected: boolean;
  socket: Socket | null;
  serverClockOffset: number;
  roomState: RoomStateView | null;
  chatMessages: ChatMessage[];
  createRoom: (name: string, settings: RoomSettings) => Promise<string | null>;
  joinRoom: (code: string) => Promise<boolean>;
  kickPlayer: (targetId: string) => Promise<void>;
  leaveRoom: () => void;
  toggleReady: () => void;
  fillBots: (count?: number) => void;
  startGame: () => Promise<void>;
  submitNightAction: (targetId?: string, secondaryTargetId?: string) => Promise<void>;
  revealMayor: () => void;
  castVote: (targetId: string) => Promise<void>;
  skipPhase: () => void;
  playAgain: () => void;
  sendChat: (channel: 'PUBLIC' | 'MAFIA' | 'DEAD', text: string) => void;
  reactChat: (messageId: string, emoji: string) => void;
  showToast: (message: string, type?: ToastItem['type']) => void;
  askConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function getOrCreateGuestId(): string {
  const existing = localStorage.getItem('mafia_guest_id');
  if (existing) return existing;
  const id = `gst_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem('mafia_guest_id', id);
  return id;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('mafia_lang');
    return saved === 'ru' ? 'ru' : 'uz';
  });
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('mafia_sound') !== 'false';
  });
  const [uiVolume, setUiVolumeState] = useState<number>(() => {
    const v = Number(localStorage.getItem('mafia_ui_vol'));
    return Number.isFinite(v) && localStorage.getItem('mafia_ui_vol') !== null ? v : 0.7;
  });
  const [ambientVolume, setAmbientVolumeState] = useState<number>(() => {
    const v = Number(localStorage.getItem('mafia_amb_vol'));
    return Number.isFinite(v) && localStorage.getItem('mafia_amb_vol') !== null ? v : 0.55;
  });
  const [rainEnabled, setRainEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('mafia_rain') !== 'false';
  });
  const [page, setPage] = useState<PageRoute>('landing');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mafia_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [serverClockOffset, setServerClockOffset] = useState<number>(0);
  const [roomState, setRoomState] = useState<RoomStateView | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const prevPhaseRef = useRef<string | undefined>(undefined);
  const activeRoomCodeRef = useRef<string | null>(null);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  const askConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ title, message, onConfirm });
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('mafia_lang', l);
  };

  const setSoundEnabled = (v: boolean) => {
    setSoundEnabledState(v);
    localStorage.setItem('mafia_sound', String(v));
  };

  const setUiVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setUiVolumeState(clamped);
    localStorage.setItem('mafia_ui_vol', String(clamped));
  };

  const setAmbientVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setAmbientVolumeState(clamped);
    localStorage.setItem('mafia_amb_vol', String(clamped));
  };

  const setRainEnabled = (v: boolean) => {
    setRainEnabledState(v);
    localStorage.setItem('mafia_rain', String(v));
  };

  const navigate = useCallback((p: PageRoute) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem('mafia_token');
    if (!currentToken) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        const unread = (data.user?.notifications || []).filter((n: { read: boolean }) => !n.read);
        if (unread.length > 0) {
          showToast(`${unread[0].title}: ${unread[0].message}`, 'error');
          fetch('/api/notifications/read', {
            method: 'POST',
            headers: { Authorization: `Bearer ${currentToken}` },
          }).catch(() => {});
        }
        if (data.user?.role === 'ADMIN') {
          setPage((prev) => (prev === 'settings' ? 'settings' : 'admin'));
        } else {
          setPage((prev) => (prev === 'landing' || prev === 'auth' ? 'dashboard' : prev));
        }
      } else if (res.status === 401) {
        localStorage.removeItem('mafia_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      // ignore
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Connect Socket.IO
  useEffect(() => {
    const guestId = getOrCreateGuestId();
    const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;
    const socket = io(socketUrl, {
      auth: {
        token: token || '',
        guestId,
        guestName: user?.username || `Agent-${guestId.slice(-4).toUpperCase()}`,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      // Auto-rejoin active room after network drop
      if (activeRoomCodeRef.current) {
        socket.emit('room:join', { code: activeRoomCodeRef.current });
      } else {
        // Check ?room=CODE invite deep-link
        const params = new URLSearchParams(window.location.search);
        const inviteCode = params.get('room')?.trim().toUpperCase();
        if (inviteCode && inviteCode.length >= 4) {
          socket.emit('room:join', { code: inviteCode }, (res: { ok: boolean; error?: string }) => {
            if (res?.ok) {
              setPage('lobby');
              window.history.replaceState({}, '', window.location.pathname);
            } else if (res?.error) {
              showToast(res.error, 'error');
            }
          });
        }
      }
    });
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('room:state', (state: RoomStateView) => {
      activeRoomCodeRef.current = state.code;
      if (typeof state.serverTime === 'number') {
        setServerClockOffset(state.serverTime - Date.now());
      }
      setRoomState(state);
      if (prevPhaseRef.current !== state.phase) {
        const sOpts = { enabled: soundEnabled, uiVolume, ambientVolume };
        if (state.phase === 'NIGHT') playTone('night', sOpts);
        else if (state.phase === 'DAY') playTone('day', sOpts);
        else if (state.phase === 'VOTING') playTone('voting', sOpts);
        else if (state.phase === 'VICTORY') {
          playTone('victory', sOpts);
          refreshUser();
        }
        prevPhaseRef.current = state.phase;
      }

      if (state.phase === 'LOBBY') {
        setPage((curr) => (curr === 'game' || curr === 'create_room' || curr === 'join_room' ? 'lobby' : curr));
      } else {
        setPage((curr) => (curr === 'lobby' || curr === 'create_room' || curr === 'join_room' ? 'game' : curr));
      }
    });

    socket.on('room:kicked', () => {
      activeRoomCodeRef.current = null;
      setRoomState(null);
      setChatMessages([]);
      showToast(TRANSLATIONS[lang].room.kickedMessage, 'error');
      setPage(user ? 'dashboard' : 'landing');
    });

    socket.on('chat:history', (msgs: ChatMessage[]) => {
      setChatMessages(msgs);
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev.slice(-149), msg];
      });
    });

    socket.on('chat:reaction', (payload: { messageId: string; reactions: Record<string, string[]> }) => {
      setChatMessages((prev) =>
        prev.map((m) => (m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m))
      );
    });

    socket.on('user:notification', (payload: { title: string; message: string }) => {
      showToast(`${payload.title}: ${payload.message}`, 'error');
      refreshUser();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user?.username, soundEnabled, refreshUser]);

  const rememberProfile = (u: UserProfile, tok: string) => {
    try {
      const raw = localStorage.getItem('mafia_remembered_profiles');
      const existing: Array<{ id: string; username: string; email: string; avatar: string; token: string }> = raw ? JSON.parse(raw) : [];
      const next = [
        { id: u.id, username: u.username, email: u.email, avatar: u.avatar, token: tok },
        ...existing.filter((p) => p.id !== u.id && p.email !== u.email),
      ].slice(0, 5);
      localStorage.setItem('mafia_remembered_profiles', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('mafia_token', data.token);
    rememberProfile(data.user, data.token);
    setToken(data.token);
    setUser(data.user);
    showToast(lang === 'uz' ? 'Xush kelibsiz!' : 'Добро пожаловать!', 'success');
    navigate(data.user?.role === 'ADMIN' ? 'admin' : 'dashboard');
  };

  const register = async (username: string, email: string, password: string, avatar: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, avatar }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('mafia_token', data.token);
    rememberProfile(data.user, data.token);
    setToken(data.token);
    setUser(data.user);
    showToast(lang === 'uz' ? 'Hisob yaratildi!' : 'Аккаунт создан!', 'success');
    navigate('dashboard');
  };

  const logout = () => {
    localStorage.removeItem('mafia_token');
    setToken(null);
    setUser(null);
    setRoomState(null);
    navigate('landing');
  };

  const createRoom = (name: string, settings: RoomSettings): Promise<string | null> => {
    return new Promise((resolve) => {
      socketRef.current?.emit('room:create', { name, settings }, (res: { ok: boolean; code?: string; error?: string }) => {
        if (res?.ok && res.code) {
          setChatMessages([]);
          navigate('lobby');
          resolve(res.code);
        } else {
          showToast(res?.error || 'Failed to create room', 'error');
          resolve(null);
        }
      });
    });
  };

  const joinRoom = (code: string): Promise<boolean> => {
    return new Promise((resolve) => {
      socketRef.current?.emit('room:join', { code }, (res: { ok: boolean; error?: string }) => {
        if (res?.ok) {
          navigate('lobby');
          resolve(true);
        } else {
          showToast(res?.error || 'Room not found', 'error');
          resolve(false);
        }
      });
    });
  };

  const kickPlayer = (targetId: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!roomState) return resolve();
      socketRef.current?.emit(
        'room:kick',
        { code: roomState.code, targetId },
        (res: { ok: boolean; error?: string }) => {
          if (!res?.ok) showToast(res?.error || 'Failed to kick player', 'error');
          resolve();
        }
      );
    });
  };

  const leaveRoom = () => {
    if (!roomState) return;
    activeRoomCodeRef.current = null;
    socketRef.current?.emit('room:leave', { code: roomState.code });
    setRoomState(null);
    setChatMessages([]);
    navigate(user ? 'dashboard' : 'landing');
  };

  const toggleReady = () => {
    if (!roomState) return;
    playTone('click', soundEnabled);
    socketRef.current?.emit('room:ready', { code: roomState.code });
  };

  const fillBots = (count = 6) => {
    if (!roomState) return;
    socketRef.current?.emit('room:fillBots', { code: roomState.code, count });
  };

  const startGame = (): Promise<void> => {
    return new Promise((resolve) => {
      if (!roomState) return resolve();
      socketRef.current?.emit('game:start', { code: roomState.code }, (res: { ok: boolean; error?: string }) => {
        if (!res?.ok) {
          showToast(res?.error || 'Cannot start game', 'error');
        }
        resolve();
      });
    });
  };

  const submitNightAction = (targetId?: string, secondaryTargetId?: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!roomState) return resolve();
      socketRef.current?.emit(
        'game:nightAction',
        { code: roomState.code, targetId, secondaryTargetId },
        (res: { ok: boolean; error?: string }) => {
          if (res?.ok) {
            playTone('click', soundEnabled);
            showToast(lang === 'uz' ? 'Harakat yuborildi' : 'Действие отправлено', 'success');
          } else {
            showToast(res?.error || 'Invalid action', 'error');
          }
          resolve();
        }
      );
    });
  };

  const revealMayor = () => {
    if (!roomState) return;
    socketRef.current?.emit('game:mayorReveal', { code: roomState.code });
  };

  const castVote = (targetId: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!roomState) return resolve();
      socketRef.current?.emit('game:vote', { code: roomState.code, targetId }, (res: { ok: boolean; error?: string }) => {
        if (res?.ok) playTone('vote_cast', soundEnabled);
        else showToast(res?.error || 'Vote failed', 'error');
        resolve();
      });
    });
  };

  const skipPhase = () => {
    if (!roomState) return;
    socketRef.current?.emit('game:skipPhase', { code: roomState.code });
  };

  const playAgain = () => {
    if (!roomState) return;
    socketRef.current?.emit('game:playAgain', { code: roomState.code });
  };

  const sendChat = (channel: 'PUBLIC' | 'MAFIA' | 'DEAD', text: string) => {
    if (!roomState) return;
    socketRef.current?.emit('chat:send', { code: roomState.code, channel, text });
  };

  const reactChat = (messageId: string, emoji: string) => {
    if (!roomState) return;
    socketRef.current?.emit('chat:react', { code: roomState.code, messageId, emoji });
  };

  const t = TRANSLATIONS[lang];

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t,
        soundEnabled,
        setSoundEnabled,
        uiVolume,
        setUiVolume,
        ambientVolume,
        setAmbientVolume,
        rainEnabled,
        setRainEnabled,
        page,
        navigate,
        user,
        token,
        authLoading,
        login,
        register,
        logout,
        refreshUser,
        socketConnected,
        socket: socketRef.current,
        serverClockOffset,
        roomState,
        chatMessages,
        createRoom,
        joinRoom,
        kickPlayer,
        leaveRoom,
        toggleReady,
        fillBots,
        startGame,
        submitNightAction,
        revealMayor,
        castVote,
        skipPhase,
        playAgain,
        sendChat,
        reactChat,
        showToast,
        askConfirm,
      }}
    >
      {children}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border backdrop-blur-md transition-all ${
              toast.type === 'error'
                ? 'bg-[#E63946]/20 border-[#E63946]/40 text-[#F5F5F7]'
                : toast.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-[#F5F5F7]'
                  : 'bg-[#111522]/90 border-white/15 text-[#F5F5F7]'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel-elevated w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#F5F5F7]">{confirmDialog.title}</h3>
            <p className="mt-2 text-sm text-[#F5F5F7]/75 leading-relaxed">{confirmDialog.message}</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#F5F5F7]/80 hover:bg-white/10 transition-colors"
              >
                {lang === 'uz' ? 'Bekor qilish' : 'Отмена'}
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#E63946] text-white hover:bg-[#E63946]/90 transition-colors"
              >
                {lang === 'uz' ? 'Tasdiqlash' : 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
