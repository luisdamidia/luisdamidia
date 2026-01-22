import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import JSZip from 'jszip';

interface Song {
  title: string;
  file: File;
  duration: number;
  order: number;
}

interface ZipPreviewProps {
  zipFile: File | null;
  onSongsReordered: (songs: Song[]) => void;
}

const ItemType = 'SONG';

interface DraggableSongProps {
  song: Song;
  index: number;
  moveSong: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableSong: React.FC<DraggableSongProps> = ({ song, index, moveSong }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemType,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveSong(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-gray-400">⋮⋮</span>
        <span className="text-sm font-bold text-purple-600 w-8 text-center">{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{song.title}</div>
        <div className="text-xs text-gray-500">
          {(song.file.size / 1024 / 1024).toFixed(2)} MB
        </div>
      </div>
      <div className="text-lg">🎵</div>
    </div>
  );
};

export default function ZipPreview({ zipFile, onSongsReordered }: ZipPreviewProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (zipFile) {
      extractZipContents();
    } else {
      setSongs([]);
      setCoverImage(null);
      setError(null);
    }
  }, [zipFile]);

  useEffect(() => {
    if (songs.length > 0) {
      onSongsReordered(songs);
    }
  }, [songs]);

  const extractZipContents = async () => {
    if (!zipFile) return;

    setLoading(true);
    setError(null);

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(zipFile);

      const musicExtensions = ['.mp3', '.m4a', '.wav', '.flac', '.ogg'];
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

      const extractedSongs: Song[] = [];
      let foundCover: string | null = null;

      // Processar arquivos
      for (const [filename, file] of Object.entries(contents.files)) {
        if (file.dir) continue;

        const lowerFilename = filename.toLowerCase();

        // Buscar músicas
        if (musicExtensions.some(ext => lowerFilename.endsWith(ext))) {
          const blob = await file.async('blob');
          const musicFile = new File([blob], filename, { type: 'audio/mpeg' });

          extractedSongs.push({
            title: filename.replace(/\.[^/.]+$/, ''), // Remove extensão
            file: musicFile,
            duration: 0,
            order: extractedSongs.length,
          });
        }

        // Buscar capa (primeira imagem encontrada)
        if (!foundCover && imageExtensions.some(ext => lowerFilename.endsWith(ext))) {
          const blob = await file.async('blob');
          const imageUrl = URL.createObjectURL(blob);
          foundCover = imageUrl;
        }
      }

      if (extractedSongs.length === 0) {
        setError('❌ Nenhuma música encontrada no arquivo ZIP');
      } else if (extractedSongs.length > 30) {
        setError('⚠️ Máximo de 30 músicas permitidas. Apenas as 30 primeiras serão processadas.');
        setSongs(extractedSongs.slice(0, 30));
      } else {
        setSongs(extractedSongs);
      }

      setCoverImage(foundCover);
    } catch (err) {
      console.error('Erro ao extrair ZIP:', err);
      setError('❌ Erro ao processar arquivo ZIP. Verifique se o arquivo está correto.');
    } finally {
      setLoading(false);
    }
  };

  const moveSong = (dragIndex: number, hoverIndex: number) => {
    const updatedSongs = [...songs];
    const [draggedSong] = updatedSongs.splice(dragIndex, 1);
    updatedSongs.splice(hoverIndex, 0, draggedSong);

    // Atualizar ordem
    const reorderedSongs = updatedSongs.map((song, idx) => ({
      ...song,
      order: idx,
    }));

    setSongs(reorderedSongs);
  };

  if (!zipFile) return null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-purple-200 rounded-lg p-6 mt-4">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          📦 Preview do ZIP
        </h3>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="text-sm text-gray-600 mt-2">Extraindo arquivos do ZIP...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-200 text-red-800 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {!loading && songs.length > 0 && (
          <div className="grid md:grid-cols-4 gap-6">
            {/* Capa */}
            <div className="md:col-span-1">
              <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-lg">
                {coverImage ? (
                  <img src={coverImage} alt="Capa do CD" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎵</div>
                      <div className="text-xs">Sem capa</div>
                    </div>
                  </div>
                )}
              </div>
              {coverImage && (
                <p className="text-xs text-green-600 mt-2 text-center">✅ Capa encontrada</p>
              )}
            </div>

            {/* Lista de músicas */}
            <div className="md:col-span-3">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm">
                    Músicas Encontradas ({songs.length})
                  </h4>
                  <div className="text-xs text-gray-500">
                    💡 Arraste para reordenar
                  </div>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {songs.map((song, index) => (
                    <DraggableSong
                      key={`${song.title}-${index}`}
                      song={song}
                      index={index}
                      moveSong={moveSong}
                    />
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Total: {songs.length} {songs.length === 1 ? 'música' : 'músicas'}
                    </span>
                    <span className="text-gray-600">
                      Tamanho: {(songs.reduce((acc, s) => acc + s.file.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}
