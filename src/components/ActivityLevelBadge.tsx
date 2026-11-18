import React from 'react';
import { Sparkles } from 'lucide-react';
import { ActivityLevelInfo, VibbaPointsBreakdown } from '../types/vibba';
import {
  GlowingMedalIcon,
  formatVibbaPoints,
  getActivityMedalTier,
} from './ActivityMedals';

export const ActivityLevelBadge: React.FC<{
  level: number;
  title: string;
  compact?: boolean;
}> = ({ level, title, compact = false }) => {
  const medal = getActivityMedalTier(level);
  const label = medal.medalName || title;
  return (
    <span
      title={`Medalha ${label} (Nível ${level})`}
      className={`inline-flex items-center gap-1 rounded-md border font-bold whitespace-nowrap shrink-0 ${medal.badgeSurfaceClass} ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      <GlowingMedalIcon level={level} size="xs" unlocked animate={false} />
      <span>
        {compact ? `Nv ${level} · ${label}` : `Nível ${level} · ${label}`}
      </span>
    </span>
  );
};

export const VibbaPointsCard: React.FC<{
  activityLevel?: ActivityLevelInfo;
  vibbaPoints?: number;
  breakdown?: VibbaPointsBreakdown;
  compact?: boolean;
}> = ({ activityLevel, vibbaPoints = 0, breakdown, compact = false }) => {
  const lvl: ActivityLevelInfo = activityLevel || {
    level: 1,
    title: 'Iniciante',
    medalName: 'Novato',
    points: vibbaPoints,
    currentLevelMinPoints: 0,
    nextLevelMinPoints: 50,
    nextLevelTitle: 'Explorador',
    progressPercent: Math.min(100, Math.round((vibbaPoints / 50) * 100)),
  };

  const activeMedal = getActivityMedalTier(lvl.level);
  const nextLevelNum =
    lvl.nextLevelMinPoints !== null ? lvl.level + 1 : null;

  const pointsNeeded =
    lvl.nextLevelMinPoints !== null
      ? Math.max(0, lvl.nextLevelMinPoints - lvl.points)
      : 0;

  if (compact) {
    return (
      <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-3 space-y-2 my-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Sparkles size={14} className="text-[#EC4899]" />
            <span>Vibba Points</span>
          </div>
          <span className="text-xs font-mono font-bold text-[#45BD62] tabular-nums">
            {formatVibbaPoints(lvl.points)} pts
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <ActivityLevelBadge level={lvl.level} title={lvl.title} compact />
          <span className="text-[11px] font-medium text-[#B0B3B8] truncate">
            {lvl.level >= 200 ? 'Proprietário' : 'Máx. Nível 150'}
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-[#18191A] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] transition-all duration-300"
            style={{ width: `${lvl.progressPercent}%` }}
          />
        </div>

        <p className="text-[10px] text-[#B0B3B8] leading-snug">
          {nextLevelNum !== null
            ? `Faltam ${formatVibbaPoints(pointsNeeded)} pts para o Nível ${nextLevelNum}`
            : lvl.level >= 200
            ? 'Nível 200 Supremo (Proprietário Oficial)'
            : 'Nível 150 máximo atingido (1.000.000+ pts)!'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <GlowingMedalIcon level={lvl.level} size="md" unlocked />
          <div>
            <h3 className="text-sm font-bold text-white">Vibba Points</h3>
            <p className="text-[11px] text-[#B0B3B8]">
              Medalha{' '}
              <span className={`font-semibold ${activeMedal.textAccentClass}`}>
                {activeMedal.medalName}
              </span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-display font-extrabold text-white tabular-nums">
            {formatVibbaPoints(lvl.points)}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#45BD62]">
            pontos
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <ActivityLevelBadge level={lvl.level} title={lvl.title} />
        <span className="text-[11px] font-mono text-[#B0B3B8] tabular-nums">
          {lvl.progressPercent}%
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-[#18191A] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#C026D3] to-[#EC4899] transition-all duration-300"
          style={{ width: `${lvl.progressPercent}%` }}
        />
      </div>

      <p className="text-xs text-[#B0B3B8]">
        {nextLevelNum !== null ? (
          <>
            Faltam{' '}
            <strong className="text-white tabular-nums">
              {formatVibbaPoints(pointsNeeded)} pts
            </strong>{' '}
            para o <strong className="text-[#E4E6EB]">Nível {nextLevelNum}</strong>{' '}
            (meta Nível 150: 1.000.000 pts).
          </>
        ) : lvl.level >= 200 ? (
          'Estatuto Supremo do Proprietário: Nível 200 automático com mais de 200.000.000 de pontos.'
        ) : (
          'Parabéns! Atingiste o Nível 150 máximo com mais de 1.000.000 de Vibba Points!'
        )}
      </p>

      {breakdown && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#3E4042] text-[11px]">
          <div className="rounded-lg bg-[#18191A] px-2.5 py-1.5 flex items-center justify-between">
            <span className="text-[#B0B3B8]">Curtidas (+5)</span>
            <span className="font-mono font-bold text-[#4599FF] tabular-nums">
              {formatVibbaPoints(breakdown.reactions)}
            </span>
          </div>
          <div className="rounded-lg bg-[#18191A] px-2.5 py-1.5 flex items-center justify-between">
            <span className="text-[#B0B3B8]">Comentários (+10)</span>
            <span className="font-mono font-bold text-[#45BD62] tabular-nums">
              {formatVibbaPoints(breakdown.comments)}
            </span>
          </div>
          <div className="rounded-lg bg-[#18191A] px-2.5 py-1.5 flex items-center justify-between">
            <span className="text-[#B0B3B8]">Partilhas (+15)</span>
            <span className="font-mono font-bold text-[#F7B928] tabular-nums">
              {formatVibbaPoints(breakdown.shares)}
            </span>
          </div>
          <div className="rounded-lg bg-[#18191A] px-2.5 py-1.5 flex items-center justify-between">
            <span className="text-[#B0B3B8]">Publicações (+10)</span>
            <span className="font-mono font-bold text-purple-300 tabular-nums">
              {formatVibbaPoints(breakdown.posts)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
