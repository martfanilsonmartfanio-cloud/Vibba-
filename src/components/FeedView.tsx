import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Calendar,
  Check,
  Download,
  Film,
  Flag,
  Headphones,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  Music,
  Plus,
  Scale,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Square,
  Trash2,
  Trophy,
  Type,
  UserCheck,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import {
  AppTab,
  CommunityMember,
  MusicTrackInfo,
  UserProfile,
  VibbaPost,
  VibbaStory,
} from '../types/vibba';
import {
  compressImageFile,
  readAudioBlobAsDataUrl,
  vibbaApi,
} from '../lib/api';
import { VibbaAvatar } from './VibbaBrand';
import { VibbaPointsCard } from './ActivityLevelBadge';
import {
  GlowingMedalIcon,
  formatVibbaPoints,
  getActivityMedalTier,
} from './ActivityMedals';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { ThemeToggle } from './ThemeToggle';
import { VibbaTheme } from '../hooks/useTheme';
import { AudioPostPlayer } from './AudioPostPlayer';
import { MusicStoreModal, MusicTrackPlayerCard } from './MusicStoreModal';

interface FeedViewProps {
  currentUser: UserProfile;
  posts: VibbaPost[];
  stories: VibbaStory[];
  users: CommunityMember[];
  onPostCreated: (post: VibbaPost) => void;
  onPostUpdated: (post: VibbaPost) => void;
  onPostDeleted: (postId: string) => void;
  onStoriesRefresh: () => Promise<void>;
  onUsersRefresh: () => Promise<void>;
  onUserProfileUpdated: (user: UserProfile) => void;
  onNavigateTab: (tab: AppTab) => void;
  onOpenUserProfile: (userId: string) => void;
  onOpenChat: (peer: CommunityMember) => void;
  onOpenShareModal: () => void;
  onDownloadApp: () => void;
  isInstalledPwa?: boolean;
  theme: VibbaTheme;
  onToggleTheme: () => void;
  onOpenLegalModal?: (tab: 'rules' | 'legal') => void;
}

const STORY_BG_CLASSES: Record<'royal' | 'gold' | 'plum', string> = {
  royal: 'bg-gradient-to-br from-[#1877F2] via-[#1565D8] to-[#0A3A82]',
  gold: 'bg-gradient-to-br from-amber-500 via-orange-600 to-rose-800',
  plum: 'bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-950',
};

export const FeedView: React.FC<FeedViewProps> = ({
  currentUser,
  posts,
  stories,
  users,
  onPostCreated,
  onPostUpdated,
  onPostDeleted,
  onStoriesRefresh,
  onUsersRefresh,
  onUserProfileUpdated,
  onNavigateTab,
  onOpenUserProfile,
  onOpenChat,
  onOpenShareModal,
  onDownloadApp,
  isInstalledPwa = false,
  theme,
  onToggleTheme,
  onOpenLegalModal,
}) => {
  const [feedFilter, setFeedFilter] = useState<
    'all' | 'friends' | 'videos' | 'audio' | 'photos'
  >('all');

  const [showCreateStory, setShowCreateStory] = useState(false);
  const [storyMode, setStoryMode] = useState<'text' | 'photo' | 'video' | 'audio'>('text');
  const [storyText, setStoryText] = useState('');
  const [storyBg, setStoryBg] = useState<'royal' | 'gold' | 'plum'>('royal');
  const [storyImage, setStoryImage] = useState('');
  const [storyVideo, setStoryVideo] = useState('');
  const [uploadingStoryVideo, setUploadingStoryVideo] = useState(false);
  const [storyAudio, setStoryAudio] = useState('');
  const [storyAudioDuration, setStoryAudioDuration] = useState(0);
  const [storyMusic, setStoryMusic] = useState<MusicTrackInfo | null>(null);
  const [showStoryMusicStore, setShowStoryMusicStore] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [isRecordingStory, setIsRecordingStory] = useState(false);
  const [recordingStorySec, setRecordingStorySec] = useState(0);
  const [savingStory, setSavingStory] = useState(false);
  const [activeStory, setActiveStory] = useState<VibbaStory | null>(null);

  const storyMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const storyAudioChunksRef = useRef<BlobPart[]>([]);
  const storyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (storyTimerRef.current) window.clearInterval(storyTimerRef.current);
      if (
        storyMediaRecorderRef.current &&
        storyMediaRecorderRef.current.state !== 'inactive'
      ) {
        storyMediaRecorderRef.current.stop();
      }
    };
  }, []);

  const otherUsers = useMemo(() => users.filter((u) => !u.isMe), [users]);
  const incomingRequests = useMemo(
    () => otherUsers.filter((u) => u.friendshipStatus === 'incoming_request'),
    [otherUsers]
  );
  const contacts = useMemo(() => {
    const friends = otherUsers.filter((u) => u.friendshipStatus === 'friends');
    const list = friends.length > 0 ? friends : otherUsers;
    return [...list].sort((a, b) => Number(b.isOnline) - Number(a.isOnline));
  }, [otherUsers]);

  const filteredPosts = useMemo(() => {
    if (feedFilter === 'friends') {
      return posts.filter(
        (p) => p.isOwnPost || currentUser.friendIds.includes(p.authorId)
      );
    }
    if (feedFilter === 'videos') {
      return posts.filter((p) => Boolean(p.videoUrl));
    }
    if (feedFilter === 'audio') {
      return posts.filter((p) => Boolean(p.audioUrl));
    }
    if (feedFilter === 'photos') {
      return posts.filter((p) => Boolean(p.imageUrl));
    }
    return posts;
  }, [posts, feedFilter, currentUser.friendIds]);

  const resetStoryComposer = () => {
    if (storyTimerRef.current) {
      window.clearInterval(storyTimerRef.current);
      storyTimerRef.current = null;
    }
    if (
      storyMediaRecorderRef.current &&
      storyMediaRecorderRef.current.state !== 'inactive'
    ) {
      storyMediaRecorderRef.current.stop();
    }
    setIsRecordingStory(false);
    setRecordingStorySec(0);
    setStoryMode('text');
    setStoryText('');
    setStoryImage('');
    setStoryVideo('');
    setStoryAudio('');
    setStoryAudioDuration(0);
    setStoryMusic(null);
    setStoryError(null);
  };

  const handleStoryImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setStoryError(null);
    try {
      const compressed = await compressImageFile(file, 960);
      setStoryImage(compressed);
      setStoryVideo('');
      setStoryMode('photo');
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : 'Erro ao carregar foto.');
    }
  };

  const handleStoryVideoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setStoryError(null);
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
      setStoryError('Selecciona um vídeo válido (MP4, WebM ou MOV).');
      return;
    }
    if (file.size > 44 * 1024 * 1024) {
      setStoryError('O vídeo da história é demasiado grande (máximo 44 MB).');
      return;
    }
    setUploadingStoryVideo(true);
    try {
      const uploaded = await vibbaApi.uploadMediaFile(file);
      setStoryVideo(uploaded.url);
      setStoryImage('');
      setStoryMode('video');
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : 'Erro ao carregar vídeo.');
    } finally {
      setUploadingStoryVideo(false);
    }
  };

  const startStoryRecording = async () => {
    setStoryError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setStoryError('Microfone indisponível neste navegador.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      storyAudioChunksRef.current = [];
      setRecordingStorySec(0);
      const startedAt = Date.now();

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) storyAudioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (storyTimerRef.current) {
          window.clearInterval(storyTimerRef.current);
          storyTimerRef.current = null;
        }
        setIsRecordingStory(false);
        const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const blob = new Blob(storyAudioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 400) return;
        try {
          const dataUrl = await readAudioBlobAsDataUrl(blob);
          setStoryAudio(dataUrl);
          setStoryAudioDuration(duration);
        } catch (err) {
          setStoryError(err instanceof Error ? err.message : 'Erro ao guardar áudio.');
        }
      };

      storyMediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecordingStory(true);
      storyTimerRef.current = window.setInterval(() => {
        setRecordingStorySec((prev) => {
          if (prev >= 89) {
            recorder.stop();
            return 90;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setStoryError('Permissão do microfone recusada.');
    }
  };

  const stopStoryRecording = () => {
    if (
      storyMediaRecorderRef.current &&
      storyMediaRecorderRef.current.state !== 'inactive'
    ) {
      storyMediaRecorderRef.current.stop();
    }
  };

  const canSubmitStory = Boolean(
    storyText.trim() || storyImage || storyVideo || storyAudio || storyMusic
  );

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitStory || savingStory || isRecordingStory || uploadingStoryVideo) {
      return;
    }
    setSavingStory(true);
    setStoryError(null);
    try {
      await vibbaApi.createStory({
        text: storyText.trim(),
        imageUrl: storyImage || undefined,
        videoUrl: storyVideo || undefined,
        audioUrl: storyAudio || undefined,
        audioDurationSec: storyAudio ? storyAudioDuration : undefined,
        musicTrackId: storyMusic?.id || undefined,
        bgVariant: storyBg,
      });
      resetStoryComposer();
      setShowCreateStory(false);
      await onStoriesRefresh();
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : 'Erro ao criar história.');
    } finally {
      setSavingStory(false);
    }
  };

  const handleOpenStory = async (story: VibbaStory) => {
    setActiveStory(story);
    if (!story.viewedByMe) {
      await vibbaApi.viewStory(story.id).catch(() => {});
      void onStoriesRefresh();
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    await vibbaApi.deleteStory(storyId);
    setActiveStory(null);
    await onStoriesRefresh();
  };

  const handleRespondFriend = async (userId: string, action: 'accept' | 'decline') => {
    const res = await vibbaApi.respondFriendRequest(userId, action);
    onUserProfileUpdated(res.user);
    await onUsersRefresh();
  };

  const shortcuts: Array<{
    tab: AppTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      tab: 'friends',
      label: 'Amigos',
      icon: <Users size={18} className="text-[#4599FF]" />,
    },
    {
      tab: 'messenger',
      label: 'Messenger',
      icon: <MessageCircle size={18} className="text-[#A033FF]" />,
    },
    {
      tab: 'watch',
      label: 'Watch (Vídeos & Áudio)',
      icon: <Headphones size={18} className="text-[#4599FF]" />,
    },
    {
      tab: 'groups',
      label: 'Grupos',
      icon: <UsersRound size={18} className="text-[#1877F2]" />,
    },
    {
      tab: 'marketplace',
      label: 'Marketplace',
      icon: <ShoppingBag size={18} className="text-[#45BD62]" />,
    },
    {
      tab: 'events',
      label: 'Eventos',
      icon: <Calendar size={18} className="text-[#F3425F]" />,
    },
    {
      tab: 'ranking',
      label: 'Top 10 & Ranking (200)',
      icon: <Trophy size={18} className="text-[#F7B928]" />,
    },
    {
      tab: 'pages',
      label: 'Páginas',
      icon: <Flag size={18} className="text-[#F7B928]" />,
    },
    {
      tab: 'saved',
      label: 'Guardados',
      icon: <Bookmark size={18} className="text-[#B86BFF]" />,
    },
  ];

  return (
    <div className="max-w-[1380px] mx-auto px-2 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Sidebar: Facebook Shortcuts */}
      <aside className="hidden lg:block lg:col-span-3 sticky top-18 space-y-1">
        <button
          type="button"
          onClick={() => onNavigateTab('profile')}
          className="w-full px-2.5 py-2 rounded-xl hover:bg-[#3A3B3C] flex items-center gap-3 text-left transition-colors"
        >
          <VibbaAvatar
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            sizeClass="w-9 h-9"
            initials={currentUser.name.slice(0, 2).toUpperCase()}
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#E4E6EB] truncate">
              {currentUser.name}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#B0B3B8] truncate tabular-nums">
              <GlowingMedalIcon
                level={currentUser.activityLevel?.level || 1}
                size="xs"
                unlocked
                animate={false}
              />
              <span className="truncate">
                Nv {currentUser.activityLevel?.level || 1} ·{' '}
                {getActivityMedalTier(currentUser.activityLevel?.level || 1).medalName} ·{' '}
                {formatVibbaPoints(currentUser.vibbaPoints || 0)} pts
              </span>
            </div>
          </div>
        </button>

        <VibbaPointsCard
          compact
          activityLevel={currentUser.activityLevel}
          vibbaPoints={currentUser.vibbaPoints}
        />

        {shortcuts.map((item) => (
          <button
            key={item.tab}
            type="button"
            onClick={() => onNavigateTab(item.tab)}
            className="w-full px-2.5 py-2.5 rounded-xl hover:bg-[#3A3B3C] flex items-center gap-3 text-sm font-medium text-[#E4E6EB] transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-[#242526] flex items-center justify-center shrink-0">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}

        <div className="pt-2 mt-2 border-t border-[#3E4042] space-y-1.5">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="sidebar" />

          {!isInstalledPwa && (
            <button
              type="button"
              onClick={onDownloadApp}
              className="w-full px-2.5 py-2.5 rounded-xl bg-[#31A24C]/20 hover:bg-[#31A24C]/30 flex items-center gap-3 text-sm font-bold text-[#45BD62] transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-[#31A24C] text-white flex items-center justify-center shrink-0">
                <Download size={16} />
              </span>
              <span>Baixar Fora do Chrome</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenShareModal}
            className="w-full px-2.5 py-2.5 rounded-xl bg-[#263951]/60 hover:bg-[#263951] flex items-center gap-3 text-sm font-semibold text-[#4599FF] transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0">
              <Share2 size={16} />
            </span>
            <span>Partilhar Link</span>
          </button>

          {onOpenLegalModal && (
            <button
              type="button"
              onClick={() => onOpenLegalModal('rules')}
              className="w-full px-2.5 py-2 rounded-xl hover:bg-[#3A3B3C] flex items-center gap-3 text-xs font-medium text-[#B0B3B8] hover:text-[#E4E6EB] transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-[#242526] flex items-center justify-center shrink-0">
                <Scale size={15} className="text-amber-400" />
              </span>
              <span>Regras &amp; Aviso Legal</span>
            </button>
          )}
        </div>

        {currentUser.isOwner && (
          <button
            type="button"
            onClick={() => onNavigateTab('owner')}
            className="w-full px-2.5 py-2.5 rounded-xl bg-[#1877F2]/20 hover:bg-[#1877F2]/30 border border-[#1877F2]/40 flex items-center gap-3 text-sm font-bold text-white transition-colors mt-2"
          >
            <span className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </span>
            <span>Painel do Proprietário</span>
          </button>
        )}
      </aside>

      {/* Center Column: Stories + Composer + Feed */}
      <main className="lg:col-span-6 space-y-4 min-w-0">
        {/* Stories Strip */}
        <section
          aria-label="Histórias"
          className="rounded-xl bg-[#242526] border border-[#3E4042] p-3"
        >
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setShowCreateStory(true)}
              className="w-28 h-44 rounded-xl bg-[#18191A] border border-[#3E4042] hover:border-[#1877F2] flex flex-col items-center justify-center gap-2 p-2 shrink-0 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-md">
                <Plus size={20} />
              </div>
              <span className="text-xs font-semibold text-[#E4E6EB] text-center leading-tight">
                Criar história
              </span>
            </button>

            {stories.map((story) => (
              <button
                key={story.id}
                type="button"
                onClick={() => void handleOpenStory(story)}
                className={`relative w-28 h-44 rounded-xl overflow-hidden shrink-0 text-left border-2 transition-transform hover:scale-[1.02] ${
                  story.viewedByMe ? 'border-[#3E4042]' : 'border-[#1877F2]'
                } ${STORY_BG_CLASSES[story.bgVariant]}`}
              >
                {story.imageUrl && (
                  <img
                    src={story.imageUrl}
                    alt={story.authorName}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                )}
                {!story.imageUrl && story.videoUrl && (
                  <video
                    src={story.videoUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/35 p-2.5 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-1">
                    <VibbaAvatar
                      src={story.authorAvatar}
                      alt={story.authorName}
                      sizeClass="w-8 h-8"
                      initials={story.authorName.slice(0, 2).toUpperCase()}
                    />
                    <div className="flex flex-col gap-1 items-end">
                      {story.videoUrl && (
                        <span className="w-5 h-5 rounded-full bg-black/65 text-[#F3425F] flex items-center justify-center">
                          <Film size={11} />
                        </span>
                      )}
                      {story.audioUrl && (
                        <span className="w-5 h-5 rounded-full bg-black/65 text-[#F7B928] flex items-center justify-center">
                          <Mic size={11} />
                        </span>
                      )}
                      {story.musicTrack && (
                        <span className="w-5 h-5 rounded-full bg-black/65 text-[#4599FF] flex items-center justify-center">
                          <Music size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {story.musicTrack && (
                      <div className="text-[10px] font-semibold text-sky-200 truncate mb-0.5 flex items-center gap-1">
                        <Music size={9} className="shrink-0" />
                        <span className="truncate">{story.musicTrack.title}</span>
                      </div>
                    )}
                    {story.text && (
                      <p className="text-[11px] font-medium text-white line-clamp-2 leading-tight mb-1">
                        {story.text}
                      </p>
                    )}
                    <span className="text-[11px] font-bold text-white truncate block">
                      {story.authorName.split(' ')[0]}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Post Composer */}
        <PostComposer currentUser={currentUser} onPostCreated={onPostCreated} />

        {/* Feed Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: 'all', label: 'Feed Principal' },
              { id: 'friends', label: 'Amigos' },
              { id: 'videos', label: 'Vídeos' },
              { id: 'audio', label: 'Áudios' },
              { id: 'photos', label: 'Fotos' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFeedFilter(f.id)}
              className={`min-h-[34px] px-4 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                feedFilter === f.id
                  ? 'bg-[#1877F2] text-white'
                  : 'bg-[#242526] border border-[#3E4042] text-[#B0B3B8] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Feed Posts */}
        {filteredPosts.length === 0 ? (
          <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center space-y-2">
            <Sparkles size={28} className="mx-auto text-[#4599FF]" />
            <h3 className="text-base font-bold text-[#E4E6EB]">
              {feedFilter === 'all'
                ? 'Bem-vindo ao teu Feed do Vibba!'
                : 'Nenhuma publicação nesta categoria'}
            </h3>
            <p className="text-xs text-[#B0B3B8]">
              Publica um vídeo, foto, nota de voz ou sondagem acima para começar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPostUpdated={onPostUpdated}
                onPostDeleted={onPostDeleted}
                onPostCreated={onPostCreated}
                onOpenUserProfile={onOpenUserProfile}
              />
            ))}
          </div>
        )}
      </main>

      {/* Right Sidebar: Friend Requests + Online Contacts */}
      <aside className="hidden lg:block lg:col-span-3 sticky top-18 space-y-4">
        {!currentUser.isOwner && !currentUser.professionalMode && incomingRequests.length > 0 && (
          <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#B0B3B8]">
                Pedidos de amizade
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('friends')}
                className="text-xs text-[#4599FF] hover:underline"
              >
                Ver tudo
              </button>
            </div>
            {incomingRequests.slice(0, 3).map((reqUser) => (
              <div key={reqUser.id} className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <VibbaAvatar
                    src={reqUser.avatarUrl}
                    alt={reqUser.name}
                    sizeClass="w-9 h-9"
                    initials={reqUser.name.slice(0, 2).toUpperCase()}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#E4E6EB] truncate">
                      {reqUser.name}
                    </div>
                    <div className="text-[11px] text-[#B0B3B8] truncate">
                      @{reqUser.handle}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleRespondFriend(reqUser.id, 'accept')}
                    className="flex-1 h-8 rounded-lg bg-[#1877F2] text-white text-xs font-bold inline-flex items-center justify-center gap-1"
                  >
                    <Check size={13} /> Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRespondFriend(reqUser.id, 'decline')}
                    className="flex-1 h-8 rounded-lg bg-[#3A3B3C] text-[#E4E6EB] text-xs font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#B0B3B8]">
              Contactos
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('messenger')}
              className="text-xs text-[#4599FF] hover:underline"
            >
              Messenger
            </button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-xs text-[#B0B3B8]">
              Partilha o link do Vibba com amigos para conversar ao vivo!
            </p>
          ) : (
            <div className="space-y-1">
              {contacts.slice(0, 12).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onOpenChat(member)}
                  className="w-full px-2 py-2 rounded-lg hover:bg-[#3A3B3C] flex items-center gap-2.5 text-left transition-colors"
                >
                  <VibbaAvatar
                    src={member.avatarUrl}
                    alt={member.name}
                    sizeClass="w-8 h-8"
                    isOnline={member.isOnline}
                    initials={member.name.slice(0, 2).toUpperCase()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#E4E6EB] truncate">
                      {member.name}
                    </div>
                    <div className="text-[10px] text-[#B0B3B8] truncate">
                      {member.isOnline ? 'Online agora' : `@${member.handle}`}
                    </div>
                  </div>
                  {member.friendshipStatus === 'friends' && (
                    <UserCheck size={13} className="text-[#31A24C] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Create Story Modal (Texto, Foto, Vídeo, Áudio + Store de Músicas) */}
      {showCreateStory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleCreateStory}
            className="w-full max-w-md rounded-2xl bg-[#242526] border border-[#3E4042] p-5 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#E4E6EB]">
                Criar história (24h)
              </h3>
              <button
                type="button"
                onClick={() => {
                  resetStoryComposer();
                  setShowCreateStory(false);
                }}
                className="w-8 h-8 rounded-full bg-[#3A3B3C] text-[#B0B3B8] hover:text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* 4 Mode Tabs: Texto, Foto, Vídeo, Áudio */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#18191A] border border-[#3E4042]">
              {(
                [
                  { id: 'text', label: 'Texto', icon: <Type size={14} /> },
                  { id: 'photo', label: 'Foto', icon: <ImageIcon size={14} /> },
                  { id: 'video', label: 'Vídeo', icon: <Film size={14} /> },
                  { id: 'audio', label: 'Áudio', icon: <Mic size={14} /> },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setStoryMode(m.id)}
                  className={`min-h-[34px] rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors ${
                    storyMode === m.id
                      ? 'bg-[#1877F2] text-white'
                      : 'text-[#B0B3B8] hover:text-[#E4E6EB]'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Preview Canvas */}
            <div
              className={`rounded-2xl min-h-[210px] p-4 flex flex-col items-center justify-center relative overflow-hidden ${STORY_BG_CLASSES[storyBg]}`}
            >
              {storyImage && (
                <img
                  src={storyImage}
                  alt="Momento"
                  className="absolute inset-0 w-full h-full object-cover opacity-85"
                />
              )}
              {storyVideo && (
                <video
                  src={storyVideo}
                  controls
                  playsInline
                  className="relative z-10 w-full max-h-48 rounded-xl bg-black mb-2"
                />
              )}

              {storyMode === 'audio' && (
                <div className="relative z-10 w-full space-y-2 mb-2">
                  {isRecordingStory ? (
                    <div className="rounded-xl bg-black/65 border border-rose-400/50 px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-white font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <span>A gravar voz...</span>
                        <span className="font-mono tabular-nums">
                          {Math.floor(recordingStorySec / 60)}:
                          {String(recordingStorySec % 60).padStart(2, '0')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={stopStoryRecording}
                        className="px-3 py-1 rounded-lg bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1"
                      >
                        <Square size={11} className="fill-white" /> Parar
                      </button>
                    </div>
                  ) : storyAudio ? (
                    <div className="space-y-1.5">
                      <AudioPostPlayer
                        src={storyAudio}
                        durationSec={storyAudioDuration}
                        seed="story-preview"
                        compact
                        label="História por voz"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setStoryAudio('');
                          setStoryAudioDuration(0);
                        }}
                        className="text-[11px] text-rose-200 hover:underline inline-flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md"
                      >
                        <Trash2 size={11} /> Apagar áudio gravado
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void startStoryRecording()}
                      className="w-full py-3 rounded-xl bg-black/55 hover:bg-black/75 border border-white/25 text-white text-xs font-bold inline-flex items-center justify-center gap-2"
                    >
                      <Mic size={16} className="text-[#F7B928]" />
                      Toca para gravar a tua voz na história
                    </button>
                  )}
                </div>
              )}

              <textarea
                rows={storyVideo ? 2 : 3}
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                placeholder={
                  storyMode === 'audio'
                    ? 'Legenda opcional para o teu áudio...'
                    : storyMode === 'video'
                    ? 'Legenda opcional para o vídeo...'
                    : storyMode === 'photo'
                    ? 'Legenda opcional para a foto...'
                    : 'Escreve a tua história...'
                }
                maxLength={180}
                className="relative z-10 w-full bg-black/25 rounded-xl px-3 py-2 text-center text-base sm:text-lg font-bold text-white placeholder:text-white/75 focus:outline-none resize-none"
              />
            </div>

            {/* Media pickers & Background selector */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {(['royal', 'gold', 'plum'] as const).map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setStoryBg(bg)}
                    aria-label={`Fundo ${bg}`}
                    className={`w-7 h-7 rounded-full border-2 ${STORY_BG_CLASSES[bg]} ${
                      storyBg === bg ? 'border-white scale-110' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {storyMode === 'photo' && (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-xs font-semibold text-[#45BD62] cursor-pointer">
                    <ImageIcon size={14} /> {storyImage ? 'Trocar foto' : 'Escolher foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleStoryImagePick}
                      className="hidden"
                    />
                  </label>
                )}

                {storyMode === 'video' && (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-xs font-semibold text-[#F3425F] cursor-pointer">
                    <Film size={14} />{' '}
                    {uploadingStoryVideo
                      ? 'A carregar...'
                      : storyVideo
                      ? 'Trocar vídeo'
                      : 'Escolher vídeo'}
                    <input
                      type="file"
                      accept="video/*"
                      disabled={uploadingStoryVideo}
                      onChange={handleStoryVideoPick}
                      className="hidden"
                    />
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => setShowStoryMusicStore(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    storyMusic
                      ? 'bg-[#7C3AED]/25 text-purple-200 border border-[#7C3AED]/50'
                      : 'bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#B86BFF]'
                  }`}
                >
                  <Music size={14} />
                  <span>{storyMusic ? 'Trocar música' : 'Store de Músicas'}</span>
                </button>
              </div>
            </div>

            {storyMusic && (
              <MusicTrackPlayerCard
                track={storyMusic}
                seed="story-composer"
                compact
                onChangeTrack={() => setShowStoryMusicStore(true)}
                onRemoveTrack={() => setStoryMusic(null)}
              />
            )}

            {storyError && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3 py-2 text-xs text-rose-200">
                {storyError}
              </div>
            )}

            <button
              type="submit"
              disabled={
                savingStory ||
                !canSubmitStory ||
                isRecordingStory ||
                uploadingStoryVideo
              }
              className="w-full min-h-[42px] rounded-lg bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 text-white text-sm font-bold"
            >
              {savingStory ? 'A publicar...' : 'Partilhar história'}
            </button>
          </form>

          <MusicStoreModal
            isOpen={showStoryMusicStore}
            selectedTrackId={storyMusic?.id}
            onSelectTrack={(track) => setStoryMusic(track)}
            onClearTrack={() => setStoryMusic(null)}
            onClose={() => setShowStoryMusicStore(false)}
            contextLabel="história (24h)"
          />
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`relative w-full max-w-sm min-h-[520px] max-h-[90vh] rounded-3xl overflow-hidden border border-[#3E4042] flex flex-col justify-between p-5 gap-3 ${
              STORY_BG_CLASSES[activeStory.bgVariant]
            }`}
          >
            {activeStory.imageUrl && (
              <img
                src={activeStory.imageUrl}
                alt={activeStory.authorName}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-85"
              />
            )}
            <div className="relative z-10 flex items-center justify-between bg-black/45 rounded-2xl px-3 py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <VibbaAvatar
                  src={activeStory.authorAvatar}
                  alt={activeStory.authorName}
                  sizeClass="w-9 h-9"
                  initials={activeStory.authorName.slice(0, 2).toUpperCase()}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {activeStory.authorName}
                  </div>
                  <div className="text-[10px] text-white/80">
                    {activeStory.createdAtLabel} · {activeStory.viewsCount} visualizações
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activeStory.authorId === currentUser.id && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteStory(activeStory.id)}
                    className="w-8 h-8 rounded-full bg-rose-500/80 text-white flex items-center justify-center"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveStory(null)}
                  className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="relative z-10 my-auto space-y-3">
              {activeStory.videoUrl && (
                <video
                  src={activeStory.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-72 rounded-2xl bg-black shadow-xl"
                />
              )}

              {activeStory.audioUrl && (
                <div className="bg-black/55 rounded-2xl p-2 backdrop-blur-sm">
                  <AudioPostPlayer
                    src={activeStory.audioUrl}
                    durationSec={activeStory.audioDurationSec}
                    seed={`story-view-${activeStory.id}`}
                    label="História por voz"
                  />
                </div>
              )}

              {activeStory.text && (
                <div className="bg-black/45 rounded-2xl p-4 text-center backdrop-blur-sm">
                  <p className="text-xl font-bold text-white whitespace-pre-line break-words">
                    {activeStory.text}
                  </p>
                </div>
              )}
            </div>

            {activeStory.musicTrack && (
              <div className="relative z-10">
                <MusicTrackPlayerCard
                  track={activeStory.musicTrack}
                  seed={`story-${activeStory.id}`}
                  compact
                  autoPlay
                  loop
                  coPlay
                  overlayMode
                  volume={activeStory.audioUrl || activeStory.videoUrl ? 0.35 : 0.75}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
