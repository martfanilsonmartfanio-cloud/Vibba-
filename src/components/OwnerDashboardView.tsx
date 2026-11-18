import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  Ban,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Film,
  Flag,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Link2,
  MessageCircle,
  Mic,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  UsersRound,
} from 'lucide-react';
import { OwnerOverview, OwnerUserSummary, UserProfile } from '../types/vibba';
import { ApkStatusInfo, AppLinksInfo, vibbaApi } from '../lib/api';
import { VibbaAvatar } from './VibbaBrand';
import { AudioPostPlayer } from './AudioPostPlayer';
import { MusicTrackPlayerCard } from './MusicStoreModal';
import { ActivityLevelBadge } from './ActivityLevelBadge';
import {
  GlowingMedalIcon,
  formatVibbaPoints,
  getActivityMedalTier,
} from './ActivityMedals';

interface OwnerDashboardViewProps {
  currentUser: UserProfile;
  onOpenUserProfile: (userId: string) => void;
  onOpenChat: (userId: string) => void;
  onGlobalDataChanged: () => Promise<void>;
}

export const OwnerDashboardView: React.FC<OwnerDashboardViewProps> = ({
  currentUser,
  onOpenUserProfile,
  onOpenChat,
  onGlobalDataChanged,
}) => {
  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<
    | 'users'
    | 'reports'
    | 'leaderboard'
    | 'posts'
    | 'groups'
    | 'marketplace'
    | 'pages'
    | 'events'
  >('users');
  const [leaderboardLimit, setLeaderboardLimit] = useState<10 | 200>(10);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'online' | 'suspended'>(
    'all'
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<
    Record<string, { code: string; expiresAt: number }>
  >({});
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [appLinks, setAppLinks] = useState<AppLinksInfo | null>(null);
  const [apkStatus, setApkStatus] = useState<ApkStatusInfo | null>(null);
  const [apkUploading, setApkUploading] = useState(false);
  const [shortAlias, setShortAlias] = useState('');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadOverview = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [data, links, apk] = await Promise.all([
        vibbaApi.getOwnerOverview(),
        vibbaApi.getAppLinks().catch(() => null),
        vibbaApi.getApkStatus().catch(() => null),
      ]);
      setOverview(data);
      if (links) {
        setAppLinks(links);
        setCustomDomainInput(links.customDomain || '');
      }
      if (apk) {
        setApkStatus(apk);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar o painel do proprietário.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview(false);
  }, [loadOverview]);

  const filteredUsers = useMemo(() => {
    if (!overview) return [];
    const q = userSearch.trim().toLowerCase();
    return overview.users.filter((u) => {
      if (userFilter === 'online' && !u.isOnline) return false;
      if (userFilter === 'suspended' && !u.suspended) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q)
      );
    });
  }, [overview, userSearch, userFilter]);

  const topLeaderboardUsers = useMemo(() => {
    if (!overview) return [];
    return overview.users
      .filter((u) => !u.isOwner && !u.suspended)
      .sort((a, b) => {
        const diff = (b.vibbaPoints || 0) - (a.vibbaPoints || 0);
        if (diff !== 0) return diff;
        return (b.postsCount || 0) - (a.postsCount || 0);
      })
      .slice(0, leaderboardLimit);
  }, [overview, leaderboardLimit]);

  const leaderboardStats = useMemo(() => {
    if (!overview) {
      return {
        competingCount: 0,
        reached150Count: 0,
        topUserPoints: 0,
      };
    }
    const nonOwners = overview.users.filter((u) => !u.isOwner);
    const reached150Count = nonOwners.filter(
      (u) => (u.activityLevel?.level || 1) >= 150 || (u.vibbaPoints || 0) >= 1_000_000
    ).length;
    const topUserPoints = nonOwners.reduce(
      (max, u) => Math.max(max, u.vibbaPoints || 0),
      0
    );
    return {
      competingCount: nonOwners.length,
      reached150Count,
      topUserPoints,
    };
  }, [overview]);

  const handleToggleVerified = async (u: OwnerUserSummary) => {
    setBusyId(u.id);
    setError(null);
    try {
      await vibbaApi.updateOwnerUser(u.id, { verified: !u.isVerified });
      await Promise.all([loadOverview(true), onGlobalDataChanged()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar verificação.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleSuspended = async (u: OwnerUserSummary) => {
    setBusyId(u.id);
    setError(null);
    try {
      await vibbaApi.updateOwnerUser(u.id, { suspended: !u.suspended });
      await Promise.all([loadOverview(true), onGlobalDataChanged()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar estado da conta.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setBusyId(userId);
    setError(null);
    try {
      await vibbaApi.deleteOwnerUser(userId);
      setConfirmDeleteKey(null);
      await Promise.all([loadOverview(true), onGlobalDataChanged()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao eliminar conta.');
    } finally {
      setBusyId(null);
    }
  };

  const handleGenerateResetCode = async (u: OwnerUserSummary) => {
    setBusyId(u.id);
    setError(null);
    try {
      const res = await vibbaApi.generateOwnerResetCode(u.id);
      setGeneratedCodes((prev) => ({
        ...prev,
        [u.id]: { code: res.code, expiresAt: res.expiresAt },
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao gerar código de recuperação.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyCode = async (userId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(userId);
      setTimeout(() => {
        setCopiedCodeId((curr) => (curr === userId ? null : curr));
      }, 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleDeletePost = async (postId: string) => {
    setBusyId(postId);
    setError(null);
    try {
      await vibbaApi.deletePost(postId);
      setConfirmDeleteKey(null);
      await Promise.all([loadOverview(true), onGlobalDataChanged()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover publicação.');
    } finally {
      setBusyId(null);
    }
  };

  const handleResolveReport = async (
    reportId: string,
    status: 'open' | 'resolved'
  ) => {
    setBusyId(reportId);
    setError(null);
    try {
      await vibbaApi.resolveOwnerReport(reportId, status);
      await loadOverview(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao atualizar estado da denúncia.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    setBusyId(groupId);
    setError(null);
    try {
      await vibbaApi.deleteGroup(groupId);
      setConfirmDeleteKey(null);
      await Promise.all([loadOverview(true), onGlobalDataChanged()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover grupo.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    setBusyId(listingId);
    setError(null);
    try {
      await vibbaApi.deleteListing(listingId);
      setConfirmDeleteKey(null);
      await Promise.all([loadOverview(true), onGlobalDataChanged()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover anúncio.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    setBusyId(pageId);
    setError(null);
    try {
      await vibbaApi.deletePage(pageId);
      setConfirmDeleteKey(null);
      await Promise.all([loadOverview(true), onGlobalDataChanged()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover página.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setBusyId(eventId);
    setError(null);
    try {
      await vibbaApi.deleteEvent(eventId);
      setConfirmDeleteKey(null);
      await Promise.all([loadOverview(true), onGlobalDataChanged()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover evento.');
    } finally {
      setBusyId(null);
    }
  };

  const handleGenerateShortLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkSaving(true);
    setLinkFeedback(null);
    setError(null);
    try {
      const links = await vibbaApi.generateOwnerShortLink(shortAlias.trim());
      setAppLinks(links);
      setShortAlias('');
      setLinkFeedback(`Link curto atualizado: ${links.shortUrl}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível gerar o link curto.'
      );
    } finally {
      setLinkSaving(false);
    }
  };

  const handleSaveCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkSaving(true);
    setLinkFeedback(null);
    setError(null);
    try {
      const links = await vibbaApi.saveOwnerCustomDomain(customDomainInput.trim());
      setAppLinks(links);
      setLinkFeedback(
        links.customDomain
          ? `Domínio próprio ativado: ${links.customDomain}`
          : 'Domínio próprio removido; a usar o link curto oficial.'
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível validar o domínio.'
      );
    } finally {
      setLinkSaving(false);
    }
  };

  const handleCopyShortUrl = async () => {
    const target = appLinks?.activeShareUrl;
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore clipboard issue
    }
  };

  const handleUploadApk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setApkUploading(true);
    setLinkFeedback(null);
    setError(null);
    try {
      const res = await vibbaApi.uploadOwnerApk(file);
      const updated = await vibbaApi.getApkStatus().catch(() => null);
      if (updated) setApkStatus(updated);
      setLinkFeedback(
        `Ficheiro .APK oficial publicado (${Math.round(res.apkSizeBytes / 1024)} KB). Todos os utilizadores já podem descarregar fora do Chrome!`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível carregar o .APK.'
      );
    } finally {
      setApkUploading(false);
    }
  };

  if (!currentUser.isOwner) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-8 space-y-2">
          <ShieldCheck size={32} className="mx-auto text-rose-400" />
          <h2 className="text-lg font-bold text-white">Acesso Restrito</h2>
          <p className="text-sm text-[#B0B3B8]">
            Esta área é exclusiva para o proprietário oficial do Vibba.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <img
            src="/vibba-icon.png"
            alt="Vibba"
            className="w-12 h-12 rounded-xl object-contain shrink-0"
          />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1877F2]/20 text-[#4599FF] text-[11px] font-bold uppercase tracking-wide mb-1">
              <ShieldCheck size={13} /> Controlo Total do Proprietário
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
              Painel Administrativo Vibba
            </h1>
            <p className="text-xs text-[#B0B3B8] mt-0.5">
              Conta oficial: <span className="text-[#E4E6EB] font-medium">{currentUser.email}</span>
              {overview && (
                <>
                  {' '}· v{overview.appVersion} · Atualizado às{' '}
                  <span className="text-[#45BD62] font-semibold">
                    {new Date(overview.refreshedAt).toLocaleTimeString('pt-PT')}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadOverview(true)}
            disabled={refreshing}
            className="min-h-[42px] px-4 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-sm font-bold inline-flex items-center gap-2 shadow-sm disabled:opacity-70 transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'A atualizar...' : 'Atualizar agora'}</span>
          </button>
        </div>
      </div>

      {appLinks && (
        <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link2 size={17} className="text-[#4599FF]" />
              <h2 className="text-sm font-bold text-white">
                Link Curto Oficial & Domínio Próprio (.co.ao)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#18191A] border border-[#3E4042] text-xs font-mono font-bold text-[#45BD62]">
                {appLinks.activeShareUrl}
              </span>
              <button
                type="button"
                onClick={() => void handleCopyShortUrl()}
                className="px-3 py-1.5 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-semibold inline-flex items-center gap-1"
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <form onSubmit={handleGenerateShortLink} className="flex items-center gap-2">
              <input
                type="text"
                value={shortAlias}
                onChange={(e) => setShortAlias(e.target.value)}
                placeholder="Atalho curto opcional (ex: vibba_angola)"
                className="flex-1 h-10 rounded-lg bg-[#3A3B3C] px-3 text-xs text-white placeholder:text-[#B0B3B8] focus:outline-none"
              />
              <button
                type="submit"
                disabled={linkSaving}
                className="min-h-[40px] px-3.5 rounded-lg bg-[#31A24C] hover:bg-[#2B9243] text-white text-xs font-bold shrink-0 disabled:opacity-60"
              >
                Gerar Link Curto
              </button>
            </form>

            <form onSubmit={handleSaveCustomDomain} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Globe
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"
                />
                <input
                  type="text"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  placeholder="Domínio próprio (ex: https://ais-vibba.co.ao)"
                  className="w-full h-10 rounded-lg bg-[#3A3B3C] pl-8 pr-3 text-xs text-white placeholder:text-[#B0B3B8] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={linkSaving}
                className="min-h-[40px] px-3.5 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-white text-xs font-bold shrink-0 disabled:opacity-60"
              >
                Ligar Domínio
              </button>
            </form>
          </div>

          <p className="text-[11px] text-[#B0B3B8]">
            Nota: Um domínio <strong className="text-[#E4E6EB]">.co.ao</strong> (ex: https://ais-vibba.co.ao) só passa a abrir depois de o registar (ex: em dns.ao) e apontar o DNS para este servidor. Enquanto isso, o Link Curto HTTPS acima já funciona em qualquer telemóvel!
          </p>

          <div className="pt-2.5 border-t border-[#3E4042]/70 flex flex-wrap items-center justify-between gap-2.5">
            <div className="text-xs text-[#E4E6EB]">
              <span className="font-bold">Instalador .APK (Fora do Chrome):</span>{' '}
              {apkStatus?.apkAvailable ? (
                <span className="text-[#45BD62] font-semibold">
                  Ativo ({Math.round(apkStatus.apkSizeBytes / 1024)} KB)
                </span>
              ) : apkStatus?.canAutoBuildApk ? (
                <span className="text-[#45BD62] font-semibold">
                  Compilação automática pronta (domínio público)
                </span>
              ) : (
                <span className="text-[#B0B3B8]">
                  A aguardar Deploy público ou carregamento manual de .APK
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(apkStatus?.apkAvailable || apkStatus?.canAutoBuildApk) && (
                <a
                  href="/api/download-apk"
                  download="Vibba-v8.1.0.apk"
                  className="px-3 py-1.5 rounded-lg bg-[#31A24C] hover:bg-[#2B9243] text-white text-xs font-bold inline-flex items-center gap-1"
                >
                  <Download size={13} /> Baixar .APK
                </a>
              )}
              <label className="px-3 py-1.5 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1">
                <Download size={13} />
                <span>{apkUploading ? 'A carregar...' : 'Carregar .APK'}</span>
                <input
                  type="file"
                  accept=".apk,application/vnd.android.package-archive"
                  disabled={apkUploading}
                  onChange={handleUploadApk}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {linkFeedback && (
            <div className="rounded-lg bg-[#31A24C]/15 border border-[#31A24C]/40 px-3 py-2 text-xs text-[#45BD62]">
              {linkFeedback}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-4 py-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {loading && !overview ? (
        <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-10 text-center text-sm text-[#B0B3B8]">
          A carregar dados em tempo real do Vibba...
        </div>
      ) : overview ? (
        <>
          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-[#B0B3B8]">
                <span>Registados</span>
                <Users size={15} className="text-[#4599FF]" />
              </div>
              <div className="text-2xl font-display font-extrabold text-white tabular-nums">
                {overview.stats.totalUsers}
              </div>
              <div className="text-[11px] text-[#45BD62]">
                +{overview.stats.newUsersLast24h} nas últimas 24h
              </div>
            </div>

            <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-[#B0B3B8]">
                <span>A Usar Agora</span>
                <Activity size={15} className="text-[#31A24C]" />
              </div>
              <div className="text-2xl font-display font-extrabold text-[#31A24C] tabular-nums">
                {overview.stats.onlineUsers}
              </div>
              <div className="text-[11px] text-[#B0B3B8]">
                Ligados em tempo real
              </div>
            </div>

            <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-[#B0B3B8]">
                <span>Publicações</span>
                <Film size={15} className="text-[#F3425F]" />
              </div>
              <div className="text-2xl font-display font-extrabold text-white tabular-nums">
                {overview.stats.totalPosts}
              </div>
              <div className="text-[11px] text-[#B0B3B8] truncate">
                {overview.stats.videoPosts} vídeos · {overview.stats.audioPosts} áudios
              </div>
            </div>

            <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-[#B0B3B8]">
                <span>Comentários</span>
                <Mic size={15} className="text-[#F7B928]" />
              </div>
              <div className="text-2xl font-display font-extrabold text-white tabular-nums">
                {overview.stats.totalComments}
              </div>
              <div className="text-[11px] text-[#B0B3B8]">
                Texto e voz · {overview.stats.photoPosts} fotos
              </div>
            </div>

            <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-[#B0B3B8]">
                <span>Messenger</span>
                <MessageCircle size={15} className="text-[#4599FF]" />
              </div>
              <div className="text-2xl font-display font-extrabold text-white tabular-nums">
                {overview.stats.totalMessages}
              </div>
              <div className="text-[11px] text-[#B0B3B8]">
                {overview.stats.activeStories} histórias ativas
              </div>
            </div>

            <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-[#B0B3B8]">
                <span>Comunidade</span>
                <ShoppingBag size={15} className="text-[#45BD62]" />
              </div>
              <div className="text-2xl font-display font-extrabold text-white tabular-nums">
                {overview.stats.totalGroups +
                  overview.stats.totalListings +
                  overview.stats.totalPages +
                  overview.stats.totalEvents}
              </div>
              <div className="text-[11px] text-[#B0B3B8] truncate">
                {overview.stats.totalGroups} grp · {overview.stats.totalListings} loja
              </div>
            </div>
          </div>

          {/* Section Switcher */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                {
                  id: 'users',
                  label: `Utilizadores (${overview.users.length})`,
                  icon: <Users size={15} />,
                },
                {
                  id: 'reports',
                  label: `Denúncias (${overview.stats.pendingReports ?? 0})`,
                  icon: <Flag size={15} className={(overview.stats.pendingReports ?? 0) > 0 ? 'text-amber-400' : ''} />,
                },
                {
                  id: 'leaderboard',
                  label: 'Top 10 & Ranking (200)',
                  icon: <Trophy size={15} />,
                },
                {
                  id: 'posts',
                  label: `Publicações (${overview.recentPosts.length})`,
                  icon: <ImageIcon size={15} />,
                },
                {
                  id: 'groups',
                  label: `Grupos (${overview.groups.length})`,
                  icon: <UsersRound size={15} />,
                },
                {
                  id: 'marketplace',
                  label: `Marketplace (${overview.listings.length})`,
                  icon: <ShoppingBag size={15} />,
                },
                {
                  id: 'pages',
                  label: `Páginas (${overview.pages.length})`,
                  icon: <Flag size={15} />,
                },
                {
                  id: 'events',
                  label: `Eventos (${overview.events.length})`,
                  icon: <Calendar size={15} />,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSection(tab.id);
                  setConfirmDeleteKey(null);
                }}
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  section === tab.id
                    ? 'bg-[#1877F2] text-white'
                    : 'bg-[#242526] border border-[#3E4042] text-[#B0B3B8] hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* REPORTS MODERATION SECTION */}
          {section === 'reports' && (
            <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <Flag size={17} className="text-amber-400" />
                    Moderação de Denúncias
                  </h3>
                  <p className="text-xs text-[#B0B3B8]">
                    Analisa áudios e publicações denunciadas por direitos de autor, ofensas, burlas ou conteúdo impróprio.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-xs font-bold text-amber-200">
                  {overview.stats.pendingReports ?? 0} pendentes
                </span>
              </div>

              {(!overview.reports || overview.reports.length === 0) ? (
                <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-8 text-center text-xs text-[#B0B3B8]">
                  Nenhuma denúncia recebida até ao momento. A comunidade está limpa!
                </div>
              ) : (
                <div className="space-y-3">
                  {overview.reports.map((rep) => {
                    const reasonLabel =
                      rep.reason === 'copyright'
                        ? 'Direitos de autor / MP3 comercial'
                        : rep.reason === 'harassment'
                        ? 'Ofensa ou exposição privada'
                        : rep.reason === 'scam'
                        ? 'Burla ou dinheiro falso'
                        : 'Conteúdo +18 ou violência';
                    return (
                      <div
                        key={rep.id}
                        className={`rounded-xl border p-4 space-y-3 ${
                          rep.status === 'open'
                            ? 'bg-[#18191A] border-amber-500/45'
                            : 'bg-[#18191A]/60 border-[#3E4042] opacity-75'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  rep.status === 'open'
                                    ? 'bg-amber-500/20 text-amber-200'
                                    : 'bg-[#31A24C]/20 text-[#45BD62]'
                                }`}
                              >
                                {rep.status === 'open' ? 'Pendente' : 'Resolvida'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 text-[10px] font-bold">
                                {reasonLabel}
                              </span>
                              <span className="text-[11px] text-[#B0B3B8]">
                                {rep.createdAtLabel}
                              </span>
                            </div>
                            <div className="text-xs text-[#E4E6EB]">
                              Autor:{' '}
                              <strong className="text-white">
                                {rep.postAuthorName}
                              </strong>{' '}
                              <span className="text-[#B0B3B8]">
                                ({rep.postAuthorHandle})
                              </span>{' '}
                              · Denunciado por{' '}
                              <strong className="text-[#4599FF]">
                                {rep.reporterName}
                              </strong>{' '}
                              <span className="text-[#B0B3B8]">
                                ({rep.reporterHandle})
                              </span>
                            </div>
                            {rep.details && (
                              <p className="text-xs text-amber-200/90 bg-amber-500/10 rounded-lg px-2.5 py-1.5 border border-amber-500/25">
                                Nota: &ldquo;{rep.details}&rdquo;
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {rep.postContent !== '[Publicação já removida]' && (
                              <button
                                type="button"
                                disabled={busyId === rep.postId}
                                onClick={() => void handleDeletePost(rep.postId)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <Trash2 size={13} /> Apagar Publicação
                              </button>
                            )}
                            {rep.postAuthorId && (
                              <button
                                type="button"
                                disabled={busyId === rep.postAuthorId}
                                onClick={() => {
                                  const target = overview.users.find(
                                    (u) => u.id === rep.postAuthorId
                                  );
                                  if (target) void handleToggleSuspended(target);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <Ban size={13} /> Suspender Autor
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busyId === rep.id}
                              onClick={() =>
                                void handleResolveReport(
                                  rep.id,
                                  rep.status === 'open' ? 'resolved' : 'open'
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <CheckCircle2 size={13} className="text-[#45BD62]" />
                              {rep.status === 'open' ? 'Marcar Resolvida' : 'Reabrir'}
                            </button>
                          </div>
                        </div>

                        <div className="rounded-lg bg-[#242526] border border-[#3E4042] p-3 space-y-2">
                          <p className="text-xs text-[#E4E6EB] whitespace-pre-wrap">
                            {rep.postContent || '(Publicação sem texto)'}
                          </p>
                          {rep.postAudioUrl && (
                            <AudioPostPlayer
                              src={rep.postAudioUrl}
                              durationSec={rep.postAudioDurationSec}
                              seed={rep.id}
                            />
                          )}
                          {rep.postImageUrl && (
                            <img
                              src={rep.postImageUrl}
                              alt="Conteúdo denunciado"
                              className="max-h-48 rounded-lg object-cover"
                            />
                          )}
                          {rep.postVideoUrl && (
                            <video
                              src={rep.postVideoUrl}
                              controls
                              playsInline
                              className="w-full max-h-56 rounded-lg bg-black"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LEADERBOARD SECTION (TOP 10 — CORRIDA PELO NÍVEL 150) */}
          {section === 'leaderboard' && (
            <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <GlowingMedalIcon level={150} size="md" unlocked />
                  <div>
                    <h3 className="text-base font-display font-bold text-white">
                      Sociedade dos 10 Melhores · Ranking até Top 200
                    </h3>
                    <p className="text-xs text-[#B0B3B8]">
                      Proprietário excluído por regra oficial. Acompanha os melhores até ao{' '}
                      <strong className="text-[#E4E6EB]">Top 200</strong> rumo à meta de{' '}
                      <strong className="text-[#E4E6EB]">1.000.000 Vibba Points</strong> (Nível 150).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#18191A] border border-[#3E4042] self-start">
                  <button
                    type="button"
                    onClick={() => setLeaderboardLimit(10)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      leaderboardLimit === 10
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                        : 'text-[#B0B3B8] hover:text-white'
                    }`}
                  >
                    Top 10 Melhores
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardLimit(200)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      leaderboardLimit === 200
                        ? 'bg-[#1877F2] text-white'
                        : 'text-[#B0B3B8] hover:text-white'
                    }`}
                  >
                    Expandir até 200
                  </button>
                </div>
              </div>

              {/* Summary KPIs for Level 150 Race */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="rounded-xl bg-[#18191A] border border-[#3E4042] px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#B0B3B8]">Competidores ativos</span>
                  <span className="text-sm font-mono font-bold text-white tabular-nums">
                    {leaderboardStats.competingCount}
                  </span>
                </div>
                <div className="rounded-xl bg-[#18191A] border border-[#3E4042] px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#B0B3B8]">Maior pontuação (utilizador)</span>
                  <span className="text-sm font-mono font-bold text-[#45BD62] tabular-nums">
                    {formatVibbaPoints(leaderboardStats.topUserPoints)} pts
                  </span>
                </div>
                <div className="rounded-xl bg-[#18191A] border border-[#3E4042] px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#B0B3B8]">Já no Nível 150 (1M+)</span>
                  <span className="text-sm font-mono font-bold text-fuchsia-300 tabular-nums">
                    {leaderboardStats.reached150Count}
                  </span>
                </div>
              </div>

              {topLeaderboardUsers.length === 0 ? (
                <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-8 text-center space-y-1.5">
                  <p className="text-sm font-semibold text-[#E4E6EB]">
                    Ainda não há utilizadores na corrida pelo Nível 150.
                  </p>
                  <p className="text-xs text-[#B0B3B8]">
                    Assim que os utilizadores se registarem e interagirem no Vibba, os 10 primeiros aparecerão aqui em tempo real.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#3E4042] bg-[#18191A]">
                  <table className="w-full text-left border-collapse min-w-[680px]">
                    <thead>
                      <tr className="border-b border-[#3E4042] text-[11px] font-bold text-[#B0B3B8] bg-[#202124]">
                        <th className="py-2.5 px-3 w-14">Pos.</th>
                        <th className="py-2.5 px-3">Utilizador</th>
                        <th className="py-2.5 px-3">Nível & Medalha</th>
                        <th className="py-2.5 px-3 text-right">Pontuação</th>
                        <th className="py-2.5 px-3 w-52">Progresso Nível 150</th>
                        <th className="py-2.5 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3E4042]/70 text-xs">
                      {topLeaderboardUsers.map((u, idx) => {
                        const rank = idx + 1;
                        const level = u.activityLevel?.level || 1;
                        const medal = getActivityMedalTier(level);
                        const pts = u.vibbaPoints || 0;
                        const pctTo150 = Math.min(
                          100,
                          Math.max(0, Math.round((pts / 1_000_000) * 1000) / 10)
                        );
                        const remainingTo150 = Math.max(0, 1_000_000 - pts);

                        const rankBadgeClass =
                          rank === 1
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                            : rank === 2
                            ? 'bg-slate-300/20 text-slate-200 border-slate-300/50'
                            : rank === 3
                            ? 'bg-orange-500/20 text-orange-300 border-orange-400/50'
                            : 'bg-[#242526] text-[#B0B3B8] border-[#3E4042]';

                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-[#242526]/70 transition-colors"
                          >
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border font-mono text-xs font-bold tabular-nums ${rankBadgeClass}`}
                              >
                                #{rank}
                              </span>
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
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white truncate max-w-[160px]">
                                      {u.name}
                                    </span>
                                    {u.isVerified && (
                                      <BadgeCheck size={14} className="text-[#1877F2] shrink-0" />
                                    )}
                                    {u.isOwner && (
                                      <span className="px-1.5 py-0.5 rounded bg-[#1877F2]/25 text-[#4599FF] text-[10px] font-bold">
                                        Proprietário
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[#B0B3B8] truncate">
                                    {u.handle} · {u.postsCount} pub · {u.commentsCount} com
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <ActivityLevelBadge
                                  level={level}
                                  title={u.activityLevel?.title || medal.levelTitle}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-mono font-bold text-[#45BD62] tabular-nums">
                                {formatVibbaPoints(pts)} pts
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {u.isOwner ? (
                                <div className="text-[11px] font-semibold text-amber-200">
                                  Nível 200 Supremo (+200M)
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] tabular-nums">
                                    <span className="text-[#E4E6EB] font-semibold">
                                      {pctTo150}%
                                    </span>
                                    <span className="text-[#B0B3B8]">
                                      {remainingTo150 === 0
                                        ? 'Nível 150 completo!'
                                        : `Faltam ${formatVibbaPoints(remainingTo150)}`}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-[#242526] overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#C026D3] to-[#EC4899]"
                                      style={{ width: `${Math.min(100, pctTo150)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => onOpenUserProfile(u.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-[11px] font-semibold text-[#E4E6EB] inline-flex items-center gap-1 whitespace-nowrap"
                              >
                                <UserCheck size={13} /> Perfil
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
          )}

          {/* USERS SECTION */}
          {section === 'users' && (
            <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"
                  />
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Pesquisar por nome, @utilizador, e-mail ou cidade..."
                    className="w-full h-10 rounded-xl bg-[#3A3B3C] pl-9 pr-3 text-xs text-white placeholder:text-[#B0B3B8] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'Todos' },
                      { id: 'online', label: `Online (${overview.stats.onlineUsers})` },
                      {
                        id: 'suspended',
                        label: `Suspensos (${overview.stats.suspendedUsers})`,
                      },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setUserFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        userFilter === f.id
                          ? 'bg-[#263951] text-[#4599FF]'
                          : 'bg-[#3A3B3C] text-[#B0B3B8] hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <p className="text-xs text-[#B0B3B8] text-center py-8">
                  Nenhum utilizador encontrado com este filtro.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {filteredUsers.map((u) => {
                    const delKey = `user:${u.id}`;
                    return (
                      <div
                        key={u.id}
                        className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <VibbaAvatar
                            src={u.avatarUrl}
                            alt={u.name}
                            isOnline={u.isOnline}
                            sizeClass="w-11 h-11"
                            initials={u.name.slice(0, 2).toUpperCase()}
                          />
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold text-white truncate">
                                {u.name}
                              </span>
                              {u.isVerified && (
                                <BadgeCheck size={15} className="text-[#1877F2]" />
                              )}
                              {u.isOwner && (
                                <span className="px-2 py-0.5 rounded bg-[#1877F2]/25 text-[#4599FF] text-[10px] font-bold">
                                  Proprietário
                                </span>
                              )}
                              {u.professionalMode && (
                                <span className="px-2 py-0.5 rounded bg-[#7C3AED]/25 text-purple-200 text-[10px] font-bold">
                                  Modo Profissional · {u.professionalCategory || 'Criador Digital'}
                                </span>
                              )}
                              {u.isOnline ? (
                                <span className="px-2 py-0.5 rounded bg-[#31A24C]/20 text-[#45BD62] text-[10px] font-bold">
                                  Online agora
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-[#3A3B3C] text-[#B0B3B8] text-[10px]">
                                  Offline
                                </span>
                              )}
                              {u.suspended && (
                                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                  Suspenso
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#B0B3B8] truncate">
                              {u.handle} ·{' '}
                              <span className="text-[#E4E6EB]">
                                {u.email.endsWith('@anon.vibba.local')
                                  ? 'Conta anónima'
                                  : u.email}
                              </span>
                              {u.phone ? ` · ${u.phone}` : ''}
                              {!u.isOwner && typeof u.age === 'number'
                                ? ` · ${u.age} anos`
                                : u.isAdult && !u.isOwner
                                ? ' · +18'
                                : ''}{' '}
                              · {u.location}
                            </div>
                            <div className="text-[11px] text-[#B0B3B8]">
                              Registado {u.createdAtLabel} ({new Date(u.createdAt).toLocaleString('pt-PT')}) ·{' '}
                              {u.isOwner || u.professionalMode
                                ? `${u.followersCount ?? 0} seguidores`
                                : `${u.friendsCount} amigos · ${u.followersCount ?? 0} seguidores`}{' '}
                              · {u.postsCount} publicações · {u.messagesCount} mensagens ·{' '}
                              <span className="text-[#E4E6EB] font-semibold tabular-nums">
                                Nível {u.activityLevel?.level || 1} (
                                {(u.vibbaPoints || 0).toLocaleString('pt-PT')} pts)
                              </span>
                            </div>
                            {generatedCodes[u.id] && (
                              <div className="inline-flex flex-wrap items-center gap-2 mt-1 px-2.5 py-1 rounded-lg bg-[#263951] border border-[#1877F2]/40 text-xs">
                                <span className="text-[#B0B3B8]">Código 30 min:</span>
                                <span className="font-mono font-bold tracking-widest text-white">
                                  {generatedCodes[u.id].code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyCode(u.id, generatedCodes[u.id].code)
                                  }
                                  className="inline-flex items-center gap-1 text-[#4599FF] hover:underline font-semibold"
                                >
                                  {copiedCodeId === u.id ? (
                                    <>
                                      <Check size={12} /> Copiado
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} /> Copiar
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenUserProfile(u.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-xs font-semibold text-[#E4E6EB] inline-flex items-center gap-1"
                          >
                            <UserCheck size={13} /> Perfil
                          </button>
                          {!u.isOwner && (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenChat(u.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-xs font-semibold text-[#4599FF] inline-flex items-center gap-1"
                              >
                                <MessageCircle size={13} /> Chat
                              </button>
                              <button
                                type="button"
                                disabled={busyId === u.id}
                                onClick={() => void handleGenerateResetCode(u)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#263951] hover:bg-[#314A68] text-xs font-semibold text-[#4599FF] inline-flex items-center gap-1"
                              >
                                <KeyRound size={13} /> Código Senha
                              </button>
                              <button
                                type="button"
                                disabled={busyId === u.id}
                                onClick={() => void handleToggleVerified(u)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-xs font-semibold text-[#E4E6EB] inline-flex items-center gap-1"
                              >
                                <CheckCircle2 size={13} className="text-[#1877F2]" />
                                {u.isVerified ? 'Tirar selo' : 'Verificar'}
                              </button>
                              <button
                                type="button"
                                disabled={busyId === u.id}
                                onClick={() => void handleToggleSuspended(u)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${
                                  u.suspended
                                    ? 'bg-[#31A24C] text-white'
                                    : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                }`}
                              >
                                <Ban size={13} />
                                {u.suspended ? 'Reativar' : 'Suspender'}
                              </button>
                              {confirmDeleteKey === delKey ? (
                                <button
                                  type="button"
                                  disabled={busyId === u.id}
                                  onClick={() => void handleDeleteUser(u.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
                                >
                                  Confirmar apagar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteKey(delKey)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold inline-flex items-center gap-1"
                                >
                                  <Trash2 size={13} /> Apagar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* POSTS SECTION */}
          {section === 'posts' && (
            <div className="space-y-3">
              {overview.recentPosts.length === 0 ? (
                <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-8 text-center text-xs text-[#B0B3B8]">
                  Ainda não existem publicações no Vibba.
                </div>
              ) : (
                overview.recentPosts.map((p) => {
                  const delKey = `post:${p.id}`;
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <VibbaAvatar
                            src={p.authorAvatar}
                            alt={p.authorName}
                            sizeClass="w-9 h-9"
                            initials={p.authorName.slice(0, 2).toUpperCase()}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">
                              {p.authorName}{' '}
                              <span className="text-xs font-normal text-[#B0B3B8]">
                                {p.authorHandle}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#B0B3B8]">
                              {p.createdAtLabel} · Privacidade: {p.privacy} · {p.likes} reações · {p.commentsCount} comentários
                            </div>
                          </div>
                        </div>

                        {confirmDeleteKey === delKey ? (
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => void handleDeletePost(p.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold shrink-0"
                          >
                            Confirmar remover
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteKey(delKey)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                          >
                            <Trash2 size={13} /> Remover
                          </button>
                        )}
                      </div>

                      {p.content && (
                        <p className="text-sm text-[#E4E6EB] whitespace-pre-wrap">
                          {p.content}
                        </p>
                      )}
                      {p.videoUrl && (
                        <video
                          src={p.videoUrl}
                          controls
                          playsInline
                          className="w-full max-h-72 rounded-xl bg-black"
                        />
                      )}
                      {p.imageUrl && (
                        <img
                          src={p.imageUrl}
                          alt="Anexo"
                          className="max-h-60 rounded-xl object-cover"
                        />
                      )}
                      {p.audioUrl && (
                        <AudioPostPlayer
                          src={p.audioUrl}
                          durationSec={p.audioDurationSec}
                          seed={p.id}
                        />
                      )}
                      {p.musicTrack && (
                        <MusicTrackPlayerCard track={p.musicTrack} seed={p.id} compact />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* GROUPS */}
          {section === 'groups' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {overview.groups.length === 0 ? (
                <div className="md:col-span-2 rounded-2xl bg-[#242526] border border-[#3E4042] p-8 text-center text-xs text-[#B0B3B8]">
                  Nenhum grupo criado ainda.
                </div>
              ) : (
                overview.groups.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{g.name}</div>
                      <div className="text-xs text-[#B0B3B8]">
                        {g.category} · {g.membersCount} membros · Criado por {g.creatorName}
                      </div>
                    </div>
                    {confirmDeleteKey === `grp:${g.id}` ? (
                      <button
                        type="button"
                        disabled={busyId === g.id}
                        onClick={() => void handleDeleteGroup(g.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold shrink-0"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteKey(`grp:${g.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold shrink-0"
                      >
                        Apagar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* MARKETPLACE */}
          {section === 'marketplace' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {overview.listings.length === 0 ? (
                <div className="md:col-span-2 rounded-2xl bg-[#242526] border border-[#3E4042] p-8 text-center text-xs text-[#B0B3B8]">
                  Nenhum anúncio no Marketplace.
                </div>
              ) : (
                overview.listings.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{l.title}</div>
                      <div className="text-xs text-[#B0B3B8]">
                        {l.priceKz.toLocaleString('pt-PT')} Kz · {l.sellerName} · {l.location}
                      </div>
                    </div>
                    {confirmDeleteKey === `mkt:${l.id}` ? (
                      <button
                        type="button"
                        disabled={busyId === l.id}
                        onClick={() => void handleDeleteListing(l.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold shrink-0"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteKey(`mkt:${l.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold shrink-0"
                      >
                        Apagar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* PAGES */}
          {section === 'pages' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {overview.pages.length === 0 ? (
                <div className="md:col-span-2 rounded-2xl bg-[#242526] border border-[#3E4042] p-8 text-center text-xs text-[#B0B3B8]">
                  Nenhuma página criada ainda.
                </div>
              ) : (
                overview.pages.map((pg) => (
                  <div
                    key={pg.id}
                    className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{pg.name}</div>
                      <div className="text-xs text-[#B0B3B8]">
                        {pg.category} · {pg.followersCount} seguidores · {pg.ownerName}
                      </div>
                    </div>
                    {confirmDeleteKey === `pag:${pg.id}` ? (
                      <button
                        type="button"
                        disabled={busyId === pg.id}
                        onClick={() => void handleDeletePage(pg.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold shrink-0"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteKey(`pag:${pg.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold shrink-0"
                      >
                        Apagar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* EVENTS */}
          {section === 'events' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {overview.events.length === 0 ? (
                <div className="md:col-span-2 rounded-2xl bg-[#242526] border border-[#3E4042] p-8 text-center text-xs text-[#B0B3B8]">
                  Nenhum evento criado ainda.
                </div>
              ) : (
                overview.events.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-2xl bg-[#242526] border border-[#3E4042] p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{ev.title}</div>
                      <div className="text-xs text-[#B0B3B8]">
                        {ev.location} · {ev.goingCount} vão · {ev.creatorName}
                      </div>
                    </div>
                    {confirmDeleteKey === `evt:${ev.id}` ? (
                      <button
                        type="button"
                        disabled={busyId === ev.id}
                        onClick={() => void handleDeleteEvent(ev.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold shrink-0"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteKey(`evt:${ev.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold shrink-0"
                      >
                        Apagar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
