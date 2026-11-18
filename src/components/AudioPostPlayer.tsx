import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';

interface AudioPostPlayerProps {
  src: string;
  durationSec?: number;
  seed?: string;
  compact?: boolean;
  label?: string;
}

function formatAudioTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export const AudioPostPlayer: React.FC<AudioPostPlayerProps> = ({
  src,
  durationSec,
  seed = 'vibba',
  compact = false,
  label = 'Áudio',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerId = useMemo(
    () => `${seed}-${Math.random().toString(36).slice(2, 8)}`,
    [seed]
  );

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(
    durationSec && durationSec > 0 ? durationSec : 0
  );
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [audioError, setAudioError] = useState(false);

  const bars = useMemo(() => {
    const count = compact ? 22 : 34;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return Array.from({ length: count }, (_, idx) => {
      const val = ((hash + idx * 97 + (idx % 5) * 43) % 72) + 28;
      return val;
    });
  }, [seed, compact]);

  useEffect(() => {
    setAudioError(false);
    setPlaying(false);
    setCurrentTime(0);
    setTotalDuration(durationSec && durationSec > 0 ? durationSec : 0);
  }, [src, durationSec]);

  useEffect(() => {
    const onOtherPlay = (event: Event) => {
      const custom = event as CustomEvent<string>;
      if (custom.detail !== playerId && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setPlaying(false);
      }
    };
    window.addEventListener('vibba-audio-play', onOtherPlay);
    return () => window.removeEventListener('vibba-audio-play', onOtherPlay);
  }, [playerId]);

  const validSrc = src && src.trim().length > 0 ? src.trim() : null;
  if (!validSrc) return null;

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || audioError) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    window.dispatchEvent(new CustomEvent('vibba-audio-play', { detail: playerId }));
    try {
      audio.playbackRate = playbackRate;
      await audio.play();
      setPlaying(true);
    } catch {
      setAudioError(true);
      setPlaying(false);
    }
  };

  const handleCycleSpeed = () => {
    const next: 1 | 1.5 | 2 =
      playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const dur =
      totalDuration ||
      (audio && Number.isFinite(audio.duration) ? audio.duration : 0);
    if (!audio || !dur || dur <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const targetTime = ratio * dur;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const effectiveDuration = totalDuration || 0;
  const progressRatio =
    effectiveDuration > 0 ? Math.min(1, currentTime / effectiveDuration) : 0;

  if (audioError) {
    return (
      <div className="rounded-xl bg-[#18191A] border border-[#3E4042] px-3 py-2 flex items-center gap-2 text-xs text-[#B0B3B8]">
        <VolumeX size={15} className="text-rose-400 shrink-0" />
        <span>Áudio indisponível neste navegador.</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-[#18191A] border border-[#3E4042] ${
        compact ? 'px-3 py-2' : 'px-4 py-3'
      } flex items-center gap-3`}
    >
      <audio
        ref={audioRef}
        src={validSrc}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) {
            setTotalDuration(d);
          }
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
        }}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setAudioError(true);
          setPlaying(false);
        }}
      />

      <button
        type="button"
        onClick={() => void togglePlay()}
        aria-label={playing ? 'Pausar áudio' : 'Reproduzir áudio'}
        className={`${
          compact ? 'w-9 h-9' : 'w-11 h-11'
        } rounded-full bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center shrink-0 transition-transform active:scale-95`}
      >
        {playing ? (
          <Pause size={compact ? 15 : 18} className="fill-white" />
        ) : (
          <Play size={compact ? 15 : 18} className="fill-white ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Progresso do áudio"
          aria-valuemin={0}
          aria-valuemax={Math.round(effectiveDuration)}
          aria-valuenow={Math.round(currentTime)}
          onClick={handleSeekBarClick}
          onKeyDown={(e) => {
            if (!audioRef.current || !effectiveDuration) return;
            if (e.key === 'ArrowRight') {
              audioRef.current.currentTime = Math.min(
                effectiveDuration,
                currentTime + 5
              );
            } else if (e.key === 'ArrowLeft') {
              audioRef.current.currentTime = Math.max(0, currentTime - 5);
            }
          }}
          className={`${compact ? 'h-5' : 'h-7'} flex items-center gap-[3px] cursor-pointer select-none`}
        >
          {bars.map((heightPct, idx) => {
            const barRatio = (idx + 1) / bars.length;
            const active = barRatio <= progressRatio;
            return (
              <span
                key={idx}
                style={{ height: `${heightPct}%` }}
                className={`flex-1 rounded-full transition-colors ${
                  active ? 'bg-[#1877F2]' : 'bg-[#3A3B3C]'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#B0B3B8] font-mono tabular-nums">
          <span className="inline-flex items-center gap-1">
            <Volume2 size={12} className="text-[#4599FF]" />
            <span>
              {formatAudioTime(currentTime)}
              {effectiveDuration > 0
                ? ` / ${formatAudioTime(effectiveDuration)}`
                : ''}
            </span>
          </span>
          <span className="font-sans text-[11px] text-[#B0B3B8]">{label}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCycleSpeed}
        aria-label="Mudar velocidade do áudio"
        className="min-h-[30px] px-2 rounded-lg bg-[#242526] hover:bg-[#3A3B3C] border border-[#3E4042] text-[11px] font-mono font-bold text-[#E4E6EB] shrink-0 transition-colors"
      >
        {playbackRate}x
      </button>
    </div>
  );
};
