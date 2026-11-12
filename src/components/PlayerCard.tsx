import React from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Compass,
  Crown,
  Droplet,
  Eye,
  FileSearch,
  Flag,
  Flame,
  Ghost,
  Heart,
  Key,
  Lock,
  MicOff,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  Target,
  Trash2,
  Users,
  Vote,
  Wand2,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { ROLES } from '../shared/roles';
import { Language, PublicPlayerView, RoleId, Team } from '../shared/types';

interface PlayerCardProps {
  player: PublicPlayerView;
  lang: Language;
  isMe: boolean;
  isSelected: boolean;
  isSecondarySelected?: boolean;
  canSelectNight: boolean;
  isNight: boolean;
  isVoting: boolean;
  canVote: boolean;
  votesForPlayer: number;
  iVotedForPlayer: boolean;
  myRoleId?: RoleId;
  myTeam?: Team;
  isMafiaTeammate?: boolean;
  hasActedThisNight?: boolean;
  currentNightTargetId?: string;
  onSelectNight: () => void;
  onVote: () => void;
  onReport: () => void;
  onRevealMayor?: () => void;
  labels: {
    alive: string;
    dead: string;
    silenced: string;
    jailed: string;
    voteBtn: string;
    reportPlayer: string;
  };
}

const AVATAR_THEMES: Record<string, { ring: string; accent: string }> = {
  crimson: { ring: 'from-[#E63946] to-[#991B1B]', accent: '#E63946' },
  gold: { ring: 'from-[#FCD34D] to-[#B45309]', accent: '#E7B65B' },
  violet: { ring: 'from-[#A855F7] to-[#5B21B6]', accent: '#A855F7' },
  obsidian: { ring: 'from-slate-400 to-slate-700', accent: '#94A3B8' },
};

const CharacterAvatarSVG: React.FC<{ color: string; alive: boolean }> = ({ color, alive }) => {
  if (!alive) {
    return <Skull className="w-5 h-5 text-[#E63946]" />;
  }
  return (
    <svg viewBox="0 0 36 36" className="w-7 h-7" aria-hidden="true">
      <path d="M7 15 L29 15 L26 12 L10 12 Z" fill={color} />
      <path d="M11 12 L13 6 L23 6 L25 12 Z" fill={color} opacity="0.9" />
      <circle cx="18" cy="20" r="5" fill="#F5F5F7" opacity="0.9" />
      <path d="M9 32 C10 26 26 26 27 32 Z" fill="#F5F5F7" opacity="0.75" />
    </svg>
  );
};

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  lang,
  isMe,
  isSelected,
  isSecondarySelected,
  canSelectNight,
  isNight,
  isVoting,
  canVote,
  votesForPlayer,
  iVotedForPlayer,
  myRoleId,
  myTeam,
  isMafiaTeammate,
  hasActedThisNight,
  currentNightTargetId,
  onSelectNight,
  onVote,
  onReport,
  onRevealMayor,
  labels,
}) => {
  const theme = AVATAR_THEMES[player.avatar] || AVATAR_THEMES.crimson;
  const isTargetOfAction = currentNightTargetId === player.id;

  // Determine role-specific action button details
  const getRoleActionDetails = () => {
    if (!isNight || !canSelectNight || !myRoleId) return null;

    // Self-targeting roles
    if (myRoleId === 'veteran') {
      if (!isMe || !player.isAlive) return null;
      return {
        label: isSelected
          ? lang === 'uz' ? '✓ Shay holat tanlandi' : '✓ Тревога выбрана'
          : lang === 'uz' ? '⚡ Shay holat (Alert)' : '⚡ Боевая тревога',
        icon: <Zap className="w-3.5 h-3.5 inline mr-1 text-amber-300" />,
        style: isSelected
          ? 'bg-amber-500 text-[#090B12] font-bold shadow-lg shadow-amber-500/30'
          : 'bg-amber-500/20 border border-amber-400 text-amber-200 hover:bg-amber-500/35',
      };
    }

    if (myRoleId === 'survivor') {
      if (!isMe || !player.isAlive) return null;
      return {
        label: isSelected
          ? lang === 'uz' ? '✓ Zirh tanlandi' : '✓ Бронежилет выбран'
          : lang === 'uz' ? '🛡️ Zirh kiyish (Vest)' : '🛡️ Надеть бронежилет',
        icon: <Shield className="w-3.5 h-3.5 inline mr-1 text-emerald-300" />,
        style: isSelected
          ? 'bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/30'
          : 'bg-emerald-500/20 border border-emerald-400 text-emerald-200 hover:bg-emerald-500/35',
      };
    }

    // Arsonist has special self-ignite or douse on others
    if (myRoleId === 'arsonist') {
      if (isMe && player.isAlive) {
        return {
          label: isSelected
            ? lang === 'uz' ? '🔥 O‘t qo‘yish tanlandi!' : '🔥 Поджог выбран!'
            : lang === 'uz' ? '🔥 Hamma joyni yoqish!' : '🔥 Поджечь всех!',
          icon: <Flame className="w-3.5 h-3.5 inline mr-1 text-orange-400" />,
          style: isSelected
            ? 'bg-orange-600 text-white font-extrabold shadow-lg shadow-orange-600/40 animate-pulse'
            : 'bg-orange-500/25 border border-orange-500 text-orange-200 hover:bg-orange-500/40 animate-pulse',
        };
      }
      if (!isMe && player.isAlive) {
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Moy sepiladi' : '✓ Будет облит'
            : player.isDoused
              ? lang === 'uz' ? '🛢️ Moylangan (Qayta)' : '🛢️ Облит (Повтор)'
              : lang === 'uz' ? '🛢️ Moy sepish' : '🛢️ Облить',
          icon: <Droplet className="w-3.5 h-3.5 inline mr-1 text-amber-400" />,
          style: isSelected
            ? 'bg-amber-500 text-[#090B12] font-bold shadow-md shadow-amber-500/20'
            : 'bg-amber-500/15 border border-amber-400/60 text-amber-200 hover:bg-amber-500/30',
        };
      }
      return null;
    }

    // Dead-targeting roles
    if (myRoleId === 'medium') {
      if (player.isAlive) return null;
      return {
        label: isSelected
          ? lang === 'uz' ? '✓ Muloqot tanlandi' : '✓ Выбран для связи'
          : lang === 'uz' ? '👻 Ruh bilan muloqot' : '👻 Связаться с духом',
        icon: <Ghost className="w-3.5 h-3.5 inline mr-1 text-indigo-300" />,
        style: isSelected
          ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30'
          : 'bg-indigo-500/20 border border-indigo-400 text-indigo-200 hover:bg-indigo-500/35',
      };
    }

    if (myRoleId === 'amnesiac') {
      if (player.isAlive) return null;
      return {
        label: isSelected
          ? lang === 'uz' ? '✓ Eslash tanlandi' : '✓ Выбран для памяти'
          : lang === 'uz' ? '🧠 Rolni eslash' : '🧠 Вспомнить роль',
        icon: <Sparkles className="w-3.5 h-3.5 inline mr-1 text-cyan-300" />,
        style: isSelected
          ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-600/30'
          : 'bg-cyan-500/20 border border-cyan-400 text-cyan-200 hover:bg-cyan-500/35',
      };
    }

    // Witch: 2 alive targets
    if (myRoleId === 'witch') {
      if (!player.isAlive) return null;
      if (isSelected) {
        return {
          label: lang === 'uz' ? '✓ 1-Boshqariluvchi' : '✓ 1-Подчинён',
          icon: <Wand2 className="w-3.5 h-3.5 inline mr-1 text-purple-300" />,
          style: 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30',
        };
      }
      if (isSecondarySelected) {
        return {
          label: lang === 'uz' ? '🎯 2-Nishon' : '🎯 2-Цель',
          icon: <Target className="w-3.5 h-3.5 inline mr-1 text-amber-300" />,
          style: 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30',
        };
      }
      return {
        label: lang === 'uz' ? '🔮 Boshqarish' : '🔮 Подчинить',
        icon: <Wand2 className="w-3.5 h-3.5 inline mr-1 text-purple-300" />,
        style: 'bg-purple-500/20 border border-purple-400 text-purple-200 hover:bg-purple-500/35',
      };
    }

    // Doctor can heal others or themselves
    if (myRoleId === 'doctor') {
      if (!player.isAlive) return null;
      return {
        label: isSelected
          ? isMe
            ? lang === 'uz' ? '✓ O‘zim davolanmoqda' : '✓ Лечу себя'
            : lang === 'uz' ? '✓ Davolanmoqda' : '✓ Будет вылечен'
          : isMe
            ? lang === 'uz' ? '💚 O‘zimni davolash' : '💚 Лечить себя'
            : lang === 'uz' ? '💚 Davolash' : '💚 Лечить',
        icon: <Heart className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />,
        style: isSelected
          ? 'bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/30'
          : 'bg-emerald-500/20 border border-emerald-400 text-emerald-200 hover:bg-emerald-500/35',
      };
    }

    // All other roles target other alive players
    if (!player.isAlive || isMe) return null;

    // Mafia teammates don't attack each other
    if (isMafiaTeammate) return null;

    switch (myRoleId) {
      case 'sheriff':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Tekshirilmoqda' : '✓ Проверяется'
            : lang === 'uz' ? '🔍 Tekshirish' : '🔍 Проверить',
          icon: <Search className="w-3.5 h-3.5 inline mr-1 text-cyan-300" />,
          style: isSelected
            ? 'bg-cyan-500 text-[#090B12] font-bold shadow-lg shadow-cyan-500/30'
            : 'bg-cyan-500/20 border border-cyan-400 text-cyan-200 hover:bg-cyan-500/35',
        };
      case 'detective':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Tergov qilinmoqda' : '✓ Расследуется'
            : lang === 'uz' ? '🕵️ Tergov' : '🕵️ Расследовать',
          icon: <FileSearch className="w-3.5 h-3.5 inline mr-1 text-indigo-300" />,
          style: isSelected
            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
            : 'bg-indigo-500/20 border border-indigo-400 text-indigo-200 hover:bg-indigo-500/35',
        };
      case 'consigliere':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Rol aniqlanmoqda' : '✓ Роль выясняется'
            : lang === 'uz' ? '📜 Rolni bilish' : '📜 Узнать роль',
          icon: <Eye className="w-3.5 h-3.5 inline mr-1 text-[#E7B65B]" />,
          style: isSelected
            ? 'bg-[#E7B65B] text-[#090B12] font-bold shadow-md shadow-[#E7B65B]/30'
            : 'bg-[#E7B65B]/20 border border-[#E7B65B] text-[#FCD34D] hover:bg-[#E7B65B]/35',
        };
      case 'don':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Qatl belgilandi' : '✓ Казнь назначена'
            : lang === 'uz' ? '🎯 Qatl buyrug‘i' : '🎯 Приказ казни',
          icon: <Target className="w-3.5 h-3.5 inline mr-1 text-[#FCA5A5]" />,
          style: isSelected
            ? 'bg-[#E63946] text-white font-bold shadow-lg shadow-[#E63946]/40'
            : 'bg-[#E63946]/20 border border-[#E63946] text-[#FCA5A5] hover:bg-[#E63946]/35',
        };
      case 'mafia':
      case 'godfather':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Nishon tanlandi' : '✓ Цель выбрана'
            : lang === 'uz' ? '⚔️ Hujum qilish' : '⚔️ Напасть',
          icon: <Target className="w-3.5 h-3.5 inline mr-1 text-[#FCA5A5]" />,
          style: isSelected
            ? 'bg-[#E63946] text-white font-bold shadow-lg shadow-[#E63946]/40'
            : 'bg-[#E63946]/20 border border-[#E63946] text-[#FCA5A5] hover:bg-[#E63946]/35',
        };
      case 'bodyguard':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Qo‘riqlanmoqda' : '✓ Охраняется'
            : lang === 'uz' ? '🛡️ Qo‘riqlash' : '🛡️ Защищать',
          icon: <Shield className="w-3.5 h-3.5 inline mr-1 text-amber-300" />,
          style: isSelected
            ? 'bg-amber-500 text-[#090B12] font-bold shadow-md shadow-amber-500/20'
            : 'bg-amber-500/20 border border-amber-400 text-amber-200 hover:bg-amber-500/35',
        };
      case 'vigilante':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Mergan nishoni' : '✓ Мишень выбрана'
            : lang === 'uz' ? '🔫 Otish' : '🔫 Застрелить',
          icon: <Target className="w-3.5 h-3.5 inline mr-1 text-red-400" />,
          style: isSelected
            ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-600/30'
            : 'bg-red-500/20 border border-red-500 text-red-200 hover:bg-red-500/35',
        };
      case 'escort':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Bloklanadi' : '✓ Будет заблокирован'
            : lang === 'uz' ? '✨ Bloklash' : '✨ Блокировать',
          icon: <Sparkles className="w-3.5 h-3.5 inline mr-1 text-purple-300" />,
          style: isSelected
            ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30'
            : 'bg-purple-500/20 border border-purple-400 text-purple-200 hover:bg-purple-500/35',
        };
      case 'jailer':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Hibsga olinadi' : '✓ Будет арестован'
            : lang === 'uz' ? '⛓️ Hibs' : '⛓️ Арестовать',
          icon: <Lock className="w-3.5 h-3.5 inline mr-1 text-slate-200" />,
          style: isSelected
            ? 'bg-slate-700 text-white font-bold shadow-md shadow-slate-700/30'
            : 'bg-slate-600/30 border border-slate-400 text-slate-200 hover:bg-slate-600/45',
        };
      case 'tracker':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Iziga tushildi' : '✓ Выслеживается'
            : lang === 'uz' ? '🧭 Izidan borish' : '🧭 Выследить',
          icon: <Compass className="w-3.5 h-3.5 inline mr-1 text-teal-300" />,
          style: isSelected
            ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/30'
            : 'bg-teal-500/20 border border-teal-400 text-teal-200 hover:bg-teal-500/35',
        };
      case 'lookout':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Poylanmoqda' : '✓ Слежка активна'
            : lang === 'uz' ? '👁️ Poylash' : '👁️ Следить',
          icon: <Eye className="w-3.5 h-3.5 inline mr-1 text-blue-300" />,
          style: isSelected
            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
            : 'bg-blue-500/20 border border-blue-400 text-blue-200 hover:bg-blue-500/35',
        };
      case 'silencer':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Ovoz o‘chiriladi' : '✓ Будет замолчан'
            : lang === 'uz' ? '🔇 Jim qilish' : '🔇 Заткнуть',
          icon: <MicOff className="w-3.5 h-3.5 inline mr-1 text-rose-300" />,
          style: isSelected
            ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
            : 'bg-rose-500/20 border border-rose-400 text-rose-200 hover:bg-rose-500/35',
        };
      case 'framer':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Tuhmat tushiriladi' : '✓ Будет оклеветан'
            : lang === 'uz' ? '⚠️ Tuhmat qilish' : '⚠️ Оклеветать',
          icon: <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-300" />,
          style: isSelected
            ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30'
            : 'bg-amber-500/20 border border-amber-400 text-amber-200 hover:bg-amber-500/35',
        };
      case 'janitor':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Tozalanadi' : '✓ Будет зачищен'
            : lang === 'uz' ? '🧹 Tozalash' : '🧹 Зачистить',
          icon: <Trash2 className="w-3.5 h-3.5 inline mr-1 text-slate-300" />,
          style: isSelected
            ? 'bg-slate-600 text-white font-bold shadow-md shadow-slate-600/30'
            : 'bg-slate-500/20 border border-slate-400 text-slate-200 hover:bg-slate-500/35',
        };
      case 'serial_killer':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Qurbon tanlandi' : '✓ Жертва выбрана'
            : lang === 'uz' ? '🗡️ Qatl etish' : '🗡️ Убить',
          icon: <Skull className="w-3.5 h-3.5 inline mr-1 text-red-400" />,
          style: isSelected
            ? 'bg-red-700 text-white font-bold shadow-lg shadow-red-700/40'
            : 'bg-red-600/20 border border-red-500 text-red-200 hover:bg-red-600/35',
        };
      case 'plaguebearer':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Zararlanadi' : '✓ Будет заражён'
            : lang === 'uz' ? '☣️ Yuqtirish' : '☣️ Заразить',
          icon: <Radio className="w-3.5 h-3.5 inline mr-1 text-lime-300" />,
          style: isSelected
            ? 'bg-lime-600 text-white font-bold shadow-md shadow-lime-600/30'
            : 'bg-lime-500/20 border border-lime-400 text-lime-200 hover:bg-lime-500/35',
        };
      case 'vampire':
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Tishlanadi' : '✓ Будет укушен'
            : lang === 'uz' ? '🧛 Tishlash' : '🧛 Укусить',
          icon: <Skull className="w-3.5 h-3.5 inline mr-1 text-red-300" />,
          style: isSelected
            ? 'bg-red-800 text-white font-bold shadow-md shadow-red-800/30'
            : 'bg-red-700/20 border border-red-500 text-red-200 hover:bg-red-700/35',
        };
      default:
        return {
          label: isSelected
            ? lang === 'uz' ? '✓ Tanlandi' : '✓ Выбрано'
            : lang === 'uz' ? '🎯 Tanlash' : '🎯 Выбрать',
          icon: <Target className="w-3.5 h-3.5 inline mr-1" />,
          style: isSelected
            ? 'bg-[#8B5CF6] text-white font-bold shadow-md shadow-[#8B5CF6]/30'
            : 'bg-white/10 text-[#F5F5F7] hover:bg-white/20',
        };
    }
  };

  const actionButton = getRoleActionDetails();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: player.isAlive ? 1 : 0.62, y: 0 }}
      whileHover={canSelectNight || isVoting ? { y: -2 } : undefined}
      whileTap={canSelectNight ? { scale: 0.985 } : undefined}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => {
        if (canSelectNight && (player.isAlive || myRoleId === 'medium' || myRoleId === 'amnesiac')) {
          onSelectNight();
        }
      }}
      className={`relative p-3.5 rounded-xl border transition-all flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
        !player.isAlive
          ? 'bg-[#070A14]/70 border-white/10'
          : isSelected
            ? 'bg-[#8B5CF6]/22 border-[#8B5CF6] shadow-[0_0_24px_rgba(139,92,246,0.3)] ring-1 ring-[#8B5CF6]/50'
            : isTargetOfAction
              ? 'bg-cyan-500/15 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
              : iVotedForPlayer
                ? 'bg-[#E63946]/18 border-[#E63946]/70 shadow-[0_0_18px_rgba(230,57,70,0.2)]'
                : 'bg-[#0B1020]/85 border-white/14 hover:border-white/30'
      } ${canSelectNight ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`relative w-11 h-11 rounded-full bg-gradient-to-br ${theme.ring} p-[2px] shrink-0 shadow-md`}
        >
          <div className="w-full h-full rounded-full bg-[#090D1A] flex items-center justify-center overflow-hidden">
            <CharacterAvatarSVG color={theme.accent} alive={player.isAlive} />
          </div>
          {player.isHost && (
            <span
              title="Host"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#090B12] border border-[#E7B65B]/60 flex items-center justify-center"
            >
              <Crown className="w-3 h-3 text-[#E7B65B]" />
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[#F5F5F7] truncate">
              {player.username}
            </span>
            {isMe && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-white/15 text-white/90">
                {lang === 'uz' ? 'Siz' : 'Вы'}
              </span>
            )}
            {isMafiaTeammate && !isMe && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E63946]/20 border border-[#E63946]/50 text-[#FCA5A5] flex items-center gap-1">
                <Users className="w-3 h-3" />
                {lang === 'uz' ? 'Jamoadosh' : 'Союзник'}
              </span>
            )}
            {player.isMayorRevealed && !player.isHost && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E7B65B]/25 text-[#E7B65B] flex items-center gap-1">
                <Crown className="w-3 h-3" />
                {lang === 'uz' ? 'Hokim' : 'Мэр'}
              </span>
            )}
            {!player.isBot &&
              (player.isConnected ? (
                <Wifi className="w-3 h-3 text-emerald-400/85 shrink-0" />
              ) : (
                <WifiOff className="w-3 h-3 text-[#E63946] shrink-0" />
              ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#F5F5F7]/65 mt-0.5">
            <span>{player.isAlive ? labels.alive : labels.dead}</span>

            {/* Role indicator if revealed */}
            {player.revealedRoleId && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#FCD34D] font-semibold">
                  {ROLES[player.revealedRoleId]?.name[lang] || player.revealedRoleId}
                </span>
              </>
            )}

            {/* Investigation result badge from Sheriff / Detective / Consigliere */}
            {player.investigatedByMe && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                  player.investigatedByMe.result === 'SUSPICIOUS' ||
                  player.investigatedByMe.result === 'MAFIA'
                    ? 'bg-[#E63946]/25 border-[#E63946] text-[#FCA5A5] shadow-[0_0_12px_rgba(230,57,70,0.35)] animate-pulse'
                    : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                }`}
              >
                {player.investigatedByMe.result === 'SUSPICIOUS' ? (
                  <ShieldAlert className="w-3 h-3 text-[#E63946]" />
                ) : (
                  <Shield className="w-3 h-3 text-emerald-400" />
                )}
                {player.investigatedByMe.label[lang]}
              </span>
            )}

            {player.isDoused && myRoleId === 'arsonist' && (
              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-semibold text-[10px]">
                🛢️ {lang === 'uz' ? 'Moylangan' : 'Облит'}
              </span>
            )}

            {player.isInfected && myRoleId === 'plaguebearer' && (
              <span className="px-1.5 py-0.5 rounded bg-lime-500/20 text-lime-300 font-semibold text-[10px]">
                ☣️ {lang === 'uz' ? 'Zararlangan' : 'Заражён'}
              </span>
            )}

            {player.isSilenced && <span className="text-[#E63946]">· {labels.silenced}</span>}
            {player.isJailed && <span className="text-[#A855F7]">· {labels.jailed}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {/* Voting count badge */}
        {isVoting && votesForPlayer > 0 && (
          <motion.span
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            className="px-2.5 py-0.5 rounded-md bg-[#E63946]/25 border border-[#E63946]/50 font-mono text-xs font-bold text-[#FCD34D] tabular-nums"
          >
            {votesForPlayer}
          </motion.span>
        )}

        {/* Voting button */}
        {isVoting && canVote && player.isAlive && !isMe && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVote();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[34px] ${
              iVotedForPlayer
                ? 'bg-[#E63946] text-white shadow-md shadow-[#E63946]/30'
                : 'bg-white/12 text-[#F5F5F7] hover:bg-[#E63946]/85'
            }`}
          >
            <Vote className="w-3.5 h-3.5 inline mr-1" />
            {iVotedForPlayer
              ? lang === 'uz' ? 'Ovoz berildi' : 'Проголосовано'
              : labels.voteBtn}
          </button>
        )}

        {/* Role-specific Action Button (e.g. Sheriff Investigate, Doctor Heal, Don Kill) */}
        {actionButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectNight();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[34px] flex items-center gap-1.5 ${actionButton.style}`}
          >
            {actionButton.icon}
            <span>{actionButton.label}</span>
          </button>
        )}

        {/* Mayor reveal button on own card */}
        {myRoleId === 'mayor' && isMe && !player.isMayorRevealed && !isNight && onRevealMayor && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRevealMayor();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E7B65B] text-[#090B12] hover:bg-[#E7B65B]/90 transition-colors shadow-md"
          >
            <Crown className="w-3.5 h-3.5 inline mr-1" />
            {lang === 'uz' ? 'Oshkor qilish' : 'Раскрыть статус'}
          </button>
        )}

        {/* Report player button */}
        {!isMe && !player.isBot && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReport();
            }}
            title={labels.reportPlayer}
            className="p-1.5 rounded-lg text-[#F5F5F7]/35 hover:text-[#E63946] hover:bg-white/5 transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
