import React from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { ROLES } from '../shared/roles';
import { RARITY_LABELS, ROLE_VISUALS } from '../shared/roleCards';
import { Language, RoleId } from '../shared/types';
import { RoleArtwork } from './RoleArtwork';

interface RoleCardProps {
  roleId: RoleId;
  lang: Language;
  teamLabel: string;
  abilityLabel: string;
  winLabel?: string;
  limitsLabel?: string;
  locked?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  roleId,
  lang,
  teamLabel,
  abilityLabel,
  winLabel,
  limitsLabel,
  locked = false,
  compact = false,
  onClick,
}) => {
  const role = ROLES[roleId];
  const spec = ROLE_VISUALS[roleId];
  const rarity = RARITY_LABELS[spec.rarity];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`relative rounded-2xl p-4 flex flex-col justify-between overflow-hidden ${
        onClick ? 'cursor-pointer' : ''
      }`}
      style={{
        background: spec.bgGradient,
        border: `1px solid ${spec.borderColor}`,
        boxShadow: `0 14px 36px -14px ${spec.glowColor}`,
      }}
    >
      {/* Subtle Top Rarity Accent Line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${rarity.color}, transparent)` }}
      />

      <div>
        <RoleArtwork spec={spec} className={compact ? 'w-full h-24 mb-3' : 'w-full h-32 mb-3.5'} />

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wide" style={{ color: rarity.color }}>
              {rarity[lang]} · {teamLabel}
            </p>
            <h3 className="font-display text-lg font-extrabold text-[#F5F5F7] truncate mt-0.5">
              {role.name[lang]}
            </h3>
          </div>
          {locked && (
            <span className="p-1.5 rounded-lg bg-black/40 border border-white/10 text-[#F5F5F7]/50 shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-[#F5F5F7]/75 leading-relaxed">{role.shortDesc[lang]}</p>

        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5 text-xs">
          <div>
            <span className="font-semibold text-[#E7B65B]">{abilityLabel}: </span>
            <span className="text-[#F5F5F7]/85">{role.abilityDesc[lang]}</span>
          </div>
          {!compact && winLabel && (
            <div>
              <span className="font-semibold text-emerald-400">{winLabel}: </span>
              <span className="text-[#F5F5F7]/75">{role.winCondition[lang]}</span>
            </div>
          )}
          {!compact && limitsLabel && (
            <div>
              <span className="font-semibold text-[#E63946]">{limitsLabel}: </span>
              <span className="text-[#F5F5F7]/70">{role.limitations[lang]}</span>
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-[#F5F5F7]/50">
          <span>{role.modes.join(' · ')}</span>
          <span className="tabular-nums">Min {role.minPlayers}</span>
        </div>
      )}
    </motion.div>
  );
};
