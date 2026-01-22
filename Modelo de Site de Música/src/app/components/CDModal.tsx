import { X, Play, Download, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { useState } from 'react';

interface Track {
  id: string;
  name: string;
  duration: string;
}

interface CD {
  id: string;
  title: string;
  artist: string;
  year: string;
  genre: string;
  coverUrl?: string;
  tracks: Track[];
  plays: number;
  downloads: number;
}

interface CDModalProps {
  cd: CD | null;
  open: boolean;
  onClose: () => void;
  onDownloadCD: (id: string) => void;
  onPlayTrack: (cdId: string, trackId: string) => void;
  repeatMode?: 'none' | 'one' | 'all';
  onRepeatModeChange?: (mode: 'none' | 'one' | 'all') => void;
  shuffleMode?: boolean;
  onShuffleModeChange?: (enabled: boolean) => void;
}

export function CDModal({ 
  cd, 
  open, 
  onClose, 
  onDownloadCD, 
  onPlayTrack,
  repeatMode = 'none',
  onRepeatModeChange,
  shuffleMode = false,
  onShuffleModeChange
}: CDModalProps) {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  
  if (!cd) return null;
  
  const handlePlayTrack = (trackId: string) => {
    const trackIndex = cd.tracks.findIndex(t => t.id === trackId);
    setCurrentTrackIndex(trackIndex);
    
    if (playingTrack === trackId) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(trackId);
      onPlayTrack(cd.id, trackId);
    }
  };
  
  const handleNext = () => {
    let nextIndex = currentTrackIndex + 1;
    
    if (shuffleMode) {
      nextIndex = Math.floor(Math.random() * cd.tracks.length);
    } else if (nextIndex >= cd.tracks.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return;
      }
    }
    
    const nextTrack = cd.tracks[nextIndex];
    if (nextTrack) {
      handlePlayTrack(nextTrack.id);
    }
  };
  
  const handlePrevious = () => {
    let prevIndex = currentTrackIndex - 1;
    
    if (prevIndex < 0) {
      prevIndex = cd.tracks.length - 1;
    }
    
    const prevTrack = cd.tracks[prevIndex];
    if (prevTrack) {
      handlePlayTrack(prevTrack.id);
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border-gray-200 text-gray-900">
        <DialogTitle className="sr-only">{cd.title}</DialogTitle>
        
        <div className="flex gap-6">
          {/* Capa */}
          <div className="flex-shrink-0">
            {cd.coverUrl ? (
              <img 
                src={cd.coverUrl} 
                alt={cd.title}
                className="w-48 h-48 object-cover rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-48 h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <Play className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold mb-1 text-gray-900">{cd.title}</h2>
            <p className="text-gray-600 mb-2">{cd.artist}</p>
            <div className="flex gap-4 text-sm text-gray-500 mb-4">
              <span>{cd.year}</span>
              <span>•</span>
              <span>{cd.genre}</span>
              <span>•</span>
              <span>{cd.tracks.length} faixas</span>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <Button 
                onClick={() => onDownloadCD(cd.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar CD
              </Button>
              
              {/* Player Controls */}
              <div className="flex gap-1">
                <Button
                  onClick={toggleShuffle}
                  variant="outline"
                  size="sm"
                  className={shuffleMode ? 'text-blue-600 border-blue-600' : ''}
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={handlePrevious}
                  variant="outline"
                  size="sm"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={handleNext}
                  variant="outline"
                  size="sm"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={cycleRepeatMode}
                  variant="outline"
                  size="sm"
                  className={repeatMode !== 'none' ? 'text-blue-600 border-blue-600' : ''}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex gap-2 text-xs text-gray-500 items-center ml-auto">
                <span className="flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  {cd.plays || 0} plays
                </span>
                <span className="flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  {cd.downloads || 0} downloads
                </span>
              </div>
            </div>
            
            {/* Lista de faixas */}
            <div className="max-h-64 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Faixas</h3>
              <div className="space-y-1">
                {cd.tracks.map((track, index) => (
                  <div 
                    key={track.id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer group ${
                      playingTrack === track.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handlePlayTrack(track.id)}
                  >
                    <span className="text-gray-400 text-sm w-6">{index + 1}</span>
                    <button className="flex-shrink-0">
                      {playingTrack === track.id ? (
                        <Pause className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Play className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
                      )}
                    </button>
                    <span className="flex-1 text-sm truncate text-gray-900">{track.name}</span>
                    <span className="text-gray-500 text-sm">{track.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
        >
          <X className="w-5 h-5" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
