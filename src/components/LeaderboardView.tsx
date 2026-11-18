import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Crown,
  RefreshCw,
  Rss,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
} from 'lucide-react';
import { LeaderboardEntry, LeaderboardResponse, UserProfile } from '../types/vibba';
import { vibbaApi } from '../lib/api';
import { VibbaAvatar } from './VibbaBrand';
import { ActivityLevelBadge } from './ActivityLevelBadge';
import {
  GlowingMedalIcon,
  formatVibbaPoints,
  getActivityMedalTier,
} from './ActivityMedals';

interface LeaderboardViewProps {
  currentUser: UserProfile;
  onOpenUserProfile: (userId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentUser,
  onOpenUserProfile,
}) => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'top10' | 'top200'>('top10');
  const [search, setSearch] = useState('');

  const loadLeaderboard = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await vibbaApi.getLeaderboard(200);
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o ranking.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLeaderboard(false);
  }, [loadLeaderboard]);

  const activeEntries = useMemo<LeaderboardEntry[]>(() => {
    if (!data) return [];
    const base = viewMode === 'top10' ? data.top10 : data.entries.slice(0, 200);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return data.entries.filter(
      (item) =>
        item.member.name.toLowerCase().includes(q) ||
        item.member.handle.toLowerCase().includes(q) ||
        (item.member.location || '').toLowerCase().includes(q)
    );
  }, [data, viewMode, search]);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#242526] via-[#242526] to-[#261E3A] border border-[#3E4042] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <GlowingMedalIcon level={150} size="md" unlocked />
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold uppercase tracking-wide">
              <Crown size={12} /> Sociedade dos 10 Melhores · Top 200
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
              Ranking Oficial Vibba Points
            </h1>
            <p className="text-xs text-[#B0B3B8] max-w-xl">
              Os 10 utilizadores com mais Vibba Points entram na{' '}
              <strong className="text-[#E4E6EB]">Sociedade dos 10 Melhores</strong>{' '}
              e o ranking expande até aos <strong className="text-[#E4E6EB]">200 primeiros</strong> rumo ao Nível 150 (1.000.000 pts). O proprietário oficial não participa na competição.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadLeaderboard(true)}
          disabled={refreshing}
          className="min-h-[40px] px-4 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold inline-flex items-center gap-2 self-start md:self-center shrink-0 disabled:opacity-60"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'A atualizar...' : 'Atualizar ranking'}</span>
        </button>
      </div>

      {/* User Rank Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#B0B3B8]">A tua posição</div>
            {currentUser.isOwner ? (
              <div className="text-sm font-bold text-[#4599FF] mt-0.5 inline-flex items-center gap-1">
                <ShieldCheck size={14} /> Proprietário (Fora do Ranking)
              </div>
            ) : (
              <div className="text-2xl font-display font-extrabold text-white mt-0.5 tabular-nums">
                {data?.myRank ? `#${data.myRank}` : '—'}
              </div>
            )}
          </div>
          <Trophy size={22} className="text-amber-400" />
        </div>

        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#B0B3B8]">Os teus Vibba Points</div>
            <div className="text-2xl font-display font-extrabold text-[#45BD62] mt-0.5 tabular-nums">
              {formatVibbaPoints(currentUser.vibbaPoints || 0)}
            </div>
          </div>
          <Sparkles size={22} className="text-[#45BD62]" />
        </div>

        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#B0B3B8]">Competidores ativos</div>
            <div className="text-2xl font-display font-extrabold text-white mt-0.5 tabular-nums">
              {data?.totalEligible ?? 0}
            </div>
          </div>
          <Crown size={22} className="text-[#C026D3]" />
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#18191A] border border-[#3E4042] self-start">
            <button
              type="button"
              onClick={() => setViewMode('top10')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                viewMode === 'top10'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'text-[#B0B3B8] hover:text-white'
              }`}
            >
              Sociedade dos 10 Melhores
            </button>
            <button
              type="button"
              onClick={() => setViewMode('top200')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                viewMode === 'top200'
                  ? 'bg-[#1877F2] text-white'
                  : 'text-[#B0B3B8] hover:text-white'
              }`}
            >
              Ranking até Top 200 ({Math.min(200, data?.totalEligible || 0)})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar no ranking..."
              className="w-full h-9 rounded-full bg-[#3A3B3C] pl-8 pr-3 text-xs text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-4 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="py-10 text-center text-xs text-[#B0B3B8]">
            A carregar classificação do Vibba...
          </div>
        ) : activeEntries.length === 0 ? (
          <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-8 text-center space-y-1.5">
            <p className="text-sm font-semibold text-[#E4E6EB]">
              Nenhum utilizador encontrado neste ranking.
            </p>
            <p className="text-xs text-[#B0B3B8]">
              Publica, comenta e partilha para acumular Vibba Points e subir até ao Nível 150!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#3E4042] bg-[#18191A]">
            <table className="w-full text-left border-collapse min-w-[660px]">
              <thead>
                <tr className="border-b border-[#3E4042] text-[11px] font-bold text-[#B0B3B8] bg-[#202124]">
                  <th className="py-2.5 px-3 w-16">Pos.</th>
                  <th className="py-2.5 px-3">Utilizador</th>
                  <th className="py-2.5 px-3">Nível & Medalha</th>
                  <th className="py-2.5 px-3 text-right">Pontos</th>
                  <th className="py-2.5 px-3 w-48">Meta Nível 150</th>
                  <th className="py-2.5 px-3 text-right">Perfil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3E4042]/70 text-xs">
                {activeEntries.map((entry) => {
                  const u = entry.member;
                  const level = u.activityLevel?.level || 1;
                  const medal = getActivityMedalTier(level);
                  const pts = u.vibbaPoints || 0;
                  const pctTo150 = Math.min(
                    100,
                    Math.max(0, Math.round((pts / 1_000_000) * 1000) / 10)
                  );

                  const rankBadgeClass =
                    entry.rank === 1
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                      : entry.rank === 2
                      ? 'bg-slate-300/20 text-slate-200 border-slate-300/50'
                      : entry.rank === 3
                      ? 'bg-orange-500/20 text-orange-300 border-orange-400/50'
                      : entry.isTop10
                      ? 'bg-[#7C3AED]/20 text-purple-200 border-[#7C3AED]/45'
                      : 'bg-[#242526] text-[#B0B3B8] border-[#3E4042]';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-[#242526]/70 transition-colors ${
                        u.isMe ? 'bg-[#1877F2]/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-7 rounded-lg border font-mono text-xs font-bold tabular-nums ${rankBadgeClass}`}
                          >
                            #{entry.rank}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <VibbaAvatar
                            src={u.avatarUrl}
                            alt={u.name}
                            isOnline={u.isOnline}
                            sizeClass="w-9 h-9"
                            initials={u.name.slice(0, 2).toUpperCase()}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white truncate max-w-[160px]">
                                {u.name}
                              </span>
                              {u.isVerified && (
                                <BadgeCheck size={14} className="text-[#1877F2] shrink-0" />
                              )}
                              {entry.isTop10 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                  Top 10
                                </span>
                              )}
                              {u.isMe && (
                                <span className="px-1.5 py-0.5 rounded bg-[#1877F2]/25 text-[#4599FF] text-[10px] font-bold">
                                  Tu
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#B0B3B8] truncate flex items-center gap-1.5">
                              <span>@{u.handle}</span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <Rss size={10} /> {u.followersCount || 0} seguidores
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <ActivityLevelBadge
                          level={level}
                          title={u.activityLevel?.title || medal.levelTitle}
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-bold text-[#45BD62] tabular-nums">
                          {formatVibbaPoints(pts)} pts
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] tabular-nums">
                            <span className="text-[#E4E6EB] font-semibold">
                              {pctTo150}%
                            </span>
                            <span className="text-[#B0B3B8]">
                              {pts >= 1_000_000 ? 'Nível 150+' : 'Meta 1M'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#242526] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#C026D3] to-[#EC4899]"
                              style={{ width: `${Math.min(100, pctTo150)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenUserProfile(u.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-[11px] font-semibold text-[#E4E6EB] inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <UserCheck size={13} /> Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
