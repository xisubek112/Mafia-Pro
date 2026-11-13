import React, { useEffect, useState } from 'react';
import {
  Ban,
  Check,
  CheckCircle,
  Clock,
  Crown,
  Flag,
  Link2,
  Lock,
  MessageSquare,
  Plus,
  Search,
  Send,
  Shield,
  Sparkles,
  Trophy,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  ClanInvitation,
  ClanRecord,
  ConversationSummary,
  DirectMessage,
  RecentPlayerEntry,
  UserProfile,
} from '../shared/types';

interface SocialUserCard {
  id: string;
  username: string;
  avatar: string;
  level: number;
  rating: number;
  country: string;
  isOnline: boolean;
}

interface SocialOverview {
  friends: SocialUserCard[];
  requestsIn: SocialUserCard[];
  requestsOut: SocialUserCard[];
  blocked: SocialUserCard[];
  recentPlayers: RecentPlayerEntry[];
}

export const SocialPage: React.FC = () => {
  const { user, token, lang, showToast, navigate, socket, askConfirm, refreshUser } = useApp();
  const [activeTab, setActiveTab] = useState<'FRIENDS' | 'CLANS' | 'MESSAGES'>('FRIENDS');

  // Friends state
  const [data, setData] = useState<SocialOverview | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);

  // Clans state
  const [clans, setClans] = useState<ClanRecord[]>([]);
  const [myClan, setMyClan] = useState<ClanRecord | null>(null);
  const [clanInvitations, setClanInvitations] = useState<ClanInvitation[]>([]);
  const [createClanModal, setCreateClanModal] = useState(false);
  const [newClanName, setNewClanName] = useState('');
  const [newClanTag, setNewClanTag] = useState('');
  const [newClanDesc, setNewClanDesc] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState('');

  // Messaging state
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [dmText, setDmText] = useState('');
  const [dmLoading, setDmLoading] = useState(false);

  const loadSocial = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/social', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setData(await res.json());
    } catch {
      //
    }
  };

  const loadClans = async () => {
    try {
      const res = await fetch('/api/clans');
      if (res.ok) {
        const d = await res.json();
        setClans(d.clans || []);
        if (user?.clanId) {
          const mine = (d.clans || []).find((c: ClanRecord) => c.id === user.clanId);
          setMyClan(mine || null);
        } else {
          setMyClan(null);
        }
      }
      if (token) {
        const invRes = await fetch('/api/clans/invitations/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (invRes.ok) {
          const invData = await invRes.json();
          setClanInvitations(invData.invitations || []);
        }
      }
    } catch {
      //
    }
  };

  const loadConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/messages/conversations', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setConversations(d.conversations || []);
        if (!activePartnerId && d.conversations?.length > 0) {
          setActivePartnerId(d.conversations[0].partnerId);
        }
      }
    } catch {
      //
    }
  };

  const loadDirectMessages = async (partnerId: string) => {
    if (!token || !partnerId) return;
    try {
      const res = await fetch(`/api/messages/${partnerId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setDirectMessages(d.messages || []);
      }
    } catch {
      //
    }
  };

  useEffect(() => {
    loadSocial();
    loadClans();
    loadConversations();
  }, [token, user?.id, user?.clanId]);

  useEffect(() => {
    if (activePartnerId) {
      loadDirectMessages(activePartnerId);
    }
  }, [activePartnerId, token]);

  useEffect(() => {
    if (!socket) return;
    const onNewDm = (msg: DirectMessage) => {
      if (msg.senderId === activePartnerId || msg.recipientId === activePartnerId) {
        setDirectMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      loadConversations();
    };
    socket.on('direct_message:new', onNewDm);
    return () => {
      socket.off('direct_message:new', onNewDm);
    };
  }, [socket, activePartnerId]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[#F5F5F7]/70 mb-4">
          {lang === 'uz' ? 'Ijtimoiy tizim uchun hisobingizga kiring.' : 'Войдите для доступа к сообществу.'}
        </p>
        <button
          onClick={() => navigate('auth')}
          className="px-6 py-3 rounded-xl bg-[#E63946] text-sm font-bold text-white shadow-lg shadow-[#E63946]/25"
        >
          {lang === 'uz' ? 'Kirish' : 'Войти'}
        </button>
      </div>
    );
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const res = await fetch(`/api/social/search?q=${encodeURIComponent(search)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json();
    setResults(d.players || []);
  };

  const postAction = async (endpoint: string, body: Record<string, string>, msg?: string) => {
    if (!token) return;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) return showToast(d.error || 'Error', 'error');
    setData(d);
    if (msg) showToast(msg, 'success');
  };

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch('/api/clans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newClanName,
          tag: newClanTag,
          description: newClanDesc,
        }),
      });
      const d = await res.json();
      if (!res.ok) return showToast(d.error || 'Clan creation failed', 'error');
      showToast(lang === 'uz' ? 'Klan muvaffaqiyatli yaratildi!' : 'Клан успешно создан!', 'success');
      setCreateClanModal(false);
      setNewClanName('');
      setNewClanTag('');
      setNewClanDesc('');
      await refreshUser();
      loadClans();
    } catch {
      showToast('Error creating clan', 'error');
    }
  };

  const handleRespondClanInvite = async (invId: string, accept: boolean) => {
    if (!token) return;
    const res = await fetch(`/api/clans/invitations/${invId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ accept }),
    });
    const d = await res.json();
    if (!res.ok) return showToast(d.error || 'Error', 'error');
    showToast(
      accept
        ? lang === 'uz'
          ? 'Klanga qo‘shildingiz!'
          : 'Вы вступили в клан!'
        : lang === 'uz'
          ? 'Taklif rad etildi'
          : 'Приглашение отклонено',
      accept ? 'success' : 'info'
    );
    await refreshUser();
    loadClans();
  };

  const handleInviteToClan = async (targetUserId: string) => {
    if (!token || !myClan) return;
    const res = await fetch(`/api/clans/${myClan.id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUserId }),
    });
    const d = await res.json();
    if (!res.ok) return showToast(d.error || 'Invite failed', 'error');
    showToast(lang === 'uz' ? 'Klan taklifi yuborildi!' : 'Приглашение в клан отправлено!', 'success');
  };

  const handleLeaveClan = () => {
    if (!token) return;
    askConfirm(
      lang === 'uz' ? 'Klandan chiqish' : 'Покинуть клан',
      lang === 'uz' ? 'Rostdan ham klandan chiqmoqchimisiz?' : 'Действительно покинуть клан?',
      async () => {
        const res = await fetch('/api/clans/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          showToast(lang === 'uz' ? 'Klandan chiqdingiz' : 'Вы покинули клан', 'info');
          setMyClan(null);
          await refreshUser();
          loadClans();
        }
      }
    );
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !myClan || !newAnnouncement.trim()) return;
    const res = await fetch(`/api/clans/${myClan.id}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: newAnnouncement }),
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'E’lon joylashtirildi' : 'Объявление опубликовано', 'success');
      setNewAnnouncement('');
      loadClans();
    }
  };

  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activePartnerId || !dmText.trim()) return;
    setDmLoading(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: activePartnerId, text: dmText.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setDirectMessages((prev) => [...prev, d.message]);
        setDmText('');
        loadConversations();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to send', 'error');
      }
    } catch {
      showToast('Connection error', 'error');
    } finally {
      setDmLoading(false);
    }
  };

  const activePartner = conversations.find((c) => c.partnerId === activePartnerId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7]">
            {lang === 'uz' ? 'Hamjamiyat va Aloqa' : 'Сообщество и Связь'}
          </h1>
          <p className="mt-1 text-sm text-[#F5F5F7]/65">
            {lang === 'uz'
              ? 'Do‘stlaringizni boshqaring, klanlar tuzing va 1-on-1 xabarlashing.'
              : 'Управляйте друзьями, создавайте кланы и общайтесь тет-а-тет.'}
          </p>
        </div>

        {/* Tab switchers */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#111522] border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('FRIENDS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'FRIENDS'
                ? 'bg-[#E63946] text-white shadow-md shadow-[#E63946]/20'
                : 'text-[#F5F5F7]/65 hover:text-[#F5F5F7]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {lang === 'uz' ? 'Do‘stlar' : 'Друзья'}
          </button>
          <button
            onClick={() => setActiveTab('CLANS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'CLANS'
                ? 'bg-[#E7B65B] text-[#090B12] shadow-md shadow-[#E7B65B]/20'
                : 'text-[#F5F5F7]/65 hover:text-[#F5F5F7]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            {lang === 'uz' ? 'Klanlar' : 'Кланы'}
          </button>
          <button
            onClick={() => setActiveTab('MESSAGES')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'MESSAGES'
                ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20'
                : 'text-[#F5F5F7]/65 hover:text-[#F5F5F7]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {lang === 'uz' ? 'Shaxsiy Xabarlar' : 'Личные сообщения'}
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: FRIENDS ==================== */}
      {activeTab === 'FRIENDS' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={lang === 'uz' ? 'Foydalanuvchi nomi bo‘yicha izlash...' : 'Поиск игрока по никнейму...'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#121626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#E63946]"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#E63946] text-xs font-bold text-white hover:bg-[#d62839] transition-colors shrink-0"
              >
                {lang === 'uz' ? 'Qidirish' : 'Найти'}
              </button>
            </form>
          </div>

          {/* Search results if any */}
          {results.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-white flex items-center justify-between">
                <span>{lang === 'uz' ? 'Qidiruv natijalari' : 'Результаты поиска'}</span>
                <button onClick={() => setResults([])} className="text-xs text-white/50 hover:text-white">
                  {lang === 'uz' ? 'Yopish' : 'Закрыть'}
                </button>
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-[#121626] border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-white">{p.username}</p>
                      <p className="text-[10px] text-white/60">Reyting: {p.rating}</p>
                    </div>
                    <button
                      onClick={() => postAction('/api/social/request', { targetId: p.id }, 'Taklif yuborildi')}
                      className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incoming Requests */}
          {data?.requestsIn && data.requestsIn.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 border border-[#E7B65B]/30 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#E7B65B] flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                {lang === 'uz' ? 'Kelgan Do‘stlik Takliflari' : 'Входящие заявки в друзья'} ({data.requestsIn.length})
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.requestsIn.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-[#121626] border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-white">{r.username}</p>
                      <p className="text-[10px] text-[#E7B65B]">{r.rating} ELO</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => postAction('/api/social/accept', { requesterId: r.id }, 'Qabul qilindi')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => postAction('/api/social/decline', { requesterId: r.id }, 'Rad etildi')}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-bold hover:bg-white/20"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#E63946]" />
                {lang === 'uz' ? 'Mening Do‘stlarim' : 'Мои друзья'} ({data?.friends?.length || 0})
              </span>
            </h3>

            {!data?.friends || data.friends.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <p className="text-xs text-white/50 italic">
                  {lang === 'uz'
                    ? 'Hozircha do‘stlar yo‘q. Yuqoridagi qidiruv orqali o‘yinchilarni toping.'
                    : 'Пока нет друзей. Найдите игроков через поиск выше.'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.friends.map((f) => (
                  <div key={f.id} className="p-3.5 rounded-xl bg-[#121626] border border-white/10 flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-[#1a2035] border border-white/15 flex items-center justify-center font-bold text-xs text-white">
                          {f.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#121626] ${
                            f.isOnline ? 'bg-emerald-400' : 'bg-white/30'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-white flex items-center gap-1.5">
                          {f.username}
                          <span className="text-[10px] text-white/40 font-normal font-mono">{f.rating} ELO</span>
                        </p>
                        <span className="text-[10px] text-white/50">
                          {f.isOnline ? (lang === 'uz' ? 'Onlayn' : 'В сети') : lang === 'uz' ? 'Oflayn' : 'Не в сети'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {myClan && (myClan.leaderId === user.id || myClan.members.some((m) => m.userId === user.id && m.role === 'OFFICER')) && (
                        <button
                          onClick={() => handleInviteToClan(f.id)}
                          className="p-2 rounded-lg bg-[#E7B65B]/15 text-[#E7B65B] hover:bg-[#E7B65B]/25 transition-colors"
                          title={lang === 'uz' ? 'Klanga taklif qilish' : 'Пригласить в клан'}
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActivePartnerId(f.id);
                          setActiveTab('MESSAGES');
                        }}
                        className="p-2 rounded-lg bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition-colors"
                        title={lang === 'uz' ? 'Xabar yozish' : 'Написать сообщение'}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => postAction('/api/social/remove', { friendId: f.id }, 'O‘chirildi')}
                        className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-300 transition-colors"
                        title={lang === 'uz' ? 'Do‘stlardan o‘chirish' : 'Удалить из друзей'}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: CLANS ==================== */}
      {activeTab === 'CLANS' && (
        <div className="space-y-6">
          {/* Pending Clan Invitations */}
          {clanInvitations.length > 0 && !myClan && (
            <div className="glass-panel rounded-2xl p-5 border border-[#E7B65B]/40 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#E7B65B] flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {lang === 'uz' ? 'Klan Taklifnomalari' : 'Приглашения в клан'} ({clanInvitations.length})
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {clanInvitations.map((inv) => (
                  <div key={inv.id} className="p-3.5 rounded-xl bg-[#121626] border border-white/10 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-xs text-white">
                        [{inv.clanTag}] {inv.clanName}
                      </p>
                      <p className="text-[10px] text-white/60">
                        {lang === 'uz' ? 'Taklif qiluvchi:' : 'Пригласил:'} {inv.inviterName}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleRespondClanInvite(inv.id, true)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRespondClanInvite(inv.id, false)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-bold"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Clan Banner or Create CTA */}
          {myClan ? (
            <div className="glass-panel rounded-2xl p-6 border border-[#E7B65B]/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E7B65B] to-[#B45309] text-[#090B12] font-black text-lg flex items-center justify-center shadow-lg shadow-[#E7B65B]/20">
                    [{myClan.tag}]
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                      {myClan.name}
                      <span className="px-2 py-0.5 rounded-full bg-[#E7B65B]/20 text-[#E7B65B] text-xs font-bold border border-[#E7B65B]/40">
                        {myClan.level}-Daraja
                      </span>
                    </h2>
                    <p className="text-xs text-white/70">{myClan.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white font-mono">
                    {myClan.members.length} / {myClan.memberLimit} {lang === 'uz' ? 'a’zo' : 'участников'}
                  </span>
                  <button
                    onClick={handleLeaveClan}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-bold transition-all"
                  >
                    {lang === 'uz' ? 'Klandan chiqish' : 'Покинуть клан'}
                  </button>
                </div>
              </div>

              {/* Announcements Section */}
              <div className="p-4 rounded-xl bg-[#121626] border border-white/10 space-y-2.5">
                <h4 className="text-xs font-bold text-[#E7B65B] uppercase tracking-wider">
                  📢 {lang === 'uz' ? 'Klan E’lonlari' : 'Объявления клана'}
                </h4>
                {myClan.announcements && myClan.announcements.length > 0 ? (
                  myClan.announcements.slice(0, 3).map((a) => (
                    <div key={a.id} className="text-xs text-white/85 flex items-start gap-2">
                      <span className="text-[#E7B65B] font-semibold">{a.author}:</span>
                      <span>{a.text}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/40 italic">
                    {lang === 'uz' ? 'Hozircha e’lonlar yo‘q.' : 'Пока нет объявлений.'}
                  </p>
                )}

                {(myClan.leaderId === user.id || myClan.members.some((m) => m.userId === user.id && m.role === 'OFFICER')) && (
                  <form onSubmit={handlePostAnnouncement} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      placeholder={lang === 'uz' ? 'Yangi e’lon yozing...' : 'Напишите объявление...'}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#090B12] border border-white/10 text-xs text-white focus:outline-none focus:border-[#E7B65B]"
                    />
                    <button
                      type="submit"
                      disabled={!newAnnouncement.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#E7B65B] text-[#090B12] text-xs font-bold disabled:opacity-40"
                    >
                      {lang === 'uz' ? 'Joylash' : 'Пост'}
                    </button>
                  </form>
                )}
              </div>

              {/* Members List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  {lang === 'uz' ? 'Klan A’zolari' : 'Участники клана'}
                </h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {myClan.members.map((m) => (
                    <div key={m.userId} className="p-3 rounded-xl bg-[#121626] border border-white/10 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{m.username}</span>
                          {m.role === 'LEADER' && <Crown className="w-3.5 h-3.5 text-[#E7B65B]" />}
                          {m.role === 'OFFICER' && <Shield className="w-3 h-3 text-sky-400" />}
                        </div>
                        <p className="text-[10px] text-white/50">{m.rating} ELO</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-white/80">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 text-center space-y-4 border border-dashed border-white/20">
              <div className="w-16 h-16 rounded-2xl bg-[#E7B65B]/15 border border-[#E7B65B]/30 flex items-center justify-center mx-auto text-[#E7B65B]">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  {lang === 'uz' ? 'Siz hali klanga a’zo emassiz' : 'Вы пока не состоите в клане'}
                </h3>
                <p className="text-xs text-white/60 max-w-md mx-auto mt-1">
                  {lang === 'uz'
                    ? 'O‘z jamoangizni tuzing yoki mavjud klanlardan biriga qo‘shilib reyting uchun kurashing!'
                    : 'Создайте свой клан за 500 золота или вступите в существующий клан!'}
                </p>
              </div>
              <button
                onClick={() => setCreateClanModal(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E7B65B] to-[#B45309] text-[#090B12] text-xs font-bold shadow-lg shadow-[#E7B65B]/25 hover:brightness-110 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {lang === 'uz' ? 'Yangi Klan Yaratish (500 Oltin)' : 'Создать клан (500 золота)'}
              </button>
            </div>
          )}

          {/* Global Clan Leaderboard */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#E7B65B]" />
              {lang === 'uz' ? 'Klanlar Reytingi (Top Clans)' : 'Рейтинг Кланов'}
            </h3>

            <div className="space-y-2">
              {clans.map((c, idx) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-[#121626] border border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black w-6 text-[#E7B65B]">#{idx + 1}</span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-white">
                      [{c.tag}]
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-white">{c.name}</h4>
                      <p className="text-[10px] text-white/50">
                        {lang === 'uz' ? 'Yetakchi: ' : 'Лидер: '}
                        {c.leaderName} · {c.members.length} {lang === 'uz' ? 'a’zo' : 'уч.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-[#E7B65B]">{c.totalRating}</span>
                    <p className="text-[10px] text-white/50">{lang === 'uz' ? 'Umumiy ELO' : 'Общий ELO'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: DIRECT MESSAGES ==================== */}
      {activeTab === 'MESSAGES' && (
        <div className="grid lg:grid-cols-12 gap-5 h-[580px]">
          {/* Conversation list */}
          <div className="lg:col-span-4 glass-panel rounded-2xl p-4 flex flex-col min-h-0">
            <h3 className="font-display text-sm font-bold text-white mb-3">
              {lang === 'uz' ? 'Suhbatlar' : 'Беседы'} ({conversations.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-white/50 italic text-center py-8">
                  {lang === 'uz' ? 'Hali xabarlar yo‘q.' : 'Пока нет переписок.'}
                </p>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.partnerId}
                    onClick={() => setActivePartnerId(c.partnerId)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      activePartnerId === c.partnerId
                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/50'
                        : 'bg-[#121626] border-white/10 hover:bg-[#1a2035]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {c.partnerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-white truncate">{c.partnerName}</p>
                        <p className="text-[11px] text-white/60 truncate">{c.lastMessage}</p>
                      </div>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#E63946] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Chat Area */}
          <div className="lg:col-span-8 glass-panel rounded-2xl p-4 flex flex-col min-h-0">
            {activePartnerId ? (
              <>
                <div className="pb-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] text-white font-bold text-xs flex items-center justify-center">
                      {activePartner?.partnerName.slice(0, 2).toUpperCase() || 'P'}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">{activePartner?.partnerName || 'Player'}</h4>
                      <span className="text-[10px] text-white/50">
                        {activePartner?.isOnline ? (lang === 'uz' ? 'Onlayn' : 'В сети') : 'Oflayn'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {directMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex gap-2 max-w-[80%] ${m.senderId === user.id ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          m.senderId === user.id
                            ? 'bg-[#8B5CF6] text-white rounded-tr-none'
                            : 'bg-[#121626] border border-white/10 text-white rounded-tl-none'
                        }`}
                      >
                        {m.text}
                        <div className="text-[9px] opacity-60 text-right mt-1 font-mono">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendDM} className="pt-3 border-t border-white/10 flex gap-2">
                  <input
                    type="text"
                    value={dmText}
                    onChange={(e) => setDmText(e.target.value)}
                    placeholder={lang === 'uz' ? 'Xabar yozing...' : 'Напишите сообщение...'}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#121626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                  <button
                    type="submit"
                    disabled={!dmText.trim() || dmLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold disabled:opacity-40 hover:bg-[#7c3aed] flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-white/40 italic">
                {lang === 'uz' ? 'Suhbatlashish uchun chapdan birini tanlang' : 'Выберите собеседника слева'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Clan Modal */}
      {createClanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#090B12] border border-white/15 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#E7B65B]" />
                {lang === 'uz' ? 'Yangi Klan Yaratish' : 'Создание нового клана'}
              </h3>
              <button onClick={() => setCreateClanModal(false)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClan} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">
                  {lang === 'uz' ? 'Klan Tegi (2-5 ta belgi)' : 'Тег клана (2-5 знаков)'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={newClanTag}
                  onChange={(e) => setNewClanTag(e.target.value.toUpperCase())}
                  placeholder="DON"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121626] border border-white/10 text-xs text-white uppercase font-mono font-bold focus:outline-none focus:border-[#E7B65B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">
                  {lang === 'uz' ? 'Klan Nomi' : 'Название клана'}
                </label>
                <input
                  type="text"
                  required
                  value={newClanName}
                  onChange={(e) => setNewClanName(e.target.value)}
                  placeholder="Corleone Family"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#E7B65B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">
                  {lang === 'uz' ? 'Tavsif' : 'Описание'}
                </label>
                <textarea
                  rows={3}
                  value={newClanDesc}
                  onChange={(e) => setNewClanDesc(e.target.value)}
                  placeholder="Mafia Pro professionallari..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#E7B65B] resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#E7B65B]/10 border border-[#E7B65B]/30 text-xs text-[#E7B65B]">
                💰 {lang === 'uz' ? 'Klan yaratish narxi: 500 Oltin' : 'Стоимость создания: 500 золота'}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E7B65B] to-[#B45309] text-[#090B12] text-xs font-bold shadow-lg shadow-[#E7B65B]/25 hover:brightness-110 transition-all"
              >
                {lang === 'uz' ? 'Klan Yaratish' : 'Создать клан'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
