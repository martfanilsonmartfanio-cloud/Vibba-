import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  Edit3,
  Flag,
  Globe,
  Lock,
  MapPin,
  MessageCircle,
  Mic,
  Repeat2,
  Send,
  Square,
  ThumbsUp,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  PostPrivacy,
  PostReportReason,
  ReactionType,
  VibbaPost,
} from '../types/vibba';
import { readAudioBlobAsDataUrl, vibbaApi } from '../lib/api';
import { VibbaAvatar } from './VibbaBrand';
import { ActivityLevelBadge } from './ActivityLevelBadge';
import { AudioPostPlayer } from './AudioPostPlayer';
import { MusicTrackPlayerCard } from './MusicStoreModal';
import { POST_BG_CARD_CLASS } from './PostComposer';
import { PUBLIC_APP_URL } from './ShareAppModal';

interface PostCardProps {
  post: VibbaPost;
  onPostUpdated: (post: VibbaPost) => void;
  onPostDeleted: (postId: string) => void;
  onPostCreated?: (post: VibbaPost) => void;
  onOpenUserProfile: (userId: string) => void;
}

const REACTIONS: Array<{
  type: ReactionType;
  emoji: string;
  label: string;
  colorClass: string;
}> = [
  { type: 'like', emoji: '👍', label: 'Gosto', colorClass: 'text-[#4599FF]' },
  { type: 'love', emoji: '❤️', label: 'Adoro', colorClass: 'text-[#F3425F]' },
  { type: 'care', emoji: '🤗', label: 'Força', colorClass: 'text-[#F7B928]' },
  { type: 'haha', emoji: '😂', label: 'Haha', colorClass: 'text-[#F7B928]' },
  { type: 'wow', emoji: '😮', label: 'Uau', colorClass: 'text-[#F7B928]' },
  { type: 'sad', emoji: '😢', label: 'Triste', colorClass: 'text-[#F7B928]' },
  { type: 'angry', emoji: '😡', label: 'Grr', colorClass: 'text-orange-400' },
];

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostUpdated,
  onPostDeleted,
  onPostCreated,
  onOpenUserProfile,
}) => {
  const [showReactionTray, setShowReactionTray] = useState(false);
  const [showComments, setShowComments] = useState(
    post.comments.length > 0 && post.comments.length <= 3
  );
  const [commentText, setCommentText] = useState('');
  const [recordingTarget, setRecordingTarget] = useState<'main' | string | null>(null);
  const [recordingSec, setRecordingSec] = useState(0);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const [showShareBox, setShowShareBox] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [copiedPostLink, setCopiedPostLink] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editPrivacy, setEditPrivacy] = useState<PostPrivacy>(post.privacy);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [showReportBox, setShowReportBox] = useState(false);
  const [reportReason, setReportReason] = useState<PostReportReason>('copyright');
  const [reportDetails, setReportDetails] = useState('');
  const [reportingBusy, setReportingBusy] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const myReactionObj = REACTIONS.find((r) => r.type === post.myReaction) || null;
  const activeReactionBadges = REACTIONS.filter(
    (r) => (post.reactionCounts?.[r.type] || 0) > 0
  ).sort(
    (a, b) => (post.reactionCounts?.[b.type] || 0) - (post.reactionCounts?.[a.type] || 0)
  );

  const handleReact = async (reaction: ReactionType) => {
    setShowReactionTray(false);
    try {
      const res = await vibbaApi.reactPost(post.id, reaction);
      onPostUpdated(res.post);
    } catch {
      // Ignore transient error
    }
  };

  const handleVotePoll = async (optionId: string) => {
    try {
      const res = await vibbaApi.votePoll(post.id, optionId);
      onPostUpdated(res.post);
    } catch {
      // Ignore
    }
  };

  const handleSaveToggle = async () => {
    try {
      const res = await vibbaApi.savePost(post.id);
      onPostUpdated(res.post);
    } catch {
      // Ignore
    }
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await vibbaApi.sharePost(post.id, shareNote.trim());
      setShareNote('');
      setShowShareBox(false);
      if (onPostCreated) onPostCreated(res.post);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyPostLink = async () => {
    try {
      await navigator.clipboard.writeText(`${PUBLIC_APP_URL}/?post=${post.id}`);
      setCopiedPostLink(true);
      setTimeout(() => setCopiedPostLink(false), 2500);
    } catch {
      // Ignore
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || busy) return;
    setBusy(true);
    setCommentError(null);
    try {
      const res = await vibbaApi.addComment(post.id, { text: commentText.trim() });
      setCommentText('');
      setShowComments(true);
      onPostUpdated(res.post);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Erro ao comentar.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddReply = async (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    if (!replyText.trim() || busy) return;
    setBusy(true);
    setCommentError(null);
    try {
      const res = await vibbaApi.addComment(post.id, {
        text: replyText.trim(),
        parentCommentId: commentId,
      });
      setReplyText('');
      setReplyingToId(null);
      onPostUpdated(res.post);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Erro ao responder.');
    } finally {
      setBusy(false);
    }
  };

  const toggleVoiceComment = async (target: 'main' | string) => {
    setCommentError(null);
    if (recordingTarget) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setCommentError('Microfone indisponível neste navegador.');
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

      audioChunksRef.current = [];
      setRecordingSec(0);
      const startedAt = Date.now();

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecordingTarget(null);
        const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 400) return;

        setBusy(true);
        try {
          const audioUrl = await readAudioBlobAsDataUrl(blob);
          const res = await vibbaApi.addComment(post.id, {
            text: target === 'main' ? commentText.trim() : replyText.trim(),
            audioUrl,
            audioDurationSec: duration,
            parentCommentId: target === 'main' ? undefined : target,
          });
          if (target === 'main') setCommentText('');
          else {
            setReplyText('');
            setReplyingToId(null);
          }
          setShowComments(true);
          onPostUpdated(res.post);
        } catch (err) {
          setCommentError(
            err instanceof Error ? err.message : 'Erro ao enviar comentário por áudio.'
          );
        } finally {
          setBusy(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecordingTarget(target);
      timerRef.current = window.setInterval(() => {
        setRecordingSec((s) => {
          if (s >= 119) {
            recorder.stop();
            return 120;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setCommentError('Permissão do microfone recusada.');
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    try {
      const res = await vibbaApi.toggleCommentLike(post.id, commentId);
      onPostUpdated(res.post);
    } catch {
      // Ignore
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await vibbaApi.editPost(post.id, {
        content: editContent.trim(),
        privacy: editPrivacy,
      });
      onPostUpdated(res.post);
      setIsEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await vibbaApi.deletePost(post.id);
      onPostDeleted(post.id);
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportingBusy) return;
    setReportingBusy(true);
    setReportFeedback(null);
    try {
      const res = await vibbaApi.reportPost(post.id, {
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setReportDetails('');
      setReportFeedback(
        res.alreadyReported
          ? 'Já tinhas denunciado esta publicação. A moderação vai analisar.'
          : 'Denúncia enviada à moderação. Obrigado por ajudares a manter o Vibba seguro!'
      );
      window.setTimeout(() => {
        setShowReportBox(false);
      }, 2200);
    } catch (err) {
      setReportFeedback(
        err instanceof Error ? err.message : 'Não foi possível enviar a denúncia.'
      );
    } finally {
      setReportingBusy(false);
    }
  };

  const showColoredCard =
    post.bgStyle &&
    post.bgStyle !== 'none' &&
    !post.imageUrl &&
    !post.videoUrl &&
    !post.audioUrl &&
    !post.poll &&
    !post.sharedPost &&
    !isEditing;

  return (
    <article className="rounded-xl bg-[#242526] border border-[#3E4042] shadow-sm overflow-visible">
      {/* Header */}
      <div className="p-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onOpenUserProfile(post.authorId)}
            className="shrink-0 focus:outline-none"
          >
            <VibbaAvatar
              src={post.authorAvatar}
              alt={post.authorName}
              sizeClass="w-10 h-10"
              initials={post.authorName.slice(0, 2).toUpperCase()}
            />
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
              <button
                type="button"
                onClick={() => onOpenUserProfile(post.authorId)}
                className="font-semibold text-[#E4E6EB] hover:underline text-left"
              >
                {post.authorName}
              </button>
              {post.authorLevel && (
                <ActivityLevelBadge
                  level={post.authorLevel.level}
                  title={post.authorLevel.title}
                  compact
                />
              )}
              {post.groupName && (
                <span className="text-[#B0B3B8] font-normal">
                  ▸ <strong className="text-[#E4E6EB] font-medium">{post.groupName}</strong>
                </span>
              )}
              {post.pageName && (
                <span className="text-[#B0B3B8] font-normal">
                  · Página <strong className="text-[#4599FF] font-medium">{post.pageName}</strong>
                </span>
              )}
              {post.feeling && (
                <span className="text-[#B0B3B8] font-normal">
                  está a sentir-se <strong className="text-[#E4E6EB] font-medium">{post.feeling}</strong>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#B0B3B8] mt-0.5">
              <span>{post.createdAtLabel}</span>
              {post.editedAt && <span>· Editado</span>}
              <span>·</span>
              {post.privacy === 'public' ? (
                <span title="Público" className="inline-flex">
                  <Globe size={12} />
                </span>
              ) : post.privacy === 'friends' ? (
                <span title="Amigos" className="inline-flex">
                  <Users size={12} />
                </span>
              ) : (
                <span title="Só eu" className="inline-flex">
                  <Lock size={12} />
                </span>
              )}
              {post.location && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-0.5 truncate max-w-[160px]">
                    <MapPin size={11} /> {post.location}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleSaveToggle}
            title={post.savedByMe ? 'Remover dos guardados' : 'Guardar publicação'}
            aria-label={post.savedByMe ? 'Remover dos guardados' : 'Guardar publicação'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              post.savedByMe
                ? 'bg-[#1877F2]/20 text-[#4599FF]'
                : 'text-[#B0B3B8] hover:bg-[#3A3B3C] hover:text-[#E4E6EB]'
            }`}
          >
            <Bookmark size={16} className={post.savedByMe ? 'fill-[#4599FF]' : ''} />
          </button>

          {!post.isOwnPost && (
            <button
              type="button"
              onClick={() => {
                setReportFeedback(null);
                setShowReportBox((v) => !v);
              }}
              title="Denunciar publicação"
              aria-label="Denunciar publicação"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                showReportBox
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-[#B0B3B8] hover:bg-amber-500/15 hover:text-amber-300'
              }`}
            >
              <Flag size={15} />
            </button>
          )}

          {post.isOwnPost && !confirmDelete && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditContent(post.content);
                  setEditPrivacy(post.privacy);
                  setIsEditing((v) => !v);
                }}
                title="Editar publicação"
                aria-label="Editar publicação"
                className="w-9 h-9 rounded-full text-[#B0B3B8] hover:bg-[#3A3B3C] hover:text-[#E4E6EB] flex items-center justify-center"
              >
                <Edit3 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title="Eliminar publicação"
                aria-label="Eliminar publicação"
                className="w-9 h-9 rounded-full text-[#B0B3B8] hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {showReportBox && !post.isOwnPost && (
        <form
          onSubmit={handleReportSubmit}
          className="mx-4 mb-3 rounded-xl bg-[#18191A] border border-amber-500/40 p-3.5 space-y-2.5 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-amber-200 inline-flex items-center gap-1.5">
              <Flag size={13} /> Denunciar publicação
            </span>
            <button
              type="button"
              onClick={() => setShowReportBox(false)}
              className="text-[#B0B3B8] hover:text-white"
              aria-label="Fechar denúncia"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {(
              [
                { id: 'copyright', label: 'Direitos de autor / MP3 comercial' },
                { id: 'harassment', label: 'Ofensa ou exposição privada' },
                { id: 'scam', label: 'Burla ou dinheiro falso' },
                { id: 'nsfw', label: 'Conteúdo +18 ou violência' },
              ] as Array<{ id: PostReportReason; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setReportReason(opt.id)}
                className={`px-2.5 py-2 rounded-lg border text-left text-[11px] font-medium transition-colors ${
                  reportReason === opt.id
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-[#242526] border-[#3E4042] text-[#E4E6EB] hover:bg-[#3A3B3C]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            maxLength={240}
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            placeholder="Detalhes opcionais (ex: música comercial, ofensa...)"
            className="w-full h-9 rounded-lg bg-[#242526] border border-[#3E4042] px-3 text-xs text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none focus:border-amber-400"
          />
          {reportFeedback && (
            <div className="rounded-lg bg-[#31A24C]/15 border border-[#31A24C]/40 px-3 py-2 text-[11px] text-[#45BD62]">
              {reportFeedback}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReportBox(false)}
              className="px-3 py-1.5 rounded-lg bg-[#3A3B3C] text-[#E4E6EB] font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={reportingBusy}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-50"
            >
              {reportingBusy ? 'A enviar...' : 'Enviar denúncia'}
            </button>
          </div>
        </form>
      )}

      {confirmDelete && (
        <div className="mx-4 mb-3 rounded-xl bg-rose-500/15 border border-rose-500/40 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
          <span className="text-rose-200 font-medium">
            Eliminar esta publicação permanentemente?
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-lg bg-[#3A3B3C] text-[#E4E6EB] font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-semibold"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Content / Edit form */}
      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="px-4 pb-3 space-y-2.5">
          <textarea
            rows={3}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full rounded-xl bg-[#18191A] border border-[#3E4042] px-3.5 py-2.5 text-sm text-[#E4E6EB] focus:outline-none focus:border-[#1877F2] resize-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <select
              value={editPrivacy}
              onChange={(e) => setEditPrivacy(e.target.value as PostPrivacy)}
              className="rounded-lg bg-[#18191A] border border-[#3E4042] px-2.5 py-1.5 text-xs text-[#E4E6EB]"
            >
              <option value="public">Público</option>
              <option value="friends">Amigos</option>
              <option value="only_me">Só eu</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg bg-[#3A3B3C] text-xs text-[#E4E6EB]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-1.5 rounded-lg bg-[#1877F2] text-white text-xs font-semibold"
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      ) : (
        post.content && (
          <div className="px-4 pb-3">
            {showColoredCard ? (
              <div
                className={`rounded-xl px-6 py-10 min-h-[190px] flex items-center justify-center text-center ${
                  POST_BG_CARD_CLASS[post.bgStyle]
                }`}
              >
                <p className="text-xl sm:text-2xl font-bold text-white whitespace-pre-line break-words">
                  {post.content}
                </p>
              </div>
            ) : (
              <p className="text-[15px] leading-relaxed text-[#E4E6EB] whitespace-pre-line break-words">
                {post.content}
              </p>
            )}
          </div>
        )
      )}

      {/* Poll */}
      {post.poll && post.poll.options.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          {post.poll.options.map((opt) => {
            const pct =
              post.poll && post.poll.totalVotes > 0
                ? Math.round((opt.votesCount / post.poll.totalVotes) * 100)
                : 0;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => void handleVotePoll(opt.id)}
                className={`relative w-full text-left rounded-xl overflow-hidden border px-3.5 py-2.5 transition-colors ${
                  opt.votedByMe
                    ? 'border-[#1877F2] bg-[#1877F2]/15'
                    : 'border-[#3E4042] bg-[#18191A] hover:border-[#555759]'
                }`}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-[#1877F2]/20 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-[#E4E6EB] inline-flex items-center gap-2">
                    {opt.votedByMe && <Check size={14} className="text-[#4599FF]" />}
                    {opt.text}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-[#B0B3B8]">
                    {pct}% ({opt.votesCount})
                  </span>
                </div>
              </button>
            );
          })}
          <p className="text-xs text-[#B0B3B8] tabular-nums">
            {post.poll.totalVotes} {post.poll.totalVotes === 1 ? 'voto' : 'votos'}
          </p>
        </div>
      )}

      {/* Shared snapshot */}
      {post.sharedPost && (
        <div className="mx-4 mb-3 rounded-xl border border-[#3E4042] bg-[#18191A] p-3.5 space-y-2">
          <div className="text-xs text-[#B0B3B8]">
            Partilhado de <strong className="text-[#E4E6EB]">{post.sharedPost.authorName}</strong>{' '}
            <span>@{post.sharedPost.authorHandle}</span>
          </div>
          {post.sharedPost.content && (
            <p className="text-sm text-[#E4E6EB] whitespace-pre-line">
              {post.sharedPost.content}
            </p>
          )}
          {post.sharedPost.videoUrl && (
            <video
              src={post.sharedPost.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-72 rounded-lg bg-black"
            />
          )}
          {post.sharedPost.imageUrl && (
            <img
              src={post.sharedPost.imageUrl}
              alt="Publicação partilhada"
              referrerPolicy="no-referrer"
              className="w-full max-h-72 object-cover rounded-lg"
            />
          )}
          {post.sharedPost.audioUrl && (
            <AudioPostPlayer
              src={post.sharedPost.audioUrl}
              durationSec={post.sharedPost.audioDurationSec}
              seed={`${post.id}-shared`}
              compact
            />
          )}
          {post.sharedPost.musicTrack && (
            <MusicTrackPlayerCard
              track={post.sharedPost.musicTrack}
              seed={`${post.id}-shared-music`}
              compact
            />
          )}
        </div>
      )}

      {/* Video */}
      {post.videoUrl && (
        <div className="bg-black border-y border-[#3E4042]">
          <video
            src={post.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[540px]"
          />
        </div>
      )}

      {/* Image */}
      {post.imageUrl && !imageError && (
        <div className="bg-[#18191A] border-y border-[#3E4042]">
          <img
            src={post.imageUrl}
            alt={`Foto de ${post.authorName}`}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full max-h-[540px] object-cover"
          />
        </div>
      )}

      {/* Audio */}
      {post.audioUrl && (
        <div className="px-4 pb-3 pt-1">
          <AudioPostPlayer
            src={post.audioUrl}
            durationSec={post.audioDurationSec}
            seed={post.id}
            label="Publicação em áudio"
          />
        </div>
      )}

      {/* Store de Músicas Soundtrack */}
      {post.musicTrack && (
        <div className="px-4 pb-3 pt-1">
          <MusicTrackPlayerCard track={post.musicTrack} seed={post.id} />
        </div>
      )}

      {/* Reaction + Comment Counters */}
      {(post.likes > 0 || post.commentsCount > 0) && (
        <div className="px-4 py-2.5 flex items-center justify-between text-xs text-[#B0B3B8] border-b border-[#3E4042]">
          <div className="flex items-center gap-1.5">
            {activeReactionBadges.slice(0, 3).map((r) => (
              <span key={r.type} className="text-sm leading-none">
                {r.emoji}
              </span>
            ))}
            {post.likes > 0 && (
              <span className="tabular-nums font-medium text-[#E4E6EB]">
                {post.likes}
              </span>
            )}
          </div>

          {post.commentsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowComments((v) => !v)}
              className="hover:underline tabular-nums"
            >
              {post.commentsCount}{' '}
              {post.commentsCount === 1 ? 'comentário' : 'comentários'}
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="relative px-2 py-1 grid grid-cols-3 gap-1">
        {showReactionTray && (
          <div className="absolute -top-14 left-3 z-30 flex items-center gap-1 rounded-full bg-[#242526] border border-[#3E4042] px-2.5 py-1.5 shadow-2xl">
            {REACTIONS.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => void handleReact(item.type)}
                title={item.label}
                aria-label={item.label}
                className="w-10 h-10 rounded-full hover:bg-[#3A3B3C] hover:scale-125 transition-transform flex items-center justify-center text-xl"
              >
                {item.emoji}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowReactionTray(false)}
              aria-label="Fechar reacções"
              className="w-8 h-8 rounded-full text-[#B0B3B8] hover:text-white flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => void handleReact(post.myReaction || 'like')}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowReactionTray((v) => !v);
            }}
            className={`flex-1 min-h-[40px] px-2 rounded-lg hover:bg-[#3A3B3C] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors ${
              myReactionObj ? myReactionObj.colorClass : 'text-[#B0B3B8]'
            }`}
          >
            {myReactionObj ? (
              <span className="text-base leading-none">{myReactionObj.emoji}</span>
            ) : (
              <ThumbsUp size={16} />
            )}
            <span>{myReactionObj ? myReactionObj.label : 'Gosto'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowReactionTray((v) => !v)}
            title="Mais reacções"
            aria-label="Escolher reacção"
            className="min-h-[40px] px-2 rounded-lg hover:bg-[#3A3B3C] text-xs text-[#B0B3B8]"
          >
            ▾
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="min-h-[40px] px-2 rounded-lg hover:bg-[#3A3B3C] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-[#B0B3B8] transition-colors"
        >
          <MessageCircle size={16} />
          <span>Comentar</span>
        </button>

        <button
          type="button"
          onClick={() => setShowShareBox((v) => !v)}
          className="min-h-[40px] px-2 rounded-lg hover:bg-[#3A3B3C] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-[#B0B3B8] transition-colors"
        >
          <Repeat2 size={16} />
          <span>Partilhar</span>
        </button>
      </div>

      {/* Share box */}
      {showShareBox && (
        <div className="px-4 py-3 border-t border-[#3E4042] bg-[#18191A] space-y-2.5">
          <form onSubmit={handleShareSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={shareNote}
              onChange={(e) => setShareNote(e.target.value)}
              placeholder="Escreve algo sobre esta partilha..."
              className="flex-1 rounded-full bg-[#3A3B3C] px-4 py-2 text-xs text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="min-h-[36px] px-4 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-semibold shrink-0"
            >
              Partilhar no Feed
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopyPostLink()}
              className="min-h-[34px] px-3 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-xs text-[#E4E6EB] font-medium inline-flex items-center gap-1.5"
            >
              {copiedPostLink ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedPostLink ? 'Ligação copiada!' : 'Copiar ligação'}</span>
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Vê esta publicação no Vibba: ${PUBLIC_APP_URL}/?post=${post.id}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[34px] px-3 rounded-lg bg-[#31A24C] hover:bg-[#2B9243] text-xs text-white font-medium inline-flex items-center gap-1.5"
            >
              Enviar no WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Comments Section (Text + Voice Audio Comments!) */}
      {showComments && (
        <div className="px-4 py-3 border-t border-[#3E4042] bg-[#1C1D1E] space-y-3">
          {post.comments.map((comment) => (
            <div key={comment.id} className="space-y-1.5">
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenUserProfile(comment.authorId)}
                  className="shrink-0 mt-0.5"
                >
                  <VibbaAvatar
                    src={comment.authorAvatar || ''}
                    alt={comment.authorName}
                    sizeClass="w-8 h-8"
                    initials={comment.authorName.slice(0, 2).toUpperCase()}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="inline-block max-w-full rounded-2xl bg-[#3A3B3C] px-3.5 py-2 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenUserProfile(comment.authorId)}
                      className="text-xs font-semibold text-[#E4E6EB] hover:underline block text-left"
                    >
                      {comment.authorName}
                    </button>
                    {comment.text && (
                      <p className="text-sm text-[#E4E6EB] break-words">{comment.text}</p>
                    )}
                    {comment.audioUrl && (
                      <div className="min-w-[210px] sm:min-w-[260px]">
                        <AudioPostPlayer
                          src={comment.audioUrl}
                          durationSec={comment.audioDurationSec}
                          seed={comment.id}
                          compact
                          label="Comentário por áudio"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 px-2 pt-1 text-[11px] text-[#B0B3B8]">
                    <span>{comment.createdAtLabel}</span>
                    <button
                      type="button"
                      onClick={() => void handleToggleCommentLike(comment.id)}
                      className={`font-semibold hover:underline ${
                        comment.likedByMe ? 'text-[#4599FF]' : 'text-[#B0B3B8]'
                      }`}
                    >
                      Gosto{comment.likesCount > 0 ? ` (${comment.likesCount})` : ''}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToId(
                          replyingToId === comment.id ? null : comment.id
                        );
                        setReplyText('');
                      }}
                      className="font-semibold text-[#B0B3B8] hover:underline"
                    >
                      Responder
                    </button>
                  </div>

                  {/* Nested Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2 pl-3 border-l border-[#3E4042] space-y-2">
                      {comment.replies.map((rep) => (
                        <div key={rep.id} className="flex items-start gap-2">
                          <VibbaAvatar
                            src={rep.authorAvatar || ''}
                            alt={rep.authorName}
                            sizeClass="w-7 h-7"
                            initials={rep.authorName.slice(0, 2).toUpperCase()}
                          />
                          <div className="rounded-2xl bg-[#3A3B3C] px-3 py-1.5 space-y-1 max-w-full">
                            <button
                              type="button"
                              onClick={() => onOpenUserProfile(rep.authorId)}
                              className="text-xs font-semibold text-[#E4E6EB] hover:underline block text-left"
                            >
                              {rep.authorName}
                            </button>
                            {rep.text && (
                              <p className="text-xs text-[#E4E6EB]">{rep.text}</p>
                            )}
                            {rep.audioUrl && (
                              <div className="min-w-[190px]">
                                <AudioPostPlayer
                                  src={rep.audioUrl}
                                  durationSec={rep.audioDurationSec}
                                  seed={rep.id}
                                  compact
                                  label="Resposta por áudio"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyingToId === comment.id && (
                    <form
                      onSubmit={(e) => void handleAddReply(e, comment.id)}
                      className="mt-2 flex items-center gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => void toggleVoiceComment(comment.id)}
                        title={
                          recordingTarget === comment.id
                            ? 'Parar e enviar áudio'
                            : 'Responder por áudio'
                        }
                        className={`h-8 px-2.5 rounded-full flex items-center gap-1 text-xs font-semibold shrink-0 ${
                          recordingTarget === comment.id
                            ? 'bg-rose-500 text-white'
                            : 'bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#F7B928]'
                        }`}
                      >
                        {recordingTarget === comment.id ? (
                          <>
                            <Square size={11} className="fill-white" />
                            <span className="font-mono tabular-nums">{recordingSec}s</span>
                          </>
                        ) : (
                          <Mic size={14} />
                        )}
                      </button>
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Responder a ${comment.authorName.split(' ')[0]}...`}
                        className="flex-1 rounded-full bg-[#3A3B3C] px-3.5 py-1.5 text-xs text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim() || busy}
                        className="min-h-[32px] px-3 rounded-full bg-[#1877F2] text-white text-xs font-semibold disabled:opacity-40"
                      >
                        Enviar
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}

          {commentError && (
            <p className="text-xs text-rose-400">{commentError}</p>
          )}

          {/* Main comment bar with Voice Comment recording button */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void toggleVoiceComment('main')}
              title={
                recordingTarget === 'main'
                  ? 'Parar e enviar comentário por áudio'
                  : 'Comentar por áudio'
              }
              aria-label="Comentar por áudio"
              className={`h-10 px-3 rounded-full flex items-center justify-center gap-1.5 shrink-0 text-xs font-semibold transition-colors ${
                recordingTarget === 'main'
                  ? 'bg-rose-500 text-white'
                  : 'bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#F7B928]'
              }`}
            >
              {recordingTarget === 'main' ? (
                <>
                  <Square size={12} className="fill-white" />
                  <span className="font-mono tabular-nums">{recordingSec}s</span>
                </>
              ) : (
                <Mic size={16} />
              )}
            </button>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                recordingTarget === 'main'
                  ? 'A gravar comentário por áudio...'
                  : 'Escreve um comentário ou grava áudio...'
              }
              maxLength={280}
              className="flex-1 rounded-full bg-[#3A3B3C] px-4 py-2.5 text-sm text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || busy || Boolean(recordingTarget)}
              aria-label="Enviar comentário"
              className="w-10 h-10 rounded-full bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-40 text-white flex items-center justify-center shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </article>
  );
};
