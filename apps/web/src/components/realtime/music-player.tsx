'use client';

import {
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  VolumeHighIcon,
  VolumeMuteIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const LOFI_PLAYLIST = [
  'https://4q2mmgfazl.ufs.sh/f/Yt25zY7fL2Uk0jUXwf9XiEQHMGfkbcI1rylgNDuhPm7eY2do',
  'https://4q2mmgfazl.ufs.sh/f/Yt25zY7fL2UkgxW0gHUdjX9lGoAe2s4QHibwVYI3pv5OFqzc',
  'https://4q2mmgfazl.ufs.sh/f/Yt25zY7fL2UkSqodovTIA0LTzvdaXGeVWuO8mtqFgPsElcCf',
  'https://4q2mmgfazl.ufs.sh/f/Yt25zY7fL2Ukx1gf8G0qBUOAC6Km9YIX7Ztyw8Wehu4rGHdi',
  'https://4q2mmgfazl.ufs.sh/f/Yt25zY7fL2UkFEf61vRdSEy0V2Im5AUb9c86jpCaZHroluQ7',
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playlist, setPlaylist] = useState(LOFI_PLAYLIST);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaylist(shuffleArray(LOFI_PLAYLIST));
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.075;
    }
  }, []);

  const handleNext = useCallback(() => {
    const newIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(newIndex);
  }, [currentTrackIndex, playlist.length]);

  const handlePrevious = useCallback(() => {
    const newIndex =
      currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(newIndex);
  }, [currentTrackIndex, playlist.length]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) {
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleMuteToggle = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentTrackIndex is intentionally included to trigger on track change
  useEffect(() => {
    const audio = audioRef.current;
    if (isPlaying && audio) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrackIndex, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleEnded = () => {
      handleNext();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [handleNext]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex w-full flex-col gap-2 pt-3">
      <audio preload="none" ref={audioRef} src={playlist[currentTrackIndex]}>
        <track kind="captions" label="No captions" />
      </audio>

      <Separator />

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            onClick={handlePrevious}
            size="icon-sm"
            title="Previous track"
            variant="ghost"
          >
            <HugeiconsIcon icon={PreviousIcon} />
          </Button>

          <Button
            onClick={handlePlayPause}
            size="icon-sm"
            title={isPlaying ? 'Pause' : 'Play'}
            variant="outline"
          >
            <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} />
          </Button>

          <Button
            onClick={handleNext}
            size="icon-sm"
            title="Next track"
            variant="ghost"
          >
            <HugeiconsIcon icon={NextIcon} />
          </Button>
        </div>

        <div className="relative h-1 flex-1 rounded-full bg-muted">
          <div
            className="absolute h-full rounded-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          <div
            className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 size-3 rounded-full border-2 border-primary bg-background shadow-sm transition-all duration-100"
            style={{ left: `${progress}%` }}
          />
        </div>

        <Button
          onClick={handleMuteToggle}
          size="icon-sm"
          title={isMuted ? 'Unmute' : 'Mute'}
          variant="ghost"
        >
          <HugeiconsIcon icon={isMuted ? VolumeMuteIcon : VolumeHighIcon} />
        </Button>
      </div>
    </div>
  );
}
