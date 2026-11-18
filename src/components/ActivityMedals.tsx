import React, { useId, useState } from 'react';
import {
  Award,
  Compass,
  Crown,
  Flame,
  Gem,
  Lock,
  Shield,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Zap,
} from 'lucide-react';

export interface ActivityMedalTier {
  level: number;
  maxLevel?: number;
  medalName: string;
  levelTitle: string;
  minPoints: number;
  description: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  rimStroke: string;
  ribbonTop: string;
  ribbonBottom: string;
  glowRgba: string;
  textAccentClass: string;
  badgeSurfaceClass: string;
  ownerOnly?: boolean;
}

export function formatVibbaPoints(points: number): string {
  return Math.max(0, Math.floor(points || 0)).toLocaleString('pt-PT');
}

export function getMinPointsForLevelClient(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 50;
  if (level === 3) return 150;
  if (level === 4) return 350;
  if (level === 5) return 700;
  if (level === 6) return 1_500;
  if (level >= 200) return 200_000_000;
  if (level >= 150) return 1_000_000;
  const t = (level - 6) / (150 - 6);
  return Math.round(
    1_500 + (1_000_000 - 1_500) * (0.12 * t + 0.88 * t * t)
  );
}

export const ACTIVITY_MEDAL_TIERS: ActivityMedalTier[] = [
  {
    level: 1,
    maxLevel: 1,
    medalName: 'Novato',
    levelTitle: 'Iniciante',
    minPoints: 0,
    description:
      'Nível 1 · Primeiros passos no Vibba. Cria publicações e interage com a comunidade.',
    gradientFrom: '#FBBF24',
    gradientVia: '#D97706',
    gradientTo: '#92400E',
    rimStroke: '#FDE68A',
    ribbonTop: '#B45309',
    ribbonBottom: '#78350F',
    glowRgba: 'rgba(245, 158, 11, 0.55)',
    textAccentClass: 'text-amber-300',
    badgeSurfaceClass: 'bg-amber-500/15 text-amber-200 border-amber-400/40',
  },
  {
    level: 2,
    maxLevel: 4,
    medalName: 'Explorador',
    levelTitle: 'Explorador',
    minPoints: 50,
    description:
      'Nível 2–4 · Desbloqueada aos 50 pontos com curtidas, comentários e partilhas.',
    gradientFrom: '#60A5FA',
    gradientVia: '#2563EB',
    gradientTo: '#1E3A8A',
    rimStroke: '#BFDBFE',
    ribbonTop: '#1D4ED8',
    ribbonBottom: '#1E3A8A',
    glowRgba: 'rgba(59, 130, 246, 0.6)',
    textAccentClass: 'text-sky-300',
    badgeSurfaceClass: 'bg-sky-500/15 text-sky-200 border-sky-400/45',
  },
  {
    level: 5,
    maxLevel: 9,
    medalName: 'Conector',
    levelTitle: 'Conector',
    minPoints: 700,
    description:
      'Nível 5–9 · Desbloqueada aos 700 pontos. Voz ativa que aproxima a comunidade.',
    gradientFrom: '#6EE7B7',
    gradientVia: '#10B981',
    gradientTo: '#065F46',
    rimStroke: '#A7F3D0',
    ribbonTop: '#059669',
    ribbonBottom: '#064E3B',
    glowRgba: 'rgba(16, 185, 129, 0.6)',
    textAccentClass: 'text-emerald-300',
    badgeSurfaceClass: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/45',
  },
  {
    level: 10,
    maxLevel: 24,
    medalName: 'Influenciador',
    levelTitle: 'Influenciador',
    minPoints: getMinPointsForLevelClient(10),
    description:
      'Nível 10–24 · Desbloqueada no Nível 10. Publicações com grande alcance no Vibba.',
    gradientFrom: '#FEF08A',
    gradientVia: '#F59E0B',
    gradientTo: '#B45309',
    rimStroke: '#FEF9C3',
    ribbonTop: '#EA580C',
    ribbonBottom: '#9A3412',
    glowRgba: 'rgba(250, 204, 21, 0.68)',
    textAccentClass: 'text-yellow-300',
    badgeSurfaceClass: 'bg-yellow-500/15 text-yellow-200 border-yellow-400/50',
  },
  {
    level: 25,
    maxLevel: 49,
    medalName: 'Vibba Master',
    levelTitle: 'Vibba Master',
    minPoints: getMinPointsForLevelClient(25),
    description:
      'Nível 25–49 · Emblema cristalino roxo e rosa dos mestres de atividade do Vibba.',
    gradientFrom: '#F472B6',
    gradientVia: '#A855F7',
    gradientTo: '#5B21B6',
    rimStroke: '#FBCFE8',
    ribbonTop: '#9333EA',
    ribbonBottom: '#BE185D',
    glowRgba: 'rgba(236, 72, 153, 0.72)',
    textAccentClass: 'text-pink-300',
    badgeSurfaceClass:
      'bg-gradient-to-r from-[#7C3AED]/30 to-[#EC4899]/30 text-pink-100 border-pink-400/50',
  },
  {
    level: 50,
    maxLevel: 74,
    medalName: 'Estrela Vibba',
    levelTitle: 'Estrela Vibba',
    minPoints: getMinPointsForLevelClient(50),
    description:
      'Nível 50–74 · Presença luminosa constante entre os criadores mais ativos.',
    gradientFrom: '#E879F9',
    gradientVia: '#9333EA',
    gradientTo: '#4C1D95',
    rimStroke: '#F5D0FE',
    ribbonTop: '#7E22CE',
    ribbonBottom: '#4C1D95',
    glowRgba: 'rgba(192, 38, 211, 0.72)',
    textAccentClass: 'text-fuchsia-300',
    badgeSurfaceClass: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/45',
  },
  {
    level: 75,
    maxLevel: 99,
    medalName: 'Titã Vibba',
    levelTitle: 'Titã Vibba',
    minPoints: getMinPointsForLevelClient(75),
    description:
      'Nível 75–99 · Medalha rubi flamejante conquistada por dedicação de elite.',
    gradientFrom: '#FDA4AF',
    gradientVia: '#E11D48',
    gradientTo: '#881337',
    rimStroke: '#FFE4E6',
    ribbonTop: '#BE123C',
    ribbonBottom: '#881337',
    glowRgba: 'rgba(244, 63, 94, 0.72)',
    textAccentClass: 'text-rose-300',
    badgeSurfaceClass: 'bg-rose-500/20 text-rose-200 border-rose-400/45',
  },
  {
    level: 100,
    maxLevel: 124,
    medalName: 'Embaixador',
    levelTitle: 'Embaixador',
    minPoints: getMinPointsForLevelClient(100),
    description:
      'Nível 100–124 · Platina celestial para pilares centenários da comunidade.',
    gradientFrom: '#67E8F9',
    gradientVia: '#0284C7',
    gradientTo: '#0C4A6E',
    rimStroke: '#CFFAFE',
    ribbonTop: '#0369A1',
    ribbonBottom: '#1E3A8A',
    glowRgba: 'rgba(34, 211, 238, 0.75)',
    textAccentClass: 'text-cyan-300',
    badgeSurfaceClass: 'bg-cyan-500/20 text-cyan-100 border-cyan-400/45',
  },
  {
    level: 125,
    maxLevel: 149,
    medalName: 'Grão-Mestre',
    levelTitle: 'Grão-Mestre',
    minPoints: getMinPointsForLevelClient(125),
    description:
      'Nível 125–149 · A antecâmara dourada do topo de utilizadores do Vibba.',
    gradientFrom: '#FDE047',
    gradientVia: '#EA580C',
    gradientTo: '#431407',
    rimStroke: '#FEF08A',
    ribbonTop: '#C2410C',
    ribbonBottom: '#7C2D12',
    glowRgba: 'rgba(249, 115, 22, 0.78)',
    textAccentClass: 'text-orange-300',
    badgeSurfaceClass: 'bg-orange-500/20 text-orange-100 border-orange-400/50',
  },
  {
    level: 150,
    maxLevel: 150,
    medalName: 'Lenda 150',
    levelTitle: 'Lenda 150',
    minPoints: 1_000_000,
    description:
      'Nível 150 · Exclusiva para utilizadores que atingem 1.000.000 de Vibba Points!',
    gradientFrom: '#E0F2FE',
    gradientVia: '#C084FC',
    gradientTo: '#EC4899',
    rimStroke: '#FFFFFF',
    ribbonTop: '#7C3AED',
    ribbonBottom: '#EC4899',
    glowRgba: 'rgba(192, 132, 252, 0.85)',
    textAccentClass: 'text-fuchsia-200',
    badgeSurfaceClass:
      'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white border-white/40',
  },
  {
    level: 200,
    maxLevel: 200,
    medalName: 'Coroa Suprema 200',
    levelTitle: 'Fundador Supremo',
    minPoints: 200_000_000,
    description:
      'Nível 200 (Proprietário Oficial) · Estatuto máximo automático com +200.000.000 pts.',
    gradientFrom: '#FEF08A',
    gradientVia: '#EC4899',
    gradientTo: '#6D28D9',
    rimStroke: '#FFFFFF',
    ribbonTop: '#F59E0B',
    ribbonBottom: '#7C3AED',
    glowRgba: 'rgba(250, 204, 21, 0.9)',
    textAccentClass: 'text-amber-200',
    badgeSurfaceClass:
      'bg-gradient-to-r from-amber-500 via-[#EC4899] to-[#7C3AED] text-white border-amber-200/70',
    ownerOnly: true,
  },
];

export function getActivityMedalTier(level: number): ActivityMedalTier {
  if (level >= 200) {
    return ACTIVITY_MEDAL_TIERS[ACTIVITY_MEDAL_TIERS.length - 1];
  }
  const userTiers = ACTIVITY_MEDAL_TIERS.filter((t) => !t.ownerOnly);
  for (let i = userTiers.length - 1; i >= 0; i--) {
    if (level >= userTiers[i].level) {
      return userTiers[i];
    }
  }
  return userTiers[0];
}

function CenterEmblem({
  tierLevel,
  size,
  locked,
}: {
  tierLevel: number;
  size: number;
  locked: boolean;
}) {
  const cls = locked
    ? 'text-[#8A8D91]'
    : 'text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]';
  if (tierLevel >= 200) {
    return <Trophy size={size} className={cls} strokeWidth={2.3} />;
  }
  if (tierLevel >= 150) {
    return <Gem size={size} className={cls} strokeWidth={2.2} />;
  }
  if (tierLevel >= 125) {
    return <Shield size={size} className={cls} strokeWidth={2.2} />;
  }
  if (tierLevel >= 100) {
    return <Award size={size} className={cls} strokeWidth={2.2} />;
  }
  if (tierLevel >= 75) {
    return <Sun size={size} className={cls} strokeWidth={2.2} />;
  }
  if (tierLevel >= 50) {
    return <Star size={size} className={cls} strokeWidth={2.2} />;
  }
  if (tierLevel >= 25) {
    return <Crown size={size} className={cls} strokeWidth={2.2} />;
  }
  if (tierLevel >= 10) {
    return <Flame size={size} className={cls} strokeWidth={2.2} />;
  }
  if (tierLevel >= 5) {
    return <Zap size={size} className={cls} strokeWidth={2.2} />;
  }
  if (tierLevel >= 2) {
    return <Compass size={size} className={cls} strokeWidth={2.2} />;
  }
  return <Sparkles size={size} className={cls} strokeWidth={2.2} />;
}

export const GlowingMedalIcon: React.FC<{
  level: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  unlocked?: boolean;
  animate?: boolean;
}> = ({ level, size = 'md', unlocked = true, animate = true }) => {
  const tier = getActivityMedalTier(level);
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');

  const dims =
    size === 'xs'
      ? { box: 'w-4 h-4', svg: 16, icon: 8, showRibbon: false }
      : size === 'sm'
      ? { box: 'w-6 h-6', svg: 24, icon: 11, showRibbon: false }
      : size === 'lg'
      ? { box: 'w-14 h-14', svg: 56, icon: 22, showRibbon: true }
      : { box: 'w-11 h-11', svg: 44, icon: 17, showRibbon: true };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${dims.box}`}
      style={
        unlocked
          ? {
              filter: `drop-shadow(0 0 ${
                size === 'lg' ? 12 : size === 'md' ? 8 : 5
              }px ${tier.glowRgba})`,
            }
          : undefined
      }
      aria-hidden="true"
    >
      {unlocked && animate && (size === 'md' || size === 'lg') && (
        <span
          className="vibba-medal-aura absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${tier.glowRgba} 0%, transparent 72%)`,
          }}
        />
      )}

      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-full">
        <svg
          width={dims.svg}
          height={dims.svg}
          viewBox="0 0 48 48"
          fill="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient
              id={`grad-${safeId}`}
              x1="6"
              y1="6"
              x2="42"
              y2="44"
              gradientUnits="userSpaceOnUse"
            >
              <stop
                offset="0%"
                stopColor={unlocked ? tier.gradientFrom : '#4B4D50'}
              />
              <stop
                offset="52%"
                stopColor={unlocked ? tier.gradientVia : '#3A3B3C'}
              />
              <stop
                offset="100%"
                stopColor={unlocked ? tier.gradientTo : '#262729'}
              />
            </linearGradient>
            <linearGradient
              id={`rim-${safeId}`}
              x1="8"
              y1="8"
              x2="40"
              y2="40"
              gradientUnits="userSpaceOnUse"
            >
              <stop
                offset="0%"
                stopColor={unlocked ? tier.rimStroke : '#5A5C60'}
                stopOpacity="0.95"
              />
              <stop
                offset="100%"
                stopColor={unlocked ? tier.gradientTo : '#303134'}
                stopOpacity="0.65"
              />
            </linearGradient>
            <radialGradient id={`core-${safeId}`} cx="35%" cy="30%" r="65%">
              <stop
                offset="0%"
                stopColor="#FFFFFF"
                stopOpacity={unlocked ? 0.55 : 0.08}
              />
              <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {dims.showRibbon && (
            <g opacity={unlocked ? 1 : 0.45}>
              <path
                d="M15 4H22L24 14L17 15L15 4Z"
                fill={unlocked ? tier.ribbonTop : '#3A3B3C'}
              />
              <path
                d="M33 4H26L24 14L31 15L33 4Z"
                fill={unlocked ? tier.ribbonBottom : '#2E2F31'}
              />
            </g>
          )}

          <circle
            cx="24"
            cy={dims.showRibbon ? 27 : 24}
            r={dims.showRibbon ? 16.5 : 19}
            fill={`url(#grad-${safeId})`}
            stroke={`url(#rim-${safeId})`}
            strokeWidth="2.2"
          />

          <circle
            cx="24"
            cy={dims.showRibbon ? 27 : 24}
            r={dims.showRibbon ? 13 : 15}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={unlocked ? 0.35 : 0.1}
            strokeWidth="1"
            strokeDasharray={tier.level >= 25 ? '2 2' : undefined}
          />

          <circle
            cx="24"
            cy={dims.showRibbon ? 27 : 24}
            r={dims.showRibbon ? 15.5 : 18}
            fill={`url(#core-${safeId})`}
          />
        </svg>

        <div
          className={`absolute inset-x-0 flex items-center justify-center ${
            dims.showRibbon ? 'top-[15%] bottom-0' : 'inset-y-0'
          }`}
        >
          <CenterEmblem
            tierLevel={tier.level}
            size={dims.icon}
            locked={!unlocked}
          />
        </div>

        {unlocked && animate && (size === 'md' || size === 'lg') && (
          <span className="vibba-medal-shimmer pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        )}
      </div>
    </div>
  );
};

export const ProfileMedalsHeaderStrip: React.FC<{
  currentLevel: number;
  vibbaPoints: number;
  isOwner?: boolean;
  onSelectMedal?: (tier: ActivityMedalTier) => void;
}> = ({ currentLevel, vibbaPoints, isOwner = false, onSelectMedal }) => {
  const effectiveLevel = isOwner ? Math.max(200, currentLevel) : currentLevel;
  const activeTier = getActivityMedalTier(effectiveLevel);
  const unlockedTiers = ACTIVITY_MEDAL_TIERS.filter(
    (m) =>
      effectiveLevel >= m.level &&
      (!m.ownerOnly || isOwner || effectiveLevel >= 200)
  );
  const [focusedTier, setFocusedTier] = useState<ActivityMedalTier | null>(null);
  const displayedTier = focusedTier || activeTier;

  return (
    <div className="mt-2.5 pt-2.5 border-t border-[#3E4042]/70 flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-[#B0B3B8]">
          Medalhas ganhas ({unlockedTiers.length}):
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {unlockedTiers.map((tier) => {
            const isSelected = displayedTier.level === tier.level;
            return (
              <button
                key={tier.level}
                type="button"
                onClick={() => {
                  setFocusedTier(tier);
                  onSelectMedal?.(tier);
                }}
                title={`Medalha ${tier.medalName} (Nível ${tier.level})`}
                aria-label={`Medalha ${tier.medalName} — Nível ${tier.level}`}
                className={`min-h-[38px] px-2.5 py-1 rounded-xl border inline-flex items-center gap-1.5 transition-transform active:scale-95 ${
                  isSelected
                    ? `${tier.badgeSurfaceClass} shadow-sm`
                    : 'bg-[#18191A]/80 border-[#3E4042] text-[#E4E6EB] hover:border-[#65676B]'
                }`}
              >
                <GlowingMedalIcon level={tier.level} size="sm" unlocked />
                <span className="text-[11px] font-bold whitespace-nowrap">
                  {tier.medalName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <span className="text-[11px] text-[#B0B3B8] tabular-nums">
        <strong className={displayedTier.textAccentClass}>
          {displayedTier.medalName}
        </strong>
        {' · '}
        Nível {effectiveLevel}
        {' · '}
        {formatVibbaPoints(vibbaPoints)} pts
      </span>
    </div>
  );
};

export const ProfileMedalsShowcase: React.FC<{
  currentLevel: number;
  vibbaPoints: number;
  isOwner?: boolean;
  compact?: boolean;
}> = ({ currentLevel, vibbaPoints, isOwner = false, compact = false }) => {
  const effectiveLevel = isOwner ? Math.max(200, currentLevel) : currentLevel;
  const visibleTiers = ACTIVITY_MEDAL_TIERS.filter(
    (m) => !m.ownerOnly || isOwner || effectiveLevel >= 200
  );
  const activeTier = getActivityMedalTier(effectiveLevel);
  const [selectedLevel, setSelectedLevel] = useState<number>(activeTier.level);
  const selectedTier = getActivityMedalTier(selectedLevel);
  const isSelectedUnlocked = effectiveLevel >= selectedTier.level;
  const remainingPoints = Math.max(0, selectedTier.minPoints - vibbaPoints);
  const unlockedCount = visibleTiers.filter(
    (m) => effectiveLevel >= m.level
  ).length;

  return (
    <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <GlowingMedalIcon level={effectiveLevel} size="sm" unlocked />
          <div>
            <h3 className="text-sm font-bold text-white">
              Medalhas de Atividade (Níveis 1–{isOwner ? '200' : '150'})
            </h3>
            <p className="text-[11px] text-[#B0B3B8]">
              Nível {effectiveLevel} ·{' '}
              <strong className={activeTier.textAccentClass}>
                {activeTier.medalName}
              </strong>
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-[#E4E6EB] tabular-nums">
          {unlockedCount}/{visibleTiers.length}
        </span>
      </div>

      <div
        className={`grid gap-2 ${
          compact ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        {visibleTiers.map((tier) => {
          const unlocked = effectiveLevel >= tier.level;
          const isSelected = selectedTier.level === tier.level;
          const isCurrent = activeTier.level === tier.level;

          return (
            <button
              key={tier.level}
              type="button"
              onClick={() => setSelectedLevel(tier.level)}
              aria-pressed={isSelected}
              className={`relative min-h-[94px] rounded-xl p-2 flex flex-col items-center justify-center gap-1 border text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899] ${
                isSelected
                  ? unlocked
                    ? 'bg-[#2D2F33] border-[#EC4899]/70 shadow-md'
                    : 'bg-[#202124] border-[#65676B]'
                  : unlocked
                  ? 'bg-[#18191A]/90 border-[#3E4042] hover:border-[#65676B]'
                  : 'bg-[#18191A]/45 border-[#2F3032] opacity-65 hover:opacity-90'
              }`}
            >
              {isCurrent && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-[#45BD62]">
                  Ativa
                </span>
              )}
              {!unlocked && (
                <span className="absolute top-1.5 right-1.5 text-[#8A8D91]">
                  <Lock size={11} />
                </span>
              )}
              <GlowingMedalIcon
                level={tier.level}
                size={compact ? 'sm' : 'md'}
                unlocked={unlocked}
              />
              <div className="w-full">
                <div
                  className={`text-[11px] font-bold leading-tight truncate ${
                    unlocked ? 'text-white' : 'text-[#8A8D91]'
                  }`}
                >
                  {tier.medalName}
                </div>
                <div className="text-[10px] font-mono text-[#B0B3B8] tabular-nums">
                  Nv {tier.level} · {formatVibbaPoints(tier.minPoints)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg bg-[#18191A] border border-[#3E4042] px-3 py-2.5 flex items-center gap-3">
        <GlowingMedalIcon
          level={selectedTier.level}
          size="sm"
          unlocked={isSelectedUnlocked}
          animate={false}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span
              className={`text-xs font-bold ${
                isSelectedUnlocked ? selectedTier.textAccentClass : 'text-[#E4E6EB]'
              }`}
            >
              {selectedTier.medalName} · Nível {selectedTier.level}
              {selectedTier.maxLevel && selectedTier.maxLevel > selectedTier.level
                ? `–${selectedTier.maxLevel}`
                : ''}
            </span>
            <span className="text-[10px] font-mono font-semibold text-[#B0B3B8] tabular-nums">
              {isSelectedUnlocked
                ? 'Desbloqueada'
                : `Faltam ${formatVibbaPoints(remainingPoints)} pts`}
            </span>
          </div>
          <p className="text-[11px] text-[#B0B3B8] leading-snug mt-0.5">
            {selectedTier.description}
          </p>
        </div>
      </div>
    </div>
  );
};
