import React from 'react';
import { ArrowRight, KeyRound, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from '../components/Navbar';
import heroNoirImg from '../assets/images/mafia_hero_noir_1794372513349.jpg';
import tableEmblemImg from '../assets/images/mafia_table_emblem_1794372514391.jpg';

export const LandingPage: React.FC = () => {
  const { t, lang, setLang, navigate, user } = useApp();

  return (
    <div className="min-h-screen pb-24 md:pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20 grid lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center rounded-lg bg-[#111522] p-1 border border-white/10">
                <button
                  onClick={() => setLang('uz')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    lang === 'uz' ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65 hover:text-[#F5F5F7]'
                  }`}
                >
                  O‘zbekcha
                </button>
                <button
                  onClick={() => setLang('ru')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    lang === 'ru' ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65 hover:text-[#F5F5F7]'
                  }`}
                >
                  Русский
                </button>
              </div>
              <PWAInstallButton compact />
            </div>

            <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#E7B65B] mb-2">
              MAFIA PRO ELITE · TRUST NOBODY. SURVIVE THE NIGHT. BECOME A LEGEND.
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F5F5F7] leading-[1.08] text-balance">
              {t.landing.heroTitle}
            </h1>

            <p className="mt-5 text-base sm:text-lg text-[#F5F5F7]/75 max-w-2xl leading-relaxed">
              {t.landing.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate(user ? 'create_room' : 'auth')}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#E63946] text-sm font-bold text-white hover:bg-[#E63946]/90 transition-all shadow-lg shadow-[#E63946]/20 min-h-[48px]"
              >
                {t.landing.playNow}
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('join_room')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#111522] border border-white/15 text-sm font-semibold text-[#F5F5F7] hover:bg-white/10 transition-colors min-h-[48px]"
              >
                <KeyRound className="w-4 h-4 text-[#E7B65B]" />
                {t.landing.joinWithCode}
              </button>

              <button
                onClick={() => navigate('roles')}
                className="px-4 py-3.5 text-sm font-medium text-[#F5F5F7]/80 hover:text-[#E7B65B] transition-colors min-h-[48px]"
              >
                {t.landing.exploreRoles}
              </button>
            </div>

            <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-[#F5F5F7]/60">
              <span className="tabular-nums">30 {lang === 'uz' ? 'noyob rol' : 'уникальных ролей'}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">5–20 {lang === 'uz' ? 'o‘yinchi' : 'игроков'}</span>
              <span aria-hidden="true">·</span>
              <span>CLASSIC / ADVANCED / CHAOS</span>
            </div>
          </div>

          <div className="lg:col-span-5 flex">
            <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#111522] min-h-[300px]">
              <img
                src={heroNoirImg}
                alt="MAFIA PRO Noir City"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090B12] via-[#090B12]/30 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-center gap-4">
                <img
                  src={tableEmblemImg}
                  alt="MAFIA PRO Emblem"
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-cover border border-[#E7B65B]/40 shrink-0"
                />
                <div>
                  <p className="text-sm font-bold text-[#F5F5F7]">MAFIA PRO</p>
                  <p className="text-xs text-[#E7B65B] mt-0.5">{t.tagline}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Game Modes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F7] mb-8">
          {t.landing.modesTitle}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              mode: 'CLASSIC',
              accent: 'text-[#E7B65B]',
              desc: t.landing.classicDesc,
              meta: lang === 'uz' ? '5–20 o‘yinchi · Muvozanatli' : '5–20 игроков · Баланс',
            },
            {
              mode: 'ADVANCED',
              accent: 'text-[#A855F7]',
              desc: t.landing.advancedDesc,
              meta: lang === 'uz' ? '7–20 o‘yinchi · Strategik' : '7–20 игроков · Стратегия',
            },
            {
              mode: 'CHAOS',
              accent: 'text-[#E63946]',
              desc: t.landing.chaosDesc,
              meta: lang === 'uz' ? '8–20 o‘yinchi · Neytrallar' : '8–20 игроков · Нейтралы',
            },
          ].map((item) => (
            <div
              key={item.mode}
              onClick={() => navigate('create_room')}
              className="glass-panel rounded-2xl p-6 hover:border-white/20 transition-all cursor-pointer group"
            >
              <p className={`font-mono text-xs font-bold tracking-wider ${item.accent}`}>{item.mode}</p>
              <h3 className="mt-2 font-display text-xl font-bold text-[#F5F5F7] group-hover:text-[#E7B65B] transition-colors">
                {item.mode}
              </h3>
              <p className="mt-3 text-sm text-[#F5F5F7]/70 leading-relaxed">{item.desc}</p>
              <p className="mt-5 text-xs text-[#F5F5F7]/50">{item.meta}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F7] mb-8">
          {t.landing.featuresTitle}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-2xl p-6">
            <ShieldCheck className="w-6 h-6 text-[#E63946] mb-4" />
            <h3 className="text-lg font-bold text-[#F5F5F7]">{t.landing.feature1Title}</h3>
            <p className="mt-2 text-sm text-[#F5F5F7]/70 leading-relaxed">{t.landing.feature1Desc}</p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <Users className="w-6 h-6 text-[#A855F7] mb-4" />
            <h3 className="text-lg font-bold text-[#F5F5F7]">{t.landing.feature2Title}</h3>
            <p className="mt-2 text-sm text-[#F5F5F7]/70 leading-relaxed">{t.landing.feature2Desc}</p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <Trophy className="w-6 h-6 text-[#E7B65B] mb-4" />
            <h3 className="text-lg font-bold text-[#F5F5F7]">{t.landing.feature3Title}</h3>
            <p className="mt-2 text-sm text-[#F5F5F7]/70 leading-relaxed">{t.landing.feature3Desc}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
