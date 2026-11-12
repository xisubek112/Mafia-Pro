import React, { useEffect, useState } from 'react';
import { Award, Coins, Crown, Gem, Play, Plus, Trophy, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GameMode, Tournament, TournamentFormat } from '../shared/types';

export const TournamentsPage: React.FC = () => {
  const { user, token, lang, showToast, refreshUser, navigate } = useApp();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState('MAFIA PRO Arena Cup');
  const [format, setFormat] = useState<TournamentFormat>('SINGLE_ELIMINATION');
  const [mode, setMode] = useState<GameMode>('CLASSIC');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [prizeGold, setPrizeGold] = useState(1000);

  const load = async () => {
    const res = await fetch('/api/tournaments');
    const data = await res.json();
    const list: Tournament[] = data.tournaments || [];
    setTournaments(list);
    if (selected) {
      const updated = list.find((t) => t.id === selected.id);
      if (updated) setSelected(updated);
    } else if (list.length > 0) {
      setSelected(list[0]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return navigate('auth');
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, format, mode, maxPlayers, prizeGold, prizeDiamonds: 15, entryFeeGold: 0 }),
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Error', 'error');
    setShowCreate(false);
    setSelected(data.tournament);
    showToast(lang === 'uz' ? 'Turnir yaratildi!' : 'Турнир создан!', 'success');
    load();
  };

  const handleJoin = async (id: string) => {
    if (!token) return navigate('auth');
    const res = await fetch(`/api/tournaments/${id}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Error', 'error');
    showToast(lang === 'uz' ? 'Ro‘yxatdan o‘tdingiz!' : 'Вы зарегистрированы!', 'success');
    await refreshUser();
    load();
  };

  const handleStart = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/tournaments/${id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Error', 'error');
    showToast(lang === 'uz' ? 'Turnir boshlandi!' : 'Турнир начался!', 'success');
    load();
  };

  const handleReportResult = async (tournamentId: string, matchId: string, winnerId: string) => {
    if (!token) return;
    const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ winnerId }),
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Error', 'error');
    await refreshUser();
    load();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7] flex items-center gap-3">
            <Trophy className="w-7 h-7 text-[#E7B65B]" />
            {lang === 'uz' ? 'Turnirlar' : 'Турниры'}
          </h1>
          <p className="mt-1 text-sm text-[#F5F5F7]/65">
            {lang === 'uz'
              ? 'Single Elimination, Double Elimination va Round Robin musobaqalar.'
              : 'Соревнования в форматах Single Elimination, Double Elimination и Round Robin.'}
          </p>
        </div>

        <button
          onClick={() => (user ? setShowCreate(!showCreate) : navigate('auth'))}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E63946] text-xs font-bold text-white hover:bg-[#E63946]/90"
        >
          <Plus className="w-4 h-4" />
          {lang === 'uz' ? 'Turnir yaratish' : 'Создать турнир'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="glass-panel-elevated rounded-2xl p-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs text-[#F5F5F7]/70 mb-1">
              {lang === 'uz' ? 'Turnir nomi' : 'Название турнира'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-sm text-[#F5F5F7]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#F5F5F7]/70 mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as TournamentFormat)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7]"
            >
              <option value="SINGLE_ELIMINATION">Single Elimination</option>
              <option value="DOUBLE_ELIMINATION">Double Elimination</option>
              <option value="ROUND_ROBIN">Round Robin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#F5F5F7]/70 mb-1">Mode / Max</label>
            <div className="flex gap-2">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as GameMode)}
                className="flex-1 px-2 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7]"
              >
                <option value="CLASSIC">CLASSIC</option>
                <option value="ADVANCED">ADVANCED</option>
                <option value="CHAOS">CHAOS</option>
              </select>
              <input
                type="number"
                min={4}
                max={32}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-16 px-2 py-2.5 rounded-xl bg-[#090B12] border border-white/10 text-xs font-mono text-[#F5F5F7]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="py-2.5 px-4 rounded-xl bg-[#E7B65B] text-xs font-bold text-[#090B12] hover:bg-[#E7B65B]/90"
          >
            {lang === 'uz' ? 'Yaratish' : 'Создать'}
          </button>
        </form>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Tournaments List */}
        <div className="lg:col-span-5 space-y-3">
          {tournaments.map((trn) => (
            <div
              key={trn.id}
              onClick={() => setSelected(trn)}
              className={`glass-panel rounded-2xl p-5 cursor-pointer border transition-colors ${
                selected?.id === trn.id ? 'border-[#E7B65B]/60' : 'border-white/10 hover:border-white/25'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-[#F5F5F7]/60">
                <span>{trn.format.replace('_', ' ')}</span>
                <span className="font-bold text-[#E7B65B]">{trn.status}</span>
              </div>
              <h2 className="font-display text-lg font-bold text-[#F5F5F7] mt-1">{trn.name}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1 text-[#F5F5F7]/75">
                  <Users className="w-3.5 h-3.5 text-[#A855F7]" />
                  {trn.participants.length}/{trn.maxPlayers}
                </span>
                <span className="inline-flex items-center gap-1 text-[#E7B65B] font-mono font-bold">
                  <Coins className="w-3.5 h-3.5" />
                  {trn.prizeGold}
                </span>
                <span className="inline-flex items-center gap-1 text-[#38BDF8] font-mono font-bold">
                  <Gem className="w-3.5 h-3.5" />
                  {trn.prizeDiamonds}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Tournament Bracket & Details */}
        <div className="lg:col-span-7">
          {selected ? (
            <div className="glass-panel-elevated rounded-2xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#E7B65B]">{selected.mode} · {selected.format}</span>
                  <h2 className="font-display text-2xl font-bold text-[#F5F5F7] mt-1">{selected.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {selected.status === 'REGISTRATION' && user && !selected.participants.includes(user.id) && (
                    <button
                      onClick={() => handleJoin(selected.id)}
                      className="px-4 py-2.5 rounded-xl bg-[#E63946] text-xs font-bold text-white"
                    >
                      {lang === 'uz' ? 'Ro‘yxatdan o‘tish' : 'Участвовать'}
                    </button>
                  )}
                  {selected.status === 'REGISTRATION' &&
                    user &&
                    (user.role === 'ADMIN' || selected.createdBy === user.id) && (
                      <button
                        onClick={() => handleStart(selected.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs font-bold text-emerald-300"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {lang === 'uz' ? 'Boshlash' : 'Запустить'}
                      </button>
                    )}
                </div>
              </div>

              {/* Winners Podium */}
              {selected.status === 'COMPLETED' && selected.podiumIds.length > 0 && (
                <div className="p-4 rounded-xl bg-[#E7B65B]/10 border border-[#E7B65B]/35 flex items-center gap-3">
                  <Crown className="w-6 h-6 text-[#E7B65B]" />
                  <div>
                    <p className="text-xs font-bold text-[#E7B65B]">
                      {lang === 'uz' ? 'G‘oliblar shohsupasi' : 'Подиум победителей'}
                    </p>
                    <p className="text-sm font-semibold text-[#F5F5F7]">
                      1. {selected.podiumIds[0]}
                      {selected.podiumIds[1] ? ` · 2. ${selected.podiumIds[1]}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Bracket Matches */}
              <div>
                <h3 className="font-display text-sm font-bold text-[#F5F5F7] mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#E7B65B]" />
                  {lang === 'uz' ? 'Turnir jadvali va uchrashuvlar' : 'Сетка и матчи'}
                </h3>
                {selected.matches.length === 0 ? (
                  <p className="text-xs text-[#F5F5F7]/55 py-6 text-center">
                    {lang === 'uz'
                      ? 'Turnir boshlangandan so‘ng jadval shakllantiriladi.'
                      : 'Сетка будет сформирована после старта турнира.'}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {selected.matches.map((m) => {
                      const canManage =
                        user &&
                        (user.role === 'ADMIN' || selected.createdBy === user.id) &&
                        m.status === 'PENDING' &&
                        m.player1Id &&
                        m.player2Id;
                      return (
                        <div
                          key={m.id}
                          className="p-3.5 rounded-xl bg-[#090B12] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-mono text-[#E7B65B] mr-2">R{m.round}</span>
                            <span className={m.winnerId === m.player1Id ? 'text-emerald-400 font-bold' : 'text-[#F5F5F7]'}>
                              {m.player1Id || 'TBD'}
                            </span>
                            <span className="mx-2 text-[#F5F5F7]/40">vs</span>
                            <span className={m.winnerId === m.player2Id ? 'text-emerald-400 font-bold' : 'text-[#F5F5F7]'}>
                              {m.player2Id || 'BYE'}
                            </span>
                          </div>
                          {canManage ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleReportResult(selected.id, m.id, m.player1Id!)}
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-emerald-500/20 text-[11px]"
                              >
                                P1 Win
                              </button>
                              <button
                                onClick={() => handleReportResult(selected.id, m.id, m.player2Id!)}
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-emerald-500/20 text-[11px]"
                              >
                                P2 Win
                              </button>
                            </div>
                          ) : (
                            <span className="text-[#F5F5F7]/50">{m.status}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
