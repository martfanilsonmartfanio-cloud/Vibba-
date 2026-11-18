import React, { useMemo, useRef, useState } from 'react';
import {
  Award,
  BadgeCheck,
  BarChart3,
  Briefcase,
  Camera,
  Edit3,
  Eye,
  EyeOff,
  Film,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Image as ImageIcon,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Mic,
  Rss,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { CommunityMember, UserProfile, VibbaPost } from '../types/vibba';
import { compressImageFile, vibbaApi } from '../lib/api';
import { VibbaAvatar } from './VibbaBrand';
import { ActivityLevelBadge, VibbaPointsCard } from './ActivityLevelBadge';
import {
  ProfileMedalsHeaderStrip,
  ProfileMedalsShowcase,
  formatVibbaPoints,
} from './ActivityMedals';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';

interface ProfileViewProps {
  currentUser: UserProfile;
  users: CommunityMember[];
  posts: VibbaPost[];
  onProfileUpdated: (user: UserProfile) => void;
  onPostCreated: (post: VibbaPost) => void;
  onPostUpdated: (post: VibbaPost) => void;
  onPostDeleted: (postId: string) => void;
  onLogout: () => void;
  onOpenUserProfile: (userId: string) => void;
  onOpenChat: (peer: CommunityMember) => void;
  onOpenOwnerPanel?: () => void;
}

const PROFESSIONAL_CATEGORIES = [
  'Criador Digital',
  'Artista / Músico',
  'Empreendedor',
  'Educador',
  'Comércio Local',
  'Desporto',
  'Humor & Entretenimento',
  'Figura Pública',
  'Produtor de Vídeo',
] as const;

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  users,
  posts,
  onProfileUpdated,
  onPostCreated,
  onPostUpdated,
  onPostDeleted,
  onLogout,
  onOpenUserProfile,
  onOpenChat,
  onOpenOwnerPanel,
}) => {
  const followersOnly = Boolean(currentUser.isOwner || currentUser.professionalMode);
  const [tab, setTab] = useState<
    'posts' | 'about' | 'friends' | 'followers' | 'photos' | 'saved' | 'professional'
  >('posts');
  const [editingAbout, setEditingAbout] = useState(false);

  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [location, setLocation] = useState(currentUser.location);
  const [hometown, setHometown] = useState(currentUser.hometown || '');
  const [work, setWork] = useState(currentUser.work || '');
  const [education, setEducation] = useState(currentUser.education || '');
  const [relationship, setRelationship] = useState(currentUser.relationship || '');
  const [website, setWebsite] = useState(currentUser.website || '');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [proCategory, setProCategory] = useState(
    currentUser.professionalCategory || 'Criador Digital'
  );
  const [proBusy, setProBusy] = useState(false);
  const [proError, setProError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [secQuestion, setSecQuestion] = useState(
    currentUser.recoveryQuestion || 'Qual é a tua palavra secreta de recuperação?'
  );
  const [secAnswer, setSecAnswer] = useState('');
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityOk, setSecurityOk] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const myPosts = useMemo(
    () => posts.filter((p) => p.authorId === currentUser.id),
    [posts, currentUser.id]
  );

  const myPhotos = useMemo(
    () => myPosts.filter((p) => Boolean(p.imageUrl)),
    [myPosts]
  );

  const mySaved = useMemo(() => posts.filter((p) => p.savedByMe), [posts]);

  const myFriends = useMemo(
    () =>
      followersOnly
        ? []
        : users.filter((u) => !u.isMe && !u.isOwner && u.friendshipStatus === 'friends'),
    [users, followersOnly]
  );

  const myFollowers = useMemo(() => {
    const followerSet = new Set(currentUser.followerIds || []);
    return users.filter((u) => !u.isMe && followerSet.has(u.id));
  }, [users, currentUser.followerIds]);

  const proStats = useMemo(() => {
    let totalReactions = 0;
    let totalComments = 0;
    let videoCount = 0;
    let audioCount = 0;
    let photoCount = 0;
    for (const p of myPosts) {
      totalReactions += p.likes || 0;
      totalComments += p.commentsCount || 0;
      if (p.videoUrl) videoCount++;
      if (p.audioUrl) audioCount++;
      if (p.imageUrl) photoCount++;
    }
    return {
      followersCount: currentUser.followersCount || 0,
      interactionsCount: totalReactions + totalComments,
      totalReactions,
      totalComments,
      videoCount,
      audioCount,
      photoCount,
    };
  }, [myPosts, currentUser.followersCount]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const compressed = await compressImageFile(file, 640);
    const res = await vibbaApi.updateProfile({ avatarUrl: compressed });
    onProfileUpdated(res.user);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const compressed = await compressImageFile(file, 1280);
    const res = await vibbaApi.updateProfile({ coverUrl: compressed });
    onProfileUpdated(res.user);
  };

  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await vibbaApi.updateProfile({
        name: name.trim() || currentUser.name,
        bio: bio.trim(),
        location: location.trim(),
        hometown: hometown.trim(),
        work: work.trim(),
        education: education.trim(),
        relationship: relationship.trim(),
        website: website.trim(),
      });
      onProfileUpdated(res.user);
      setEditingAbout(false);
      setStatusMsg('Perfil actualizado com sucesso.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecurityOk(null);
    if (newPassword.length < 6) {
      setSecurityError('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setSecurityError('As novas palavras-passe não coincidem.');
      return;
    }
    setSecuritySaving(true);
    try {
      await vibbaApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSecurityOk('Palavra-passe alterada com sucesso.');
    } catch (err) {
      setSecurityError(
        err instanceof Error ? err.message : 'Não foi possível alterar a palavra-passe.'
      );
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleSaveRecoveryQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecurityOk(null);
    if (secAnswer.trim().length < 2) {
      setSecurityError('Indica uma resposta secreta (mínimo 2 caracteres).');
      return;
    }
    setSecuritySaving(true);
    try {
      const res = await vibbaApi.updateRecoveryQuestion({
        recoveryQuestion: secQuestion.trim() || 'Palavra secreta de recuperação',
        recoveryAnswer: secAnswer.trim(),
      });
      onProfileUpdated(res.user);
      setSecAnswer('');
      setSecurityOk('Pergunta de recuperação guardada com sucesso.');
    } catch (err) {
      setSecurityError(
        err instanceof Error
          ? err.message
          : 'Não foi possível guardar a pergunta de recuperação.'
      );
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleToggleProfessionalMode = async (enabled: boolean) => {
    setProBusy(true);
    setProError(null);
    setStatusMsg(null);
    try {
      const res = await vibbaApi.toggleProfessionalMode({
        enabled,
        category: proCategory,
      });
      onProfileUpdated(res.user);
      if (enabled && tab === 'friends') {
        setTab('followers');
      }
      setStatusMsg(
        enabled
          ? res.convertedFriendsCount && res.convertedFriendsCount > 0
            ? `Modo Profissional ativado! ${res.convertedFriendsCount} amigo(s) passaram automaticamente a ser teus seguidores.`
            : 'Modo Profissional ativado! O teu perfil funciona agora apenas com seguidores.'
          : 'Modo Profissional desativado.'
      );
    } catch (err) {
      setProError(
        err instanceof Error
          ? err.message
          : 'Não foi possível alterar o Modo Profissional.'
      );
    } finally {
      setProBusy(false);
    }
  };

  const handleSaveProCategory = async (category: string) => {
    setProCategory(category);
    if (!currentUser.professionalMode) return;
    setProBusy(true);
    setProError(null);
    try {
      const res = await vibbaApi.updateProfile({ professionalCategory: category });
      onProfileUpdated(res.user);
      setStatusMsg(`Categoria profissional atualizada para "${category}".`);
    } catch (err) {
      setProError(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar a categoria.'
      );
    } finally {
      setProBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 space-y-5">
      {/* Cover + Avatar Card */}
      <div className="rounded-xl bg-[#242526] border border-[#3E4042] overflow-hidden shadow-sm">
        <div className="relative h-44 sm:h-60 bg-gradient-to-r from-[#1877F2] to-[#0A3A82]">
          {currentUser.coverUrl && (
            <img
              src={currentUser.coverUrl}
              alt="Foto de capa"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          )}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-3 right-3 min-h-[38px] px-3.5 rounded-lg bg-black/65 hover:bg-black text-white text-xs font-semibold inline-flex items-center gap-1.5 backdrop-blur-sm"
          >
            <Camera size={14} /> Editar foto de capa
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
          />
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-14 flex flex-wrap items-end justify-between gap-4">
            <div className="relative">
              <VibbaAvatar
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                sizeClass="w-28 h-28"
                isOnline
                initials={currentUser.name.slice(0, 2).toUpperCase()}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Alterar foto de perfil"
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] text-white flex items-center justify-center shadow-lg border border-[#242526]"
              >
                <Camera size={16} />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {currentUser.isOwner && onOpenOwnerPanel && (
                <button
                  type="button"
                  onClick={onOpenOwnerPanel}
                  className="min-h-[38px] px-4 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <ShieldCheck size={14} /> Painel do Proprietário
                </button>
              )}
              <button
                type="button"
                onClick={() => setTab('professional')}
                className={`min-h-[38px] px-4 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                  currentUser.professionalMode
                    ? 'bg-gradient-to-r from-[#1877F2] to-[#7C3AED] text-white shadow-sm'
                    : currentUser.isAdult
                    ? 'bg-[#263951] hover:bg-[#314A68] text-[#4599FF]'
                    : 'bg-[#3A3B3C] text-[#B0B3B8]'
                }`}
              >
                {currentUser.professionalMode ? (
                  <>
                    <BarChart3 size={14} /> Painel Profissional
                  </>
                ) : currentUser.isAdult ? (
                  <>
                    <Briefcase size={14} /> Ativar Modo Profissional
                  </>
                ) : (
                  <>
                    <Lock size={14} /> Modo Profissional (18+)
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('about');
                  setEditingAbout(true);
                }}
                className="min-h-[38px] px-4 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Edit3 size={14} /> Editar perfil
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[38px] px-4 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <LogOut size={14} /> Terminar sessão
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-[#E4E6EB]">
                {currentUser.name}
              </h1>
              {currentUser.isVerified && (
                <BadgeCheck size={20} className="text-[#1877F2]" />
              )}
              {currentUser.isOwner && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#1877F2]/20 text-[#4599FF] text-[11px] font-bold">
                  Proprietário Oficial
                </span>
              )}
              {currentUser.professionalMode && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#7C3AED]/25 border border-[#7C3AED]/45 text-purple-200 text-[11px] font-bold inline-flex items-center gap-1">
                  <Briefcase size={11} /> Modo Profissional ·{' '}
                  {currentUser.professionalCategory || 'Criador Digital'}
                </span>
              )}
              <ActivityLevelBadge
                level={currentUser.activityLevel?.level || 1}
                title={currentUser.activityLevel?.title || 'Iniciante'}
              />
            </div>
            <p className="text-xs text-[#B0B3B8] tabular-nums flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span>{currentUser.handle.startsWith('@') ? currentUser.handle : `@${currentUser.handle}`}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-white font-semibold">
                <Rss size={12} className="text-[#4599FF]" />
                {currentUser.followersCount || 0} seguidores
              </span>
              {!followersOnly && (
                <>
                  <span>·</span>
                  <span>{myFriends.length} amigos</span>
                </>
              )}
              <span>·</span>
              <span>{myPosts.length} publicações</span>
              <span>·</span>
              <span className="text-[#E4E6EB] font-semibold">
                {formatVibbaPoints(currentUser.vibbaPoints || 0)} Vibba Points
              </span>
            </p>
            {currentUser.bio && (
              <p className="text-sm text-[#E4E6EB] pt-1">{currentUser.bio}</p>
            )}
            <ProfileMedalsHeaderStrip
              currentLevel={currentUser.activityLevel?.level || 1}
              vibbaPoints={currentUser.vibbaPoints || 0}
              isOwner={Boolean(currentUser.isOwner)}
            />
          </div>

          {/* Profile Sub-Tabs */}
          <div className="mt-5 pt-3 border-t border-[#3E4042] flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'posts', label: 'Publicações' },
                { id: 'about', label: 'Sobre' },
                ...(!followersOnly
                  ? [{ id: 'friends' as const, label: `Amigos (${myFriends.length})` }]
                  : []),
                {
                  id: 'followers',
                  label: `Seguidores (${currentUser.followersCount || 0})`,
                },
                { id: 'photos', label: `Fotos (${myPhotos.length})` },
                { id: 'saved', label: `Guardados (${mySaved.length})` },
                {
                  id: 'professional',
                  label: currentUser.professionalMode
                    ? 'Painel Profissional'
                    : 'Modo Profissional (+18)',
                },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`min-h-[38px] px-4 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  tab === t.id
                    ? 'bg-[#263951] text-[#4599FF]'
                    : 'text-[#B0B3B8] hover:bg-[#3A3B3C] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-xl bg-[#31A24C]/20 border border-[#31A24C]/40 px-4 py-2.5 text-xs text-emerald-200">
          {statusMsg}
        </div>
      )}

      {tab === 'posts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 space-y-4">
            <VibbaPointsCard
              activityLevel={currentUser.activityLevel}
              vibbaPoints={currentUser.vibbaPoints}
              breakdown={currentUser.pointsBreakdown}
            />
            <ProfileMedalsShowcase
              currentLevel={currentUser.activityLevel?.level || 1}
              vibbaPoints={currentUser.vibbaPoints || 0}
              isOwner={Boolean(currentUser.isOwner)}
            />
            <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 space-y-3">
              <h2 className="text-sm font-bold text-[#E4E6EB]">Apresentação</h2>
            <div className="space-y-2 text-xs text-[#B0B3B8]">
              {currentUser.work && (
                <div className="flex items-center gap-2">
                  <Briefcase size={14} className="text-[#B0B3B8] shrink-0" />
                  <span>{currentUser.work}</span>
                </div>
              )}
              {currentUser.education && (
                <div className="flex items-center gap-2">
                  <GraduationCap size={14} className="text-[#B0B3B8] shrink-0" />
                  <span>{currentUser.education}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#B0B3B8] shrink-0" />
                <span>Mora em {currentUser.location || 'Angola'}</span>
              </div>
              {currentUser.hometown && (
                <div className="flex items-center gap-2">
                  <Home size={14} className="text-[#B0B3B8] shrink-0" />
                  <span>De {currentUser.hometown}</span>
                </div>
              )}
              {currentUser.relationship && (
                <div className="flex items-center gap-2">
                  <Heart size={14} className="text-[#F3425F] shrink-0" />
                  <span>{currentUser.relationship}</span>
                </div>
              )}
              {currentUser.website && (
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-[#4599FF] shrink-0" />
                  <span className="truncate">{currentUser.website}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setTab('about');
                setEditingAbout(true);
              }}
              className="w-full min-h-[36px] rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-xs font-semibold text-[#E4E6EB]"
            >
              Editar detalhes
            </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <PostComposer currentUser={currentUser} onPostCreated={onPostCreated} />
            {myPosts.length === 0 ? (
              <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
                Ainda não publicaste nada no teu perfil.
              </div>
            ) : (
              myPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onPostUpdated={onPostUpdated}
                  onPostDeleted={onPostDeleted}
                  onPostCreated={onPostCreated}
                  onOpenUserProfile={onOpenUserProfile}
                />
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#E4E6EB]">Sobre ti</h2>
            <button
              type="button"
              onClick={() => setEditingAbout((v) => !v)}
              className="px-3.5 py-1.5 rounded-lg bg-[#3A3B3C] text-xs font-semibold text-[#E4E6EB]"
            >
              {editingAbout ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {editingAbout ? (
            <form onSubmit={handleSaveAbout} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
              />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Cidade actual"
                className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
              />
              <input
                type="text"
                value={work}
                onChange={(e) => setWork(e.target.value)}
                placeholder="Trabalho / Profissão"
                className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
              />
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="Escola / Universidade"
                className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
              />
              <input
                type="text"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                placeholder="Cidade natal"
                className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
              />
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
              >
                <option value="">Estado civil (opcional)</option>
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Em um relacionamento">Em um relacionamento</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Complicado">Complicado</option>
              </select>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Website ou ligação"
                className="sm:col-span-2 h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
              />
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Biografia..."
                className="sm:col-span-2 rounded-lg bg-[#3A3B3C] px-3.5 py-2.5 text-sm text-white"
              />
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[42px] px-6 rounded-lg bg-[#1877F2] text-white text-sm font-bold"
                >
                  {saving ? 'A guardar...' : 'Guardar alterações'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#E4E6EB]">
              <div>
                <span className="text-xs text-[#B0B3B8] block">Trabalho</span>
                {currentUser.work || 'Não definido'}
              </div>
              <div>
                <span className="text-xs text-[#B0B3B8] block">Educação</span>
                {currentUser.education || 'Não definido'}
              </div>
              <div>
                <span className="text-xs text-[#B0B3B8] block">Cidade actual</span>
                {currentUser.location || 'Angola'}
              </div>
              <div>
                <span className="text-xs text-[#B0B3B8] block">Cidade natal</span>
                {currentUser.hometown || 'Não definido'}
              </div>
              <div>
                <span className="text-xs text-[#B0B3B8] block">Relacionamento</span>
                {currentUser.relationship || 'Não definido'}
              </div>
              <div>
                <span className="text-xs text-[#B0B3B8] block">Website</span>
                {currentUser.website || 'Não definido'}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#3E4042] space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound size={17} className="text-[#4599FF]" />
              <h4 className="text-sm font-bold text-white">
                Segurança & Recuperação da Palavra-passe
              </h4>
            </div>

            {securityError && (
              <div className="rounded-lg bg-rose-500/15 border border-rose-500/40 px-3.5 py-2 text-xs text-rose-200">
                {securityError}
              </div>
            )}
            {securityOk && (
              <div className="rounded-lg bg-[#31A24C]/15 border border-[#31A24C]/40 px-3.5 py-2 text-xs text-[#45BD62]">
                {securityOk}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <form
                onSubmit={handleChangePassword}
                className="rounded-xl bg-[#18191A] border border-[#3E4042] p-4 space-y-2.5"
              >
                <div className="text-xs font-bold text-white">
                  Alterar Palavra-passe
                </div>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Palavra-passe actual"
                    className="w-full h-10 rounded-lg bg-[#3A3B3C] pl-3 pr-10 text-xs text-white placeholder:text-[#B0B3B8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    aria-label={
                      showCurrentPassword
                        ? 'Ocultar palavra-passe actual'
                        : 'Ver palavra-passe actual'
                    }
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-[#B0B3B8] hover:text-white flex items-center justify-center"
                  >
                    {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova palavra-passe (mín. 6)"
                    className="w-full h-10 rounded-lg bg-[#3A3B3C] pl-3 pr-10 text-xs text-white placeholder:text-[#B0B3B8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={
                      showNewPassword
                        ? 'Ocultar nova palavra-passe'
                        : 'Ver nova palavra-passe'
                    }
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-[#B0B3B8] hover:text-white flex items-center justify-center"
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirmar nova palavra-passe"
                    className="w-full h-10 rounded-lg bg-[#3A3B3C] pl-3 pr-10 text-xs text-white placeholder:text-[#B0B3B8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                    aria-label={
                      showConfirmNewPassword
                        ? 'Ocultar confirmação'
                        : 'Ver confirmação'
                    }
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-[#B0B3B8] hover:text-white flex items-center justify-center"
                  >
                    {showConfirmNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={securitySaving}
                  className="w-full min-h-[38px] rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold disabled:opacity-60"
                >
                  Atualizar Palavra-passe
                </button>
              </form>

              <form
                onSubmit={handleSaveRecoveryQuestion}
                className="rounded-xl bg-[#18191A] border border-[#3E4042] p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    Pergunta de Recuperação
                  </span>
                  {currentUser.hasRecoveryQuestion && (
                    <span className="px-2 py-0.5 rounded bg-[#31A24C]/20 text-[#45BD62] text-[10px] font-bold">
                      Ativa
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={secQuestion}
                  onChange={(e) => setSecQuestion(e.target.value)}
                  placeholder="Pergunta secreta"
                  className="w-full h-10 rounded-lg bg-[#3A3B3C] px-3 text-xs text-white placeholder:text-[#B0B3B8]"
                />
                <input
                  type="text"
                  required
                  value={secAnswer}
                  onChange={(e) => setSecAnswer(e.target.value)}
                  placeholder="Nova resposta secreta"
                  className="w-full h-10 rounded-lg bg-[#3A3B3C] px-3 text-xs text-white placeholder:text-[#B0B3B8]"
                />
                <button
                  type="submit"
                  disabled={securitySaving}
                  className="w-full min-h-[38px] rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-white text-xs font-bold disabled:opacity-60"
                >
                  Guardar Pergunta Secreta
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {tab === 'friends' && !followersOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {myFriends.length === 0 ? (
            <div className="sm:col-span-2 rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
              Ainda não tens amigos adicionados.
            </div>
          ) : (
            myFriends.map((f) => (
              <div
                key={f.id}
                className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 flex items-center justify-between gap-3"
              >
                <div
                  onClick={() => onOpenUserProfile(f.id)}
                  className="flex items-center gap-3 min-w-0 cursor-pointer"
                >
                  <VibbaAvatar
                    src={f.avatarUrl}
                    alt={f.name}
                    isOnline={f.isOnline}
                    initials={f.name.slice(0, 2).toUpperCase()}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#E4E6EB] truncate">
                      {f.name}
                    </div>
                    <div className="text-xs text-[#B0B3B8] truncate">@{f.handle}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChat(f)}
                  className="min-h-[36px] px-3 rounded-lg bg-[#1877F2] text-white text-xs font-bold inline-flex items-center gap-1 shrink-0"
                >
                  <MessageCircle size={13} /> Chat
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'followers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {myFollowers.length === 0 ? (
            <div className="sm:col-span-2 rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
              {currentUser.isOwner
                ? 'Ainda não tens seguidores. Os utilizadores que escolherem seguir a tua conta aparecerão aqui!'
                : 'Ainda não tens seguidores.'}
            </div>
          ) : (
            myFollowers.map((f) => (
              <div
                key={f.id}
                className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 flex items-center justify-between gap-3"
              >
                <div
                  onClick={() => onOpenUserProfile(f.id)}
                  className="flex items-center gap-3 min-w-0 cursor-pointer"
                >
                  <VibbaAvatar
                    src={f.avatarUrl}
                    alt={f.name}
                    isOnline={f.isOnline}
                    initials={f.name.slice(0, 2).toUpperCase()}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#E4E6EB] truncate">
                      {f.name}
                    </div>
                    <div className="text-xs text-[#B0B3B8] truncate">
                      @{f.handle} · Nív. {f.activityLevel?.level || 1}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChat(f)}
                  className="min-h-[36px] px-3 rounded-lg bg-[#1877F2] text-white text-xs font-bold inline-flex items-center gap-1 shrink-0"
                >
                  <MessageCircle size={13} /> Chat
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'photos' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {myPhotos.length === 0 ? (
            <div className="col-span-full rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
              Ainda não publicaste fotografias.
            </div>
          ) : (
            myPhotos.map((p) => (
              <img
                key={p.id}
                src={p.imageUrl}
                alt="Foto"
                referrerPolicy="no-referrer"
                className="w-full h-44 object-cover rounded-xl border border-[#3E4042]"
              />
            ))
          )}
        </div>
      )}

      {tab === 'saved' && (
        <div className="space-y-4">
          {mySaved.length === 0 ? (
            <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
              Sem publicações guardadas.
            </div>
          ) : (
            mySaved.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onPostUpdated={onPostUpdated}
                onPostDeleted={onPostDeleted}
                onOpenUserProfile={onOpenUserProfile}
              />
            ))
          )}
        </div>
      )}

      {tab === 'professional' && (
        <div className="space-y-4">
          {!currentUser.isAdult ? (
            <div className="rounded-2xl bg-[#242526] border border-amber-500/35 p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                  <Lock size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Modo Profissional restrito a maiores de 18 anos
                  </h2>
                  <p className="text-xs text-[#B0B3B8]">
                    {typeof currentUser.age === 'number'
                      ? `Idade registada: ${currentUser.age} anos.`
                      : 'Data de nascimento não verificada.'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-[#E4E6EB] leading-relaxed">
                Tal como no Facebook, o <strong>Modo Profissional do Vibba</strong> permite transformar o teu perfil num perfil de criador com botão Seguir e painel de estatísticas, mas só pode ser ativado por utilizadores com <strong>18 anos ou mais</strong>.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-gradient-to-br from-[#242526] via-[#242526] to-[#231F3A] border border-[#3E4042] p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4599FF]">
                      <Sparkles size={14} /> Modo Profissional do Vibba (+18)
                    </div>
                    <h2 className="text-lg font-display font-bold text-white">
                      {currentUser.professionalMode
                        ? 'O teu Modo Profissional está ativo'
                        : 'Ativa o Modo Profissional no teu perfil'}
                    </h2>
                    <p className="text-xs text-[#B0B3B8] max-w-xl leading-relaxed">
                      Ao ativar o Modo Profissional, o teu perfil passa a funcionar apenas com seguidores (tal como no Facebook): todos os teus amigos atuais passam automaticamente a ser teus seguidores e desbloqueias estatísticas de criador.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={proBusy}
                    onClick={() =>
                      void handleToggleProfessionalMode(
                        !currentUser.professionalMode
                      )
                    }
                    className={`min-h-[42px] px-5 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-60 ${
                      currentUser.professionalMode
                        ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                        : 'bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-lg'
                    }`}
                  >
                    <Briefcase size={15} />
                    {proBusy
                      ? 'A atualizar...'
                      : currentUser.professionalMode
                      ? 'Desativar Modo Profissional'
                      : 'Ativar Modo Profissional'}
                  </button>
                </div>

                {proError && (
                  <div className="rounded-lg bg-rose-500/15 border border-rose-500/40 px-3.5 py-2 text-xs text-rose-200">
                    {proError}
                  </div>
                )}

                <div className="pt-2 border-t border-[#3E4042] space-y-2">
                  <label className="block text-xs font-semibold text-[#E4E6EB]">
                    Categoria do Perfil Profissional
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PROFESSIONAL_CATEGORIES.map((cat) => {
                      const active = proCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          disabled={proBusy}
                          onClick={() => void handleSaveProCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            active
                              ? 'bg-[#7C3AED] text-white'
                              : 'bg-[#3A3B3C] text-[#B0B3B8] hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {currentUser.professionalMode && (
                <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={18} className="text-[#45BD62]" />
                      <h3 className="text-base font-bold text-white">
                        Painel Profissional · Desempenho Real
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-[#B0B3B8]">
                      Categoria: {currentUser.professionalCategory || proCategory}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5">
                      <div className="flex items-center justify-between text-xs text-[#B0B3B8]">
                        <span>Seguidores</span>
                        <Users size={14} className="text-[#4599FF]" />
                      </div>
                      <div className="text-2xl font-display font-bold text-white mt-1 tabular-nums">
                        {proStats.followersCount}
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5">
                      <div className="flex items-center justify-between text-xs text-[#B0B3B8]">
                        <span>Interações</span>
                        <TrendingUp size={14} className="text-[#45BD62]" />
                      </div>
                      <div className="text-2xl font-display font-bold text-white mt-1 tabular-nums">
                        {proStats.interactionsCount}
                      </div>
                      <div className="text-[10px] text-[#B0B3B8]">
                        {proStats.totalReactions} reações · {proStats.totalComments}{' '}
                        comentários
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5">
                      <div className="flex items-center justify-between text-xs text-[#B0B3B8]">
                        <span>Publicações</span>
                        <Film size={14} className="text-[#F3425F]" />
                      </div>
                      <div className="text-2xl font-display font-bold text-white mt-1 tabular-nums">
                        {myPosts.length}
                      </div>
                      <div className="text-[10px] text-[#B0B3B8]">
                        {proStats.videoCount} vídeos · {proStats.photoCount} fotos
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5">
                      <div className="flex items-center justify-between text-xs text-[#B0B3B8]">
                        <span>Nível & Pontos</span>
                        <Award size={14} className="text-[#F7B928]" />
                      </div>
                      <div className="text-2xl font-display font-bold text-white mt-1 tabular-nums">
                        Nív. {currentUser.activityLevel?.level || 1}
                      </div>
                      <div className="text-[10px] text-[#B0B3B8] tabular-nums">
                        {formatVibbaPoints(currentUser.vibbaPoints || 0)} pts
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#B0B3B8]">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-[#45BD62]" />
                        {proStats.photoCount} fotos
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Film size={14} className="text-[#F3425F]" />
                        {proStats.videoCount} vídeos
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Mic size={14} className="text-[#F7B928]" />
                        {proStats.audioCount} áudios
                      </span>
                    </div>
                    <span className="text-[#4599FF] font-semibold">
                      Botão Seguir visível para outros utilizadores
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
