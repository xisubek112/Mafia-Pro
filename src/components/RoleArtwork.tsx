import React from 'react';
import { RoleVisualSpec } from '../shared/roleCards';

interface RoleArtworkProps {
  spec: RoleVisualSpec;
  className?: string;
}

export const RoleArtwork: React.FC<RoleArtworkProps> = ({ spec, className = 'w-full h-36' }) => {
  const { primaryColor: c1, secondaryColor: c2, motif, fxType } = spec;

  const renderMotif = () => {
    switch (motif) {
      case 'don_crown':
        return (
          <g>
            <path d="M55 78 L62 48 L78 62 L90 38 L102 62 L118 48 L125 78 Z" fill={c2} stroke={c1} strokeWidth="2.5" />
            <rect x="52" y="82" width="76" height="10" rx="3" fill={c1} />
            <circle cx="90" cy="34" r="4" fill={c2} />
          </g>
        );
      case 'godfather_throne':
        return (
          <g>
            <path d="M50 96 L58 36 L90 26 L122 36 L130 96 Z" fill="none" stroke={c1} strokeWidth="3" />
            <circle cx="90" cy="60" r="16" fill={c1} opacity="0.25" stroke={c1} strokeWidth="2.5" />
            <path d="M78 60 L90 48 L102 60 L90 72 Z" fill={c2} />
          </g>
        );
      case 'mafia_fedora':
        return (
          <g>
            <ellipse cx="90" cy="70" rx="44" ry="8" fill={c1} />
            <path d="M62 68 L70 40 L90 44 L110 40 L118 68 Z" fill="#111827" stroke={c1} strokeWidth="2.5" />
            <path d="M66 62 L114 62" stroke={c1} strokeWidth="3" />
          </g>
        );
      case 'consigliere_dossier':
        return (
          <g>
            <rect x="60" y="34" width="60" height="62" rx="6" fill="#0F172A" stroke={c1} strokeWidth="2.5" />
            <circle cx="90" cy="58" r="10" fill="none" stroke={c1} strokeWidth="2.5" />
            <line x1="72" y1="78" x2="108" y2="78" stroke={c1} strokeWidth="2.5" />
            <line x1="72" y1="86" x2="98" y2="86" stroke={c2} strokeWidth="2.5" />
          </g>
        );
      case 'silencer_mask':
        return (
          <g>
            <path d="M60 44 Q90 30 120 44 L114 82 Q90 96 66 82 Z" fill="#1E293B" stroke={c1} strokeWidth="2.5" />
            <line x1="70" y1="68" x2="110" y2="68" stroke={c2} strokeWidth="3" />
            <line x1="76" y1="62" x2="84" y2="74" stroke={c2} strokeWidth="2.5" />
            <line x1="104" y1="62" x2="96" y2="74" stroke={c2} strokeWidth="2.5" />
          </g>
        );
      case 'framer_mirror':
        return (
          <g>
            <rect x="64" y="34" width="52" height="62" rx="24" fill="none" stroke={c1} strokeWidth="3" />
            <path d="M72 48 L108 82 M108 48 L72 82" stroke={c2} strokeWidth="2.5" opacity="0.8" />
          </g>
        );
      case 'janitor_clean':
        return (
          <g>
            <circle cx="90" cy="62" r="26" fill="none" stroke={c1} strokeWidth="2.5" strokeDasharray="6 4" />
            <path d="M74 62 L86 74 L108 48" fill="none" stroke={c1} strokeWidth="3.5" strokeLinecap="round" />
          </g>
        );
      case 'citizen_lantern':
        return (
          <g>
            <rect x="74" y="42" width="32" height="44" rx="6" fill="none" stroke={c1} strokeWidth="2.5" />
            <circle cx="90" cy="64" r="9" fill={c1} opacity="0.7" />
            <path d="M78 42 L90 30 L102 42" fill="none" stroke={c2} strokeWidth="2.5" />
          </g>
        );
      case 'sheriff_star':
        return (
          <g>
            <polygon
              points="90,28 98,50 122,50 103,64 110,88 90,74 70,88 77,64 58,50 82,50"
              fill={c1}
              fillOpacity="0.25"
              stroke={c2}
              strokeWidth="2.5"
            />
            <circle cx="90" cy="60" r="8" fill={c2} />
          </g>
        );
      case 'doctor_caduceus':
        return (
          <g>
            <rect x="83" y="34" width="14" height="56" rx="3" fill={c1} />
            <rect x="62" y="55" width="56" height="14" rx="3" fill={c1} />
            <circle cx="90" cy="62" r="28" fill="none" stroke={c2} strokeWidth="2" opacity="0.5" />
          </g>
        );
      case 'bodyguard_shield':
        return (
          <g>
            <path d="M60 36 L90 28 L120 36 L116 70 Q90 96 64 70 Z" fill={c1} fillOpacity="0.22" stroke={c1} strokeWidth="3" />
            <path d="M90 38 L90 82" stroke={c2} strokeWidth="2.5" />
          </g>
        );
      case 'detective_lens':
        return (
          <g>
            <circle cx="84" cy="56" r="20" fill="none" stroke={c1} strokeWidth="3" />
            <line x1="98" y1="70" x2="118" y2="90" stroke={c2} strokeWidth="5" strokeLinecap="round" />
            <circle cx="84" cy="56" r="8" fill={c1} opacity="0.35" />
          </g>
        );
      case 'veteran_chevrons':
        return (
          <g>
            <path d="M62 52 L90 36 L118 52" fill="none" stroke={c1} strokeWidth="4" strokeLinecap="round" />
            <path d="M62 66 L90 50 L118 66" fill="none" stroke={c1} strokeWidth="4" strokeLinecap="round" />
            <path d="M62 80 L90 64 L118 80" fill="none" stroke={c2} strokeWidth="4" strokeLinecap="round" />
          </g>
        );
      case 'vigilante_crosshair':
        return (
          <g>
            <circle cx="90" cy="62" r="24" fill="none" stroke={c1} strokeWidth="2.5" />
            <line x1="90" y1="30" x2="90" y2="94" stroke={c2} strokeWidth="2" />
            <line x1="58" y1="62" x2="122" y2="62" stroke={c2} strokeWidth="2" />
            <circle cx="90" cy="62" r="5" fill={c1} />
          </g>
        );
      case 'mayor_gavel':
        return (
          <g>
            <rect x="64" y="40" width="52" height="16" rx="4" fill={c2} />
            <rect x="86" y="56" width="8" height="32" rx="3" fill={c1} />
            <rect x="62" y="88" width="56" height="6" rx="3" fill={c2} />
          </g>
        );
      case 'medium_orb':
        return (
          <g>
            <circle cx="90" cy="58" r="24" fill={c1} fillOpacity="0.25" stroke={c1} strokeWidth="2.5" />
            <circle cx="90" cy="58" r="11" fill={c2} opacity="0.55" />
            <path d="M72 86 L108 86" stroke={c1} strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      case 'lookout_tower':
        return (
          <g>
            <path d="M60 62 Q90 36 120 62 Q90 88 60 62 Z" fill="none" stroke={c1} strokeWidth="3" />
            <circle cx="90" cy="62" r="9" fill={c2} />
          </g>
        );
      case 'tracker_compass':
        return (
          <g>
            <circle cx="90" cy="62" r="25" fill="none" stroke={c1} strokeWidth="2.5" />
            <polygon points="90,42 97,62 90,82 83,62" fill={c2} />
          </g>
        );
      case 'escort_rose':
        return (
          <g>
            <circle cx="90" cy="56" r="18" fill={c1} fillOpacity="0.3" stroke={c1} strokeWidth="2.5" />
            <path d="M90 42 C98 48 98 64 90 70 C82 64 82 48 90 42 Z" fill={c2} />
            <line x1="90" y1="74" x2="90" y2="92" stroke={c1} strokeWidth="3" />
          </g>
        );
      case 'jailer_key':
        return (
          <g>
            <line x1="66" y1="34" x2="66" y2="90" stroke={c1} strokeWidth="3" />
            <line x1="82" y1="34" x2="82" y2="90" stroke={c1} strokeWidth="3" />
            <line x1="98" y1="34" x2="98" y2="90" stroke={c1} strokeWidth="3" />
            <line x1="114" y1="34" x2="114" y2="90" stroke={c1} strokeWidth="3" />
            <circle cx="90" cy="62" r="10" fill={c2} />
          </g>
        );
      case 'sk_blades':
        return (
          <g>
            <line x1="64" y1="88" x2="116" y2="36" stroke={c1} strokeWidth="4" strokeLinecap="round" />
            <line x1="116" y1="88" x2="64" y2="36" stroke="#F8FAFC" strokeWidth="4" strokeLinecap="round" />
            <circle cx="90" cy="62" r="7" fill={c1} />
          </g>
        );
      case 'jester_hat':
        return (
          <g>
            <path d="M58 76 Q62 36 80 54 Q90 28 100 54 Q118 36 122 76 Z" fill={c1} fillOpacity="0.35" stroke={c2} strokeWidth="2.5" />
            <circle cx="58" cy="48" r="4" fill={c2} />
            <circle cx="90" cy="30" r="4" fill={c1} />
            <circle cx="122" cy="48" r="4" fill={c2} />
          </g>
        );
      case 'survivor_vest':
        return (
          <g>
            <path d="M64 38 L78 38 L82 48 L98 48 L102 38 L116 38 L116 86 L64 86 Z" fill={c1} fillOpacity="0.25" stroke={c2} strokeWidth="2.5" />
            <rect x="74" y="58" width="32" height="16" rx="2" fill={c1} opacity="0.6" />
          </g>
        );
      case 'arsonist_flame':
        return (
          <g>
            <path d="M90 28 C108 48 116 64 106 82 C98 92 82 92 74 82 C64 64 74 48 90 28 Z" fill={c1} fillOpacity="0.45" stroke={c2} strokeWidth="2.5" />
            <path d="M90 50 C98 62 100 72 90 80 C80 72 82 62 90 50 Z" fill={c2} />
          </g>
        );
      case 'witch_crescent':
        return (
          <g>
            <path d="M98 34 A26 26 0 1 0 112 80 A20 20 0 1 1 98 34 Z" fill={c1} />
            <circle cx="106" cy="56" r="4" fill={c2} />
          </g>
        );
      case 'executioner_axe':
        return (
          <g>
            <line x1="90" y1="32" x2="90" y2="92" stroke={c1} strokeWidth="4" />
            <path d="M90 38 L120 34 Q124 52 118 64 L90 58 Z" fill={c2} opacity="0.85" />
          </g>
        );
      case 'amnesiac_hourglass':
        return (
          <g>
            <polygon points="68,36 112,36 90,62" fill={c1} fillOpacity="0.3" stroke={c1} strokeWidth="2.5" />
            <polygon points="68,88 112,88 90,62" fill={c2} fillOpacity="0.3" stroke={c2} strokeWidth="2.5" />
          </g>
        );
      case 'ga_wings':
        return (
          <g>
            <path d="M90 62 Q62 34 46 52 Q58 68 84 72 Z" fill={c2} opacity="0.8" />
            <path d="M90 62 Q118 34 134 52 Q122 68 96 72 Z" fill={c2} opacity="0.8" />
            <circle cx="90" cy="48" r="9" fill={c1} />
          </g>
        );
      case 'plague_mask':
        return (
          <g>
            <circle cx="90" cy="56" r="22" fill={c1} fillOpacity="0.2" stroke={c1} strokeWidth="2.5" />
            <path d="M84 58 L118 66 L84 72 Z" fill={c2} />
            <circle cx="80" cy="52" r="5" fill={c2} />
          </g>
        );
      case 'vampire_fangs':
      default:
        return (
          <g>
            <path d="M56 54 Q72 38 90 54 Q108 38 124 54 L112 72 L90 62 L68 72 Z" fill={c2} opacity="0.7" />
            <polygon points="78,66 84,86 88,66" fill="#F8FAFC" />
            <polygon points="92,66 96,86 102,66" fill="#F8FAFC" />
          </g>
        );
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ background: spec.bgGradient }}>
      {/* Team/Role Ambient Glow */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            fxType === 'SMOKE'
              ? `radial-gradient(circle at 50% 45%, ${c1}35, transparent 70%)`
              : fxType === 'FLAME'
                ? `radial-gradient(circle at 50% 65%, ${c1}45, transparent 70%)`
                : fxType === 'TOXIC'
                  ? `radial-gradient(circle at 50% 50%, ${c2}35, transparent 70%)`
                  : `radial-gradient(circle at 50% 40%, ${c1}35, transparent 70%)`,
        }}
      />
      <svg viewBox="0 0 180 120" className="relative z-10 w-full h-full">
        <circle cx="90" cy="60" r="46" fill="none" stroke={c1} strokeOpacity="0.18" strokeWidth="1.5" />
        {renderMotif()}
      </svg>
    </div>
  );
};
