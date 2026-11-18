import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Disc3,
  Music,
  Pause,
  Play,
  Search,
  ShieldCheck,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { MusicTrackInfo } from '../types/vibba';
import { vibbaApi } from '../lib/api';
import {
  GLOBAL_MUSIC_STORE_TRACKS,
  getMusicTrackAudioUrl,
} from '../lib/musicStore';

interface MusicStoreModalProps {
  isOpen: boolean;
  selectedTrackId?: string | null;
  onSelectTrack: (track: MusicTrackInfo) => void;
  onClearTrack?: () => void;
  onClose: () => void;
  contextLabel?: string;
}

export const MusicStoreModal: React.FC<MusicStoreModalProps> = ({
  isOpen,
  selectedTrackId,
  onSelectTrack,
  onClearTrack,
  onClose,
  contextLabel = 'publicação ou história',
}) => {
  const [tracks, setTracks] = useState<MusicTrackInfo[]>(GLOBAL_MUSIC_STORE_TRACKS);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('Todas');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPreviewId(null);
      return;
    }

    let cancelled = false;
    vibbaApi
      .getMusicStore()
      .then((res) => {
        if (!cancelled && Array.isArray(res.tracks) && res.tracks.length > 0) {
          setTracks(res.tracks);
        }
      })
      .catch(() => {
        // Fallback already loaded from GLOBAL_MUSIC_STORE_TRACKS
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    const onOtherAudio = (ev: Event) => {
      const detail = (ev as CustomEvent<string>).detail;
      if (detail && !detail.startsWith('music-store-modal:')) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        setPreviewId(null);
      }
    };
    window.addEventListener('vibba-audio-play', onOtherAudio);
    return () => window.removeEventListener('vibba-audio-play', onOtherAudio);
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const genres = useMemo(() => {
    const set = new Set<string>(tracks.map((t) => t.genre));
    return ['Todas', ...Array.from(set)];
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tracks.filter((t) => {
      if (genreFilter !== 'Todas' && t.genre !== genreFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q) ||
        t.mood.toLowerCase().includes(q)
      );
    });
  }, [tracks, search, genreFilter]);

  if (!isOpen) return null;

  const togglePreview = async (track: MusicTrackInfo) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (previewId === track.id) {
      audio.pause();
      setPreviewId(null);
      return;
    }

    window.dispatchEvent(
      new CustomEvent('vibba-audio-play', { detail: `music-store-modal:${track.id}` })
    );

    const url = getMusicTrackAudioUrl(track.id);
    if (audio.src !== url) {
      audio.src = url;
    }
    audio.currentTime = 0;
    audio.loop = true;
    audio.volume = 0.8;
    try {
      await audio.play();
      setPreviewId(track.id);
    } catch {
      setPreviewId(null);
    }
  };

  const handleChoose = (track: MusicTrackInfo) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPreviewId(null);
    onSelectTrack(track);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#242526] border border-[#3E4042] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <audio ref={audioRef} className="hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#3E4042] flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1877F2] to-[#7C3AED] text-white flex items-center justify-center shrink-0">
                <Music size={17} />
              </span>
              <h2 className="text-base sm:text-lg font-display font-bold text-[#E4E6EB]">
                Store de Músicas Global · Vibba
              </h2>
            </div>
            <p className="text-xs text-[#B0B3B8]">
              Escolhe uma trilha autorizada para a tua {contextLabel}. Sem risco de direitos de autor.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Store de Músicas"
            className="w-9 h-9 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] flex items-center justify-center shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Copyright-free assurance strip + Search + Genre chips */}
        <div className="px-5 py-3 bg-[#18191A] border-b border-[#3E4042] space-y-3">
          <div className="rounded-xl bg-[#31A24C]/15 border border-[#31A24C]/35 px-3 py-2 flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#45BD62]">
              <ShieldCheck size={15} className="shrink-0" />
              100% Licenciadas &amp; Livres de Direitos (CC0)
            </span>
            {selectedTrackId && onClearTrack && (
              <button
                type="button"
                onClick={() => {
                  onClearTrack();
                  onClose();
                }}
                className="inline-flex items-center gap-1 text-rose-300 hover:text-rose-200 font-semibold shrink-0"
              >
                <Trash2 size={13} /> Remover seleção
              </button>
            )}
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0B3B8]"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar beat, kuduro, kizomba, trap, lo-fi..."
              className="w-full h-10 rounded-xl bg-[#242526] border border-[#3E4042] pl-9 pr-3 text-xs sm:text-sm text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {genres.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => setGenreFilter(genre)}
                className={`min-h-[30px] px-3 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  genreFilter === genre
                    ? 'bg-[#1877F2] text-white'
                    : 'bg-[#242526] border border-[#3E4042] text-[#B0B3B8] hover:text-[#E4E6EB]'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Track List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {filteredTracks.length === 0 ? (
            <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-8 text-center text-xs text-[#B0B3B8]">
              Nenhuma música encontrada para &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filteredTracks.map((track) => {
              const isPlaying = previewId === track.id;
              const isSelected = selectedTrackId === track.id;
              return (
                <div
                  key={track.id}
                  className={`rounded-xl border p-3 flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-[#1877F2]/15 border-[#1877F2]'
                      : 'bg-[#18191A] border-[#3E4042] hover:border-[#4E4F50]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => void togglePreview(track)}
                      aria-label={
                        isPlaying ? `Pausar ${track.title}` : `Ouvir ${track.title}`
                      }
                      style={{ backgroundColor: track.accentColor }}
                      className="w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm hover:opacity-90 transition-transform active:scale-95"
                    >
                      {isPlaying ? (
                        <Pause size={18} className="fill-white" />
                      ) : (
                        <Play size={18} className="fill-white ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#E4E6EB] truncate">
                          {track.title}
                        </span>
                        {isPlaying && (
                          <span className="inline-flex items-end gap-[2px] h-3 shrink-0">
                            <span className="w-[3px] h-2 bg-[#4599FF] rounded-full animate-pulse" />
                            <span className="w-[3px] h-3 bg-[#45BD62] rounded-full animate-pulse" />
                            <span className="w-[3px] h-1.5 bg-[#F7B928] rounded-full animate-pulse" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#B0B3B8] truncate">
                        {track.artist} · <strong className="text-[#E4E6EB]">{track.genre}</strong> ·{' '}
                        <span className="font-mono">{track.bpm} BPM</span> · {track.mood}
                      </div>
                      <div className="text-[10px] text-[#45BD62] font-medium inline-flex items-center gap-1">
                        <ShieldCheck size={11} /> {track.license}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleChoose(track)}
                    className={`min-h-[36px] px-3.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#31A24C] text-white'
                        : 'bg-[#1877F2] hover:bg-[#166FE5] text-white'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check size={14} /> Selecionada
                      </>
                    ) : (
                      <span>Usar</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

interface MusicTrackPlayerCardProps {
  track: MusicTrackInfo;
  seed?: string;
  compact?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  volume?: number;
  coPlay?: boolean;
  overlayMode?: boolean;
  onChangeTrack?: () => void;
  onRemoveTrack?: () => void;
}

export const MusicTrackPlayerCard: React.FC<MusicTrackPlayerCardProps> = ({
  track,
  seed = 'post',
  compact = false,
  autoPlay = false,
  loop = true,
  volume = 0.75,
  coPlay = false,
  overlayMode = false,
  onChangeTrack,
  onRemoveTrack,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerId = useMemo(
    () => `music-card:${seed}:${track.id}:${Math.random().toString(36).slice(2, 7)}`,
    [seed, track.id]
  );
  const audioUrl = useMemo(() => getMusicTrackAudioUrl(track.id), [track.id]);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
    audio.loop = loop;
  }, [volume, muted, loop]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaying(false);
    audio.currentTime = 0;
    if (autoPlay) {
      audio.volume = muted ? 0 : volume;
      audio.loop = loop;
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
    return () => {
      audio.pause();
    };
  }, [audioUrl, autoPlay, loop, volume, muted]);

  useEffect(() => {
    if (coPlay) return;
    const onOtherPlay = (ev: Event) => {
      const detail = (ev as CustomEvent<string>).detail;
      if (detail !== playerId && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setPlaying(false);
      }
    };
    window.addEventListener('vibba-audio-play', onOtherPlay);
    return () => window.removeEventListener('vibba-audio-play', onOtherPlay);
  }, [playerId, coPlay]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (!coPlay) {
      window.dispatchEvent(new CustomEvent('vibba-audio-play', { detail: playerId }));
    }
    try {
      audio.volume = muted ? 0 : volume;
      audio.loop = loop;
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <div
      className={`rounded-xl border flex items-center justify-between gap-2.5 ${
        overlayMode
          ? 'bg-black/65 border-white/25 backdrop-blur-md text-white'
          : 'bg-[#18191A] border-[#3E4042]'
      } ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'}`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onEnded={() => setPlaying(false)}
      />

      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={() => void togglePlay()}
          aria-label={playing ? 'Pausar música' : 'Tocar música'}
          style={{ backgroundColor: track.accentColor }}
          className={`${
            compact ? 'w-8 h-8' : 'w-10 h-10'
          } rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm hover:opacity-90`}
        >
          {playing ? (
            <Pause size={compact ? 14 : 16} className="fill-white" />
          ) : (
            <Play size={compact ? 14 : 16} className="fill-white ml-0.5" />
          )}
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Disc3
              size={13}
              className={`${playing ? 'animate-spin' : ''} shrink-0 ${
                overlayMode ? 'text-sky-300' : 'text-[#4599FF]'
              }`}
            />
            <span
              className={`text-xs sm:text-sm font-bold truncate ${
                overlayMode ? 'text-white' : 'text-[#E4E6EB]'
              }`}
            >
              {track.title}
            </span>
          </div>
          <div
            className={`text-[11px] truncate ${
              overlayMode ? 'text-white/80' : 'text-[#B0B3B8]'
            }`}
          >
            {track.artist} · {track.genre} · {track.bpm} BPM ·{' '}
            <span className={overlayMode ? 'text-emerald-300' : 'text-[#45BD62]'}>
              Autorizada
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {overlayMode && (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Ativar som da música' : 'Silenciar música'}
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        )}
        {onChangeTrack && (
          <button
            type="button"
            onClick={onChangeTrack}
            className="px-2.5 py-1 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-[11px] font-semibold text-[#E4E6EB]"
          >
            Trocar
          </button>
        )}
        {onRemoveTrack && (
          <button
            type="button"
            onClick={onRemoveTrack}
            aria-label="Remover música"
            className="w-8 h-8 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 flex items-center justify-center"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
