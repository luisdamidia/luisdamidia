import { Play, Download } from 'lucide-react';
import { Card } from '@/app/components/ui/card';

interface CDCardProps {
  cd: {
    id: string;
    title: string;
    artist: string;
    coverUrl?: string;
    plays: number;
    downloads: number;
  };
  onClick: () => void;
}

export function CDCard({ cd, onClick }: CDCardProps) {
  return (
    <Card 
      className="relative overflow-hidden cursor-pointer group bg-white border-gray-200 hover:shadow-lg transition-all"
      onClick={onClick}
    >
      <div className="aspect-square relative">
        {cd.coverUrl ? (
          <img 
            src={cd.coverUrl} 
            alt={cd.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Play className="w-16 h-16 text-gray-300" />
          </div>
        )}
        
        {/* Overlay com título e artista */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
          <h3 className="text-white font-bold text-sm line-clamp-1">{cd.title}</h3>
          <p className="text-gray-200 text-xs line-clamp-1">{cd.artist}</p>
        </div>
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-3">
            <Play className="w-6 h-6 text-blue-600 fill-blue-600" />
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="p-3 flex justify-between items-center text-xs text-gray-500 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <Play className="w-3 h-3" />
          {cd.plays || 0}
        </span>
        <span className="flex items-center gap-1">
          <Download className="w-3 h-3" />
          {cd.downloads || 0}
        </span>
      </div>
    </Card>
  );
}
