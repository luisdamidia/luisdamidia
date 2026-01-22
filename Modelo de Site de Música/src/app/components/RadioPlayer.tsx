import { Play, Pause, Volume2, SkipBack, SkipForward, Repeat, Repeat1, Shuffle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Slider } from '@/app/components/ui/slider';
import { Button } from '@/app/components/ui/button';

interface RadioPlayerProps {
  autoplay?: boolean;
  currentTrack?: {
    title: string;
    artist: string;
  };
  onNext?: () => void;
  onPrevious?: () => void;
  repeatMode?: 'none' | 'one' | 'all';
  onRepeatModeChange?: (mode: 'none' | 'one' | 'all') => void;
  shuffleMode?: boolean;
  onShuffleModeChange?: (enabled: boolean) => void;
}

export function RadioPlayer({ 
  autoplay = false, 
  currentTrack,
  onNext,
  onPrevious,
  repeatMode = 'none',
  onRepeatModeChange,
  shuffleMode = false,
  onShuffleModeChange
}: RadioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [volume, setVolume] = useState([70]);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    if (autoplay && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.log('Autoplay prevented:', err);
        setIsPlaying(false);
      });
    }
  }, [autoplay]);
  
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value[0] / 100;
    }
  };
  
  const cycleRepeatMode = () => {
    if (!onRepeatModeChange) return;
    const modes: ('none' | 'one' | 'all')[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    onRepeatModeChange(nextMode);
  };
  
  const toggleShuffle = () => {
    if (onShuffleModeChange) {
      onShuffleModeChange(!shuffleMode);
    }
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        {/* Player Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={toggleShuffle}
            variant="ghost"
            size="sm"
            className={shuffleMode ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
          >
            <Shuffle className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={onPrevious}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <SkipBack className="w-5 h-5" />
          </Button>
          
          <button
            onClick={togglePlay}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 fill-white" />
            )}
          </button>
          
          <Button
            onClick={onNext}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
          
          <Button
            onClick={cycleRepeatMode}
            variant="ghost"
            size="sm"
            className={repeatMode !== 'none' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Track info */}
        <div className="flex-1 min-w-0">
          {currentTrack ? (
            <>
              <div className="text-sm font-semibold text-gray-900 truncate">
                {currentTrack.title}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {currentTrack.artist}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-gray-900">
                Rádio Luís Da Mídia
              </div>
              <div className="text-xs text-gray-500">
                Tocando suas músicas favoritas
              </div>
            </>
          )}
        </div>
        
        {/* Volume control */}
        <div className="hidden md:flex items-center gap-2 w-32">
          <Volume2 className="w-4 h-4 text-gray-600" />
          <Slider
            value={volume}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
        
        {/* Hidden audio element */}
        <audio ref={audioRef} loop>
          {/* Placeholder - in production, connect to real radio stream */}
        </audio>
      </div>
    </div>
  );
}
