import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

const AVATARS = [
  { id: 'crimson', label: 'Crimson', bg: 'bg-[#E63946]' },
  { id: 'gold', label: 'Gold', bg: 'bg-[#E7B65B]' },
  { id: 'violet', label: 'Violet', bg: 'bg-[#A855F7]' },
  { id: 'obsidian', label: 'Obsidian', bg: 'bg-slate-600' },
];

export const AuthPage: React.FC = () => {
  const { t, lang, login, register, showToast, refreshUser } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('crimson');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<
    Array<{ id: string; username: string; email: string; avatar: string; token: string }>
  >(() => {
    try {
      const raw = localStorage.getItem('mafia_remembered_profiles');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const resumeSavedProfile = async (profile: { email: string; token: string }) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${profile.token}` },
      });
      if (res.ok) {
        localStorage.setItem('mafia_token', profile.token);
        await refreshUser();
        showToast(lang === 'uz' ? 'Hisob tiklandi!' : 'Профиль восстановлен!', 'success');
      } else {
        setEmail(profile.email);
        setSavedProfiles((prev) => {
          const next = prev.filter((p) => p.email !== profile.email);
          localStorage.setItem('mafia_remembered_profiles', JSON.stringify(next));
          return next;
        });
        setError(
          lang === 'uz'
            ? 'Sessiya muddati tugagan. Parolni kiriting.'
            : 'Срок сессии истёк. Введите пароль.'
        );
      }
    } catch {
      setEmail(profile.email);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register(username, email, password, avatar);
      } else {
        const res = await fetch('/api/auth/recover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast(
          lang === 'uz'
            ? 'Tiklash ko‘rsatmasi yuborildi.'
            : 'Инструкция по восстановлению отправлена.',
          'success'
        );
        setMode('login');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      if (msg === 'Invalid email or password') {
        setError(
          lang === 'uz'
            ? 'Elektron pochta yoki parol noto‘g‘ri'
            : 'Неверный email или пароль'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12 pb-24">
      <div className="glass-panel-elevated w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[#090B12] border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'login' ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65 hover:text-[#F5F5F7]'
            }`}
          >
            {t.nav.login}
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'register' ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65 hover:text-[#F5F5F7]'
            }`}
          >
            {t.nav.register}
          </button>
        </div>

        <h1 className="font-display text-2xl font-bold text-[#F5F5F7]">
          {mode === 'login'
            ? t.auth.loginTitle
            : mode === 'register'
              ? t.auth.registerTitle
              : t.auth.recoverTitle}
        </h1>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[#E63946]/15 border border-[#E63946]/40 text-xs text-[#F5F5F7]">
            {error}
          </div>
        )}

        {mode === 'login' && savedProfiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#F5F5F7]/50">
              {lang === 'uz' ? 'Eslab qolingan profillar' : 'Сохранённые профили'}
            </p>
            <div className="flex flex-wrap gap-2">
              {savedProfiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => resumeSavedProfile(p)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090B12] border border-white/10 hover:border-[#E7B65B]/50 text-xs font-semibold text-[#F5F5F7] transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {p.username}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#F5F5F7]/75 mb-1.5">
                {t.auth.username}
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                minLength={3}
                maxLength={24}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#090B12] border border-white/10 text-sm text-[#F5F5F7] focus:outline-none focus:border-[#E63946]"
                placeholder="Agent007"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#F5F5F7]/75 mb-1.5">
              {t.auth.email}
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#090B12] border border-white/10 text-sm text-[#F5F5F7] focus:outline-none focus:border-[#E63946]"
              placeholder="name@example.com"
            />
          </div>

          {mode !== 'recover' && (
            <div>
              <label className="block text-xs font-medium text-[#F5F5F7]/75 mb-1.5">
                {t.auth.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-[#090B12] border border-white/10 text-sm text-[#F5F5F7] focus:outline-none focus:border-[#E63946]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F5F5F7]/50 hover:text-[#F5F5F7]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#F5F5F7]/75 mb-2">
                Avatar
              </label>
              <div className="grid grid-cols-4 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatar(av.id)}
                    className={`py-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                      avatar === av.id
                        ? 'border-[#E7B65B] bg-white/10'
                        : 'border-white/10 bg-[#090B12] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full ${av.bg}`} />
                    <span>{av.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#E63946] text-sm font-bold text-white hover:bg-[#E63946]/90 disabled:opacity-50 transition-colors min-h-[48px]"
          >
            {loading
              ? '...'
              : mode === 'login'
                ? t.auth.submitLogin
                : mode === 'register'
                  ? t.auth.submitRegister
                  : t.auth.recoverTitle}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs text-[#F5F5F7]/65">
          {mode !== 'recover' ? (
            <button onClick={() => setMode('recover')} className="hover:text-[#E7B65B]">
              {t.auth.forgotPassword}
            </button>
          ) : (
            <button onClick={() => setMode('login')} className="hover:text-[#E7B65B]">
              {t.auth.backToLogin}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
