import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart2,
  Film,
  Globe,
  Image as ImageIcon,
  Lock,
  Mic,
  Music,
  Palette,
  Plus,
  Send,
  Smile,
  Square,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  MusicTrackInfo,
  PostBackground,
  PostPrivacy,
  UserProfile,
  VibbaPost,
} from '../types/vibba';
import { FEELING_OPTIONS } from '../data/initialData';
import {
  compressImageFile,
  readAudioBlobAsDataUrl,
  vibbaApi,
} from '../lib/api';
import { VibbaAvatar } from './VibbaBrand';
import { AudioPostPlayer } from './AudioPostPlayer';
import { MusicStoreModal, MusicTrackPlayerCard } from './MusicStoreModal';

interface PostComposerProps {
  currentUser: UserProfile;
  groupId?: string;
  pageId?: string;
  placeholder?: string;
  onPostCreated: (post: VibbaPost) => void;
}

const BG_STYLES: Array<{
  id: PostBackground;
  label: string;
  swatchClass: string;
}> = [
  { id: 'none', label: 'Normal', swatchClass: 'bg-[#3A3B3C] border-[#4E4F50]' },
  {
    id: 'royal',
    label: 'Azul Facebook',
    swatchClass: 'bg-gradient-to-br from-[#1877F2] to-[#0E4DA4] border-sky-400',
  },
  {
    id: 'sunset',
    label: 'Pôr do Sol',
    swatchClass: 'bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 border-amber-300',
  },
  {
    id: 'ocean',
    label: 'Oceano',
    swatchClass: 'bg-gradient-to-br from-sky-500 to-blue-800 border-sky-300',
  },
  {
    id: 'emerald',
    label: 'Esmeralda',
    swatchClass: 'bg-gradient-to-br from-emerald-500 to-teal-800 border-emerald-300',
  },
  {
    id: 'crimson',
    label: 'Carmim',
    swatchClass: 'bg-gradient-to-br from-rose-600 to-fuchsia-900 border-rose-400',
  },
];

export const POST_BG_CARD_CLASS: Record<PostBackground, string> = {
  none: '',
  royal: 'bg-gradient-to-br from-[#1877F2] via-[#1565D8] to-[#0A3A82]',
  sunset: 'bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700',
  ocean: 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-800',
  emerald: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-900',
  crimson: 'bg-gradient-to-br from-rose-600 via-pink-700 to-purple-900',
};

export const PostComposer: React.FC<PostComposerProps> = ({
  currentUser,
  groupId,
  pageId,
  placeholder,
  onPostCreated,
}) => {
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<PostPrivacy>('public');
  const [feeling, setFeeling] = useState('');
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [bgStyle, setBgStyle] = useState<PostBackground>('none');
  const [showBgPicker, setShowBgPicker] = useState(false);

  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioDurationSec, setAudioDurationSec] = useState(0);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrackInfo | null>(null);
  const [showMusicStore, setShowMusicStore] = useState(false);

  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
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

  const firstName = currentUser.name.split(' ')[0] || currentUser.name;
  const hasMediaOrPoll = Boolean(imageUrl || videoUrl || audioUrl || showPollBuilder);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImageFile(file, 1080);
      setImageUrl(compressed);
      setBgStyle('none');
      setShowBgPicker(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar a imagem.');
    }
  };

  const handleVideoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
      setError('Selecciona um ficheiro de vídeo válido (MP4, WebM ou MOV).');
      return;
    }
    if (file.size > 44 * 1024 * 1024) {
      setError('O vídeo é demasiado grande (máximo 44 MB).');
      return;
    }
    setUploadingVideo(true);
    try {
      const uploaded = await vibbaApi.uploadMediaFile(file);
      setVideoUrl(uploaded.url);
      setBgStyle('none');
      setShowBgPicker(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o vídeo.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('O microfone não está disponível neste navegador.');
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
        setIsRecording(false);
        const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 400) return;
        try {
          const dataUrl = await readAudioBlobAsDataUrl(blob);
          setAudioUrl(dataUrl);
          setAudioDurationSec(duration);
          setBgStyle('none');
          setShowBgPicker(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Falha ao guardar áudio.');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingSec((prev) => {
          if (prev >= 179) {
            recorder.stop();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError('Permissão do microfone recusada. Activa o microfone nas definições do navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (publishing || isRecording || uploadingVideo) return;

    const cleanPoll = showPollBuilder
      ? pollOptions.map((o) => o.trim()).filter(Boolean)
      : [];

    if (showPollBuilder && cleanPoll.length < 2) {
      setError('Adiciona pelo menos 2 opções para a sondagem.');
      return;
    }

    if (
      !content.trim() &&
      !imageUrl &&
      !videoUrl &&
      !audioUrl &&
      !selectedMusic &&
      cleanPoll.length < 2
    ) {
      setError('Escreve algo, adiciona foto/vídeo, grava áudio, escolhe música ou cria sondagem.');
      return;
    }

    setPublishing(true);
    setError(null);
    try {
      const res = await vibbaApi.createPost({
        content: content.trim(),
        location: currentUser.location || 'Angola',
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        audioUrl: audioUrl || undefined,
        audioDurationSec: audioDurationSec || undefined,
        musicTrackId: selectedMusic?.id || undefined,
        privacy,
        feeling: feeling || undefined,
        bgStyle: hasMediaOrPoll ? 'none' : bgStyle,
        pollOptions: cleanPoll.length >= 2 ? cleanPoll : undefined,
        groupId,
        pageId,
      });
      setContent('');
      setImageUrl('');
      setVideoUrl('');
      setAudioUrl('');
      setAudioDurationSec(0);
      setSelectedMusic(null);
      setFeeling('');
      setBgStyle('none');
      setShowBgPicker(false);
      setShowFeelingPicker(false);
      setShowPollBuilder(false);
      setPollOptions(['', '']);
      onPostCreated(res.post);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar.');
    } finally {
      setPublishing(false);
    }
  };

  const cyclePrivacy = () => {
    setPrivacy((prev) =>
      prev === 'public' ? 'friends' : prev === 'friends' ? 'only_me' : 'public'
    );
  };

  const privacyLabel =
    privacy === 'public'
      ? 'Público'
      : privacy === 'friends'
      ? 'Amigos'
      : 'Só eu';

  return (
    <form
      onSubmit={handlePublish}
      className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 shadow-sm space-y-3"
    >
      <div className="flex items-start gap-3">
        <VibbaAvatar
          src={currentUser.avatarUrl}
          alt={currentUser.name}
          sizeClass="w-10 h-10"
          initials={currentUser.name.slice(0, 2).toUpperCase()}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-[#E4E6EB] truncate">
              {currentUser.name}
              {feeling && (
                <span className="font-normal text-[#B0B3B8]">
                  {' '}
                  — a sentir-se <strong className="text-[#E4E6EB]">{feeling}</strong>
                </span>
              )}
            </div>

            {!groupId && !pageId && (
              <button
                type="button"
                onClick={cyclePrivacy}
                className="inline-flex items-center gap-1.5 min-h-[28px] px-2.5 rounded-md bg-[#3A3B3C] hover:bg-[#4E4F50] text-xs font-medium text-[#E4E6EB] whitespace-nowrap shrink-0"
              >
                {privacy === 'public' ? (
                  <Globe size={13} className="text-[#4599FF]" />
                ) : privacy === 'friends' ? (
                  <Users size={13} className="text-[#45BD62]" />
                ) : (
                  <Lock size={13} className="text-[#F7B928]" />
                )}
                <span>{privacyLabel}</span>
              </button>
            )}
          </div>

          {!hasMediaOrPoll && bgStyle !== 'none' ? (
            <div
              className={`rounded-xl p-6 min-h-[150px] flex items-center justify-center ${POST_BG_CARD_CLASS[bgStyle]}`}
            >
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder || `No que estás a pensar, ${firstName}?`}
                maxLength={500}
                className="w-full bg-transparent text-center text-xl font-bold text-white placeholder:text-white/75 focus:outline-none resize-none"
              />
            </div>
          ) : (
            <textarea
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder || `No que estás a pensar, ${firstName}?`}
              maxLength={500}
              className="w-full rounded-2xl bg-[#3A3B3C] focus:bg-[#404244] px-4 py-2.5 text-[15px] text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none resize-none"
            />
          )}
        </div>
      </div>

      {showBgPicker && !hasMediaOrPoll && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-[#B0B3B8] mr-1">Fundo:</span>
          {BG_STYLES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setBgStyle(item.id)}
              title={item.label}
              aria-label={item.label}
              className={`w-7 h-7 rounded-lg border-2 transition-transform ${item.swatchClass} ${
                bgStyle === item.id ? 'scale-110 ring-2 ring-[#1877F2]' : 'opacity-80 hover:opacity-100'
              }`}
            />
          ))}
        </div>
      )}

      {showFeelingPicker && (
        <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E4E6EB]">
              Como te sentes?
            </span>
            {feeling && (
              <button
                type="button"
                onClick={() => setFeeling('')}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Limpar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FEELING_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setFeeling(item);
                  setShowFeelingPicker(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  feeling === item
                    ? 'bg-[#1877F2] text-white'
                    : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {showPollBuilder && (
        <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#4599FF]">
              Sondagem (Enquete)
            </span>
            <button
              type="button"
              onClick={() => {
                setShowPollBuilder(false);
                setPollOptions(['', '']);
              }}
              className="text-xs text-[#B0B3B8] hover:text-white inline-flex items-center gap-1"
            >
              <X size={14} /> Remover
            </button>
          </div>
          {pollOptions.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const next = [...pollOptions];
                  next[idx] = e.target.value;
                  setPollOptions(next);
                }}
                placeholder={`Opção ${idx + 1}`}
                maxLength={80}
                className="flex-1 rounded-lg bg-[#242526] border border-[#3E4042] px-3 py-2 text-xs text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
              />
              {pollOptions.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setPollOptions(pollOptions.filter((_, i) => i !== idx))
                  }
                  aria-label="Remover opção"
                  className="p-2 text-rose-400 hover:text-rose-300"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 4 && (
            <button
              type="button"
              onClick={() => setPollOptions([...pollOptions, ''])}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4599FF] hover:underline pt-1"
            >
              <Plus size={14} /> Adicionar opção
            </button>
          )}
        </div>
      )}

      {uploadingVideo && (
        <div className="rounded-xl bg-[#18191A] border border-[#3E4042] px-4 py-3 text-xs text-[#E4E6EB]">
          A carregar vídeo para o servidor... Aguarda um momento.
        </div>
      )}

      {videoUrl && (
        <div className="relative rounded-xl overflow-hidden border border-[#3E4042] bg-black">
          <video
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-96"
          />
          <button
            type="button"
            onClick={() => setVideoUrl('')}
            aria-label="Remover vídeo"
            className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {imageUrl && (
        <div className="relative rounded-xl overflow-hidden border border-[#3E4042] bg-[#18191A]">
          <img
            src={imageUrl}
            alt="Pré-visualização da foto"
            referrerPolicy="no-referrer"
            className="w-full max-h-80 object-cover"
          />
          <button
            type="button"
            onClick={() => setImageUrl('')}
            aria-label="Remover foto"
            className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {isRecording && (
        <div className="space-y-2">
          <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-rose-200 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>A gravar nota de voz...</span>
              <span className="font-mono tabular-nums text-xs text-rose-300">
                {Math.floor(recordingSec / 60)}:
                {String(recordingSec % 60).padStart(2, '0')}
              </span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold"
            >
              <Square size={13} className="fill-white" /> Parar
            </button>
          </div>
          <p className="text-[11px] text-amber-200/90 px-1">
            Grava apenas a tua própria voz, freestyle ou histórias. Não publiques músicas comerciais de terceiros.
          </p>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="space-y-2">
          <AudioPostPlayer src={audioUrl} durationSec={audioDurationSec} seed="preview" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-[#B0B3B8]">
              Lembra-te: só a tua voz ou áudios originais (zero MP3 comercial).
            </span>
            <button
              type="button"
              onClick={() => {
                setAudioUrl('');
                setAudioDurationSec(0);
              }}
              className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
            >
              <Trash2 size={13} /> Remover áudio
            </button>
          </div>
        </div>
      )}

      {selectedMusic && (
        <MusicTrackPlayerCard
          track={selectedMusic}
          seed="composer"
          onChangeTrack={() => setShowMusicStore(true)}
          onRemoveTrack={() => setSelectedMusic(null)}
        />
      )}

      {error && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3.5 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImagePick}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoPick}
        className="hidden"
      />

      <div className="pt-2 border-t border-[#3E4042] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploadingVideo}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-2.5 rounded-lg hover:bg-[#3A3B3C] text-xs font-semibold text-[#F3425F] transition-colors whitespace-nowrap"
          >
            <Film size={17} />
            <span>Vídeo</span>
          </button>

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-2.5 rounded-lg hover:bg-[#3A3B3C] text-xs font-semibold text-[#45BD62] transition-colors whitespace-nowrap"
          >
            <ImageIcon size={17} />
            <span>Foto</span>
          </button>

          <button
            type="button"
            onClick={() => (isRecording ? stopRecording() : void startRecording())}
            className={`inline-flex items-center gap-1.5 min-h-[38px] px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              isRecording
                ? 'bg-rose-500/20 text-rose-300'
                : 'hover:bg-[#3A3B3C] text-[#F7B928]'
            }`}
          >
            <Mic size={17} />
            <span>{isRecording ? 'Parar' : 'Voz'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMusicStore(true)}
            className={`inline-flex items-center gap-1.5 min-h-[38px] px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              selectedMusic
                ? 'bg-[#7C3AED]/20 text-purple-200'
                : 'hover:bg-[#3A3B3C] text-[#B86BFF]'
            }`}
          >
            <Music size={17} />
            <span>Música</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowPollBuilder((v) => !v);
              setBgStyle('none');
              setShowBgPicker(false);
            }}
            className={`inline-flex items-center gap-1.5 min-h-[38px] px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              showPollBuilder
                ? 'bg-[#1877F2]/20 text-[#4599FF]'
                : 'hover:bg-[#3A3B3C] text-[#B0B3B8]'
            }`}
          >
            <BarChart2 size={17} />
            <span>Sondagem</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFeelingPicker((v) => !v)}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-2.5 rounded-lg hover:bg-[#3A3B3C] text-xs font-semibold text-[#F7B928] transition-colors whitespace-nowrap"
          >
            <Smile size={17} />
            <span>Sentimento</span>
          </button>

          {!hasMediaOrPoll && (
            <button
              type="button"
              onClick={() => setShowBgPicker((v) => !v)}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-2.5 rounded-lg hover:bg-[#3A3B3C] text-xs font-semibold text-[#4599FF] transition-colors whitespace-nowrap"
            >
              <Palette size={17} />
              <span>Fundo</span>
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={publishing || isRecording || uploadingVideo}
          className="inline-flex items-center justify-center gap-2 min-h-[40px] px-5 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 text-white font-semibold text-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Send size={15} />
          <span>{publishing ? 'A publicar...' : 'Publicar'}</span>
        </button>
      </div>

      <MusicStoreModal
        isOpen={showMusicStore}
        selectedTrackId={selectedMusic?.id}
        onSelectTrack={(track) => setSelectedMusic(track)}
        onClearTrack={() => setSelectedMusic(null)}
        onClose={() => setShowMusicStore(false)}
        contextLabel="publicação"
      />
    </form>
  );
};
