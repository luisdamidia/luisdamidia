import React, { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import ZipPreview from '@/app/components/ZipPreview';
import { getValidToken, refreshAccessToken } from '@/utils/auth';

const SUPABASE_URL = `https://${projectId}.supabase.co`;

interface AdminPanelProps {
  onClose: () => void;
  onContentUpdated: () => void;
}

export default function AdminPanel({ onClose, onContentUpdated }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'cds' | 'photos' | 'videos' | 'texts' | 'ads' | 'settings'>('cds');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: '' });

  // Estados para CD
  const [cdTitle, setCdTitle] = useState('');
  const [cdArtist, setCdArtist] = useState('');
  const [cdGenre, setCdGenre] = useState('sertanejo');
  const [cdCoverUrl, setCdCoverUrl] = useState('');
  const [cdZipFile, setCdZipFile] = useState<File | null>(null);

  // Estados para Foto
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoTitle, setPhotoTitle] = useState('');

  // Estados para Vídeo
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');

  // Estados para Configurações do Site
  const [siteName, setSiteName] = useState('Luís Da Mídia');
  const [siteSlogan, setSiteSlogan] = useState('Sua música, seu estilo');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerTitle, setBannerTitle] = useState('Bem-vindo ao Luís Da Mídia');
  const [bannerSubtitle, setBannerSubtitle] = useState('Descubra e baixe os melhores álbuns musicais');
  const [bannerImageUrl, setBannerImageUrl] = useState('');

  // Carregar configurações ao abrir
  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/settings`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      if (!response.ok) {
        console.warn('Falha ao carregar configurações, usando padrões');
        return;
      }
      
      const data = await response.json();
      if (data.settings) {
        setSiteName(data.settings.siteName);
        setSiteSlogan(data.settings.siteSlogan);
        setLogoUrl(data.settings.logoUrl || '');
        setBannerTitle(data.settings.bannerTitle);
        setBannerSubtitle(data.settings.bannerSubtitle);
        setBannerImageUrl(data.settings.bannerImageUrl || '');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      // Usar valores padrão em caso de erro
    }
  };

  const showAlert = (message: string, type: 'error' | 'success' | 'warning') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: '', type: '' }), 5000);
  };

  const handleUploadCD = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getValidToken();
      if (!token) {
        showAlert('❌ Você precisa estar logado! Faça login novamente.', 'error');
        setLoading(false);
        return;
      }

      // Se tem arquivo ZIP, usar rota de upload de ZIP
      if (cdZipFile) {
        console.log('📦 Enviando ZIP:', cdZipFile.name);

        const formData = new FormData();
        formData.append('zipFile', cdZipFile);
        formData.append('title', cdTitle);
        formData.append('artist', cdArtist);
        formData.append('genre', cdGenre);

        const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/upload-cd-zip`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        console.log('Response status:', response.status);
        
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          showAlert('❌ Sessão expirada! Por favor, faça login novamente.', 'error');
          setLoading(false);
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          showAlert(`❌ Erro: ${errorData.error || 'Falha ao processar ZIP'}`, 'error');
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (data.success || data.cd) {
          showAlert(`✅ CD adicionado com sucesso! ${data.cd?.songs?.length || 0} músicas processadas.`, 'success');
          setCdTitle('');
          setCdArtist('');
          setCdGenre('sertanejo');
          setCdCoverUrl('');
          setCdZipFile(null);
          // Reset file input
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          onContentUpdated();
        } else {
          showAlert(`❌ Erro: ${data.error || 'Erro desconhecido'}`, 'error');
        }
      } else {
        // Upload manual sem ZIP
        console.log('Enviando CD manual:', {
          title: cdTitle,
          artist: cdArtist,
          genre: cdGenre,
          coverUrl: cdCoverUrl
        });

        const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/upload-cd`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: cdTitle,
            artist: cdArtist,
            genre: cdGenre,
            coverUrl: cdCoverUrl,
            songs: []
          })
        });

        console.log('Response status:', response.status);
        
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          showAlert('❌ Sessão expirada! Por favor, faça login novamente.', 'error');
          setLoading(false);
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          showAlert(`❌ Erro ${response.status}: Falha ao adicionar CD`, 'error');
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (data.success || data.cd) {
          showAlert('✅ CD adicionado com sucesso!', 'success');
          setCdTitle('');
          setCdArtist('');
          setCdGenre('sertanejo');
          setCdCoverUrl('');
          onContentUpdated();
        } else {
          showAlert(`❌ Erro: ${data.error || 'Erro desconhecido'}`, 'error');
        }
      }
    } catch (error: any) {
      console.error('Erro ao adicionar CD:', error);
      showAlert(`❌ Erro: ${error.message || 'Erro de conexão'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getValidToken();
      if (!token) {
        showAlert('❌ Você precisa estar logado!', 'error');
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/upload-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: photoUrl,
          title: photoTitle
        })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('✅ Foto adicionada com sucesso!', 'success');
        setPhotoUrl('');
        setPhotoTitle('');
        onContentUpdated();
      } else {
        showAlert(`❌ Erro: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Erro ao adicionar foto:', error);
      showAlert('❌ Erro ao adicionar foto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getValidToken();
      if (!token) {
        showAlert('❌ Você precisa estar logado!', 'error');
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/upload-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: videoUrl,
          title: videoTitle
        })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('✅ Vídeo adicionado com sucesso!', 'success');
        setVideoUrl('');
        setVideoTitle('');
        onContentUpdated();
      } else {
        showAlert(`❌ Erro: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Erro ao adicionar vídeo:', error);
      showAlert('❌ Erro ao adicionar vídeo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getValidToken();
      if (!token) {
        showAlert('❌ Você precisa estar logado!', 'error');
        setLoading(false);
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/save-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          siteName,
          siteSlogan,
          logoUrl,
          bannerTitle,
          bannerSubtitle,
          bannerImageUrl
        })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('✅ Configurações salvas com sucesso!', 'success');
        onContentUpdated();
        // Recarregar página após 1 segundo para mostrar as mudanças
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        showAlert(`❌ Erro: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      showAlert('❌ Erro ao salvar configurações', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[3000]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                ⚙️ Painel Administrativo
              </h2>
              <p className="text-sm opacity-90 mt-1">Gerencie todo o conteúdo do site</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Alert */}
        {alert.message && (
          <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${
            alert.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            alert.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}>
            {alert.message}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('cds')}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'cds'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📀 Gerenciar CDs
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'photos'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              🖼️ Adicionar Fotos
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'videos'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              🎥 Adicionar Vídeos
            </button>
            <button
              onClick={() => setActiveTab('texts')}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'texts'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📝 Editar Textos
            </button>
            <button
              onClick={() => setActiveTab('ads')}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'ads'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📢 Anúncios
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚙️ Configurações
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Tab: CDs */}
          {activeTab === 'cds' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Adicionar Novo CD</h3>
              <form onSubmit={handleUploadCD} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Título do CD</label>
                    <input
                      type="text"
                      value={cdTitle}
                      onChange={(e) => setCdTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="Ex: Ao Vivo em São Paulo"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Artista</label>
                    <input
                      type="text"
                      value={cdArtist}
                      onChange={(e) => setCdArtist(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="Ex: Gusttavo Lima"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Gênero</label>
                    <select
                      value={cdGenre}
                      onChange={(e) => setCdGenre(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    >
                      <option value="sertanejo">Sertanejo</option>
                      <option value="forro">Forró</option>
                      <option value="arrocha">Arrocha</option>
                      <option value="reggae">Reggae</option>
                      <option value="pagodao">Pagodão</option>
                      <option value="piseiro">Piseiro</option>
                      <option value="brega">Brega</option>
                      <option value="pop">Pop</option>
                      <option value="rock">Rock</option>
                      <option value="mpb">MPB</option>
                      <option value="funk">Funk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">URL da Capa</label>
                    <input
                      type="url"
                      value={cdCoverUrl}
                      onChange={(e) => setCdCoverUrl(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="https://exemplo.com/capa.jpg"
                      required={!cdZipFile}
                    />
                    {cdZipFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        Opcional: Se não fornecer, será usada a capa do ZIP
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>🎉 Upload ZIP Automático Ativado!</strong>
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    Envie um arquivo ZIP com suas músicas (.mp3, .m4a, .wav) e a capa (.jpg, .png). 
                    O sistema irá automaticamente extrair tudo e organizar o CD!
                  </p>
                  <label className="block">
                    <span className="text-sm font-medium text-blue-900">Selecione o arquivo ZIP:</span>
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) => setCdZipFile(e.target.files?.[0] || null)}
                      className="mt-2 block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    />
                  </label>
                  {cdZipFile && (
                    <p className="text-xs text-green-700 mt-2">
                      ✅ Arquivo selecionado: {cdZipFile.name} ({(cdZipFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                {/* Preview do ZIP */}
                <ZipPreview
                  zipFile={cdZipFile}
                  onSongsReordered={(songs) => console.log('Songs reordered:', songs)}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? '⏳ Adicionando...' : '➕ Adicionar CD'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-bold mb-4">📋 Gerenciar CDs Existentes</h3>
                <p className="text-sm text-gray-600">
                  Funcionalidades de edição e exclusão serão implementadas aqui.
                </p>
              </div>
            </div>
          )}

          {/* Tab: Photos */}
          {activeTab === 'photos' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Adicionar Nova Foto</h3>
              <form onSubmit={handleUploadPhoto} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">URL da Foto</label>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="https://exemplo.com/foto.jpg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Título da Foto</label>
                  <input
                    type="text"
                    value={photoTitle}
                    onChange={(e) => setPhotoTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Ex: Show em Goiânia"
                    required
                  />
                </div>

                {photoUrl && (
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Preview:</p>
                    <img src={photoUrl} alt="Preview" className="w-full max-h-64 object-contain rounded" />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? '⏳ Adicionando...' : '➕ Adicionar Foto'}
                </button>
              </form>
            </div>
          )}

          {/* Tab: Videos */}
          {activeTab === 'videos' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Adicionar Novo Vídeo</h3>
              <form onSubmit={handleUploadVideo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">URL do Vídeo (YouTube/Vimeo)</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="https://www.youtube.com/embed/..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use o formato embed do YouTube: https://www.youtube.com/embed/VIDEO_ID
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Título do Vídeo</label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Ex: Clipe Oficial - Minha Música"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? '⏳ Adicionando...' : '➕ Adicionar Vídeo'}
                </button>
              </form>
            </div>
          )}

          {/* Tab: Texts */}
          {activeTab === 'texts' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Editar Textos do Site</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Funcionalidade em desenvolvimento
                </p>
              </div>
              <p className="text-gray-600">
                Aqui você poderá editar os textos do banner, rodapé e outras seções do site.
              </p>
            </div>
          )}

          {/* Tab: Ads */}
          {activeTab === 'ads' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Gerenciar Anúncios</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Funcionalidade em desenvolvimento
                </p>
              </div>
              <p className="text-gray-600">
                Aqui você poderá adicionar e gerenciar banners publicitários no site.
              </p>
            </div>
          )}

          {/* Tab: Settings */}
          {activeTab === 'settings' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Configurações do Site</h3>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome do Site</label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Ex: Luís Da Mídia"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Slogan do Site</label>
                  <input
                    type="text"
                    value={siteSlogan}
                    onChange={(e) => setSiteSlogan(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Ex: Sua música, seu estilo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">URL do Logo</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="https://exemplo.com/logo.png"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Título do Banner</label>
                  <input
                    type="text"
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Ex: Bem-vindo ao Luís Da Mídia"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Subtítulo do Banner</label>
                  <input
                    type="text"
                    value={bannerSubtitle}
                    onChange={(e) => setBannerSubtitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Ex: Descubra e baixe os melhores álbuns musicais"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">URL da Imagem do Banner</label>
                  <input
                    type="url"
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="https://exemplo.com/banner.jpg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? '⏳ Salvando...' : '💾 Salvar Configurações'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}