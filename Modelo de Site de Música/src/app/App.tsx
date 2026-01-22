import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import AdminPanel from '@/app/components/AdminPanel';
import { refreshAccessToken, logout as authLogout } from '@/utils/auth';

const SUPABASE_URL = `https://${projectId}.supabase.co`;

export default function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('luisdamidia@admin.com');
  const [password, setPassword] = useState('Jilmaria@2004');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [cds, setCds] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [settings, setSettings] = useState({
    siteName: 'Luís Da Mídia',
    siteSlogan: 'Sua música, seu estilo',
    logoUrl: '',
    bannerTitle: 'Bem-vindo ao Luís Da Mídia',
    bannerSubtitle: 'Descubra e baixe os melhores álbuns musicais',
    bannerImageUrl: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
      // Verificar e atualizar token periodicamente
      checkAndRefreshToken();
    }
    loadContent();
    loadSettings();
    
    // Criar admin automaticamente na primeira vez
    createAdminIfNeeded();
  }, []);

  const checkAndRefreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refreshToken', data.refresh_token);
        }
        console.log('✅ Token renovado automaticamente');
      } else {
        console.warn('⚠️ Não foi possível renovar o token');
        // Não forçar logout automático, apenas avisar
      }
    } catch (error) {
      console.warn('⚠️ Erro ao renovar token:', error);
    }
  };
  
  const createAdminIfNeeded = async () => {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/init-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
    } catch (error) {
      console.log('Admin init error (pode ser ignorado):', error);
    }
  };

  const loadContent = async () => {
    try {
      // Carregar CDs
      const cdsResponse = await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/cds`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const cdsData = await cdsResponse.json();
      setCds(cdsData.cds || []);

      // Carregar fotos
      const photosResponse = await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/photos`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const photosData = await photosResponse.json();
      setPhotos(photosData.photos || []);

      // Carregar vídeos
      const videosResponse = await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/videos`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const videosData = await videosResponse.json();
      setVideos(videosData.videos || []);
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-80fba11b/settings`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await response.json();
      setSettings(data.settings || settings);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const showAlert = (message: string, type: 'error' | 'success' | 'warning') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: '', type: '' }), 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': publicAnonKey
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
        setIsLoggedIn(true);
        showAlert('✅ Login realizado com sucesso!', 'success');
        setTimeout(() => setShowLogin(false), 1500);
      } else {
        if (data.error_description?.includes('Invalid')) {
          showAlert('❌ Email ou senha incorretos!', 'error');
        } else {
          showAlert(`❌ ${data.error_description || 'Erro ao fazer login'}`, 'error');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlert('❌ Erro de conexão. Verifique sua internet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authLogout();
    setIsLoggedIn(false);
    setShowAdminPanel(false);
    showAlert('👋 Logout realizado!', 'success');
  };

  const filteredCds = cds.filter(cd => {
    const matchesSearch = cd.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cd.artist?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'all' || cd.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const topPlayed = [...cds].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 5);
  const topDownloaded = [...cds].sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0)).slice(0, 5);
  const newReleases = [...cds].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-lg text-white text-2xl">
                🎵
              </div>
              <div>
                <h1 className="text-xl font-bold">{settings.siteName}</h1>
                <p className="text-xs text-gray-600">{settings.siteSlogan}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {isLoggedIn && (
                <button
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 flex items-center gap-2"
                >
                  ⚙️ Painel Admin
                </button>
              )}
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                >
                  Sair
                </button>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                >
                  Login
                </button>
              )}
            </div>
          </div>

          {/* Banner */}
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-6 rounded-lg text-white mb-4">
            <h2 className="text-xl font-bold mb-2">{settings.bannerTitle}</h2>
            <p className="text-sm opacity-90">{settings.bannerSubtitle}</p>
          </div>

          {/* Search */}
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Buscar por CD ou artista..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
            />
            <select 
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 min-w-[200px]"
            >
              <option value="all">Todos os gêneros</option>
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
        </div>
      </header>

      {/* Admin Panel Modal */}
      {showAdminPanel && isLoggedIn && (
        <AdminPanel 
          onClose={() => setShowAdminPanel(false)}
          onContentUpdated={loadContent}
        />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Novos Lançamentos */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✨</span>
              <h2 className="text-lg font-bold">Novos Lançamentos</h2>
            </div>
            {newReleases.length > 0 ? (
              <div className="space-y-3">
                {newReleases.map((cd, idx) => (
                  <div key={cd.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                    <span className="text-gray-400 text-sm">{idx + 1}</span>
                    <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                      {cd.coverUrl && <img src={cd.coverUrl} alt={cd.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{cd.title}</div>
                      <div className="text-xs text-gray-600 truncate">{cd.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nenhum lançamento</p>
            )}
          </div>

          {/* Mais Ouvidos */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📈</span>
              <h2 className="text-lg font-bold">Mais Ouvidos</h2>
            </div>
            {topPlayed.length > 0 ? (
              <div className="space-y-3">
                {topPlayed.map((cd, idx) => (
                  <div key={cd.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                    <span className="text-gray-400 text-sm">{idx + 1}</span>
                    <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                      {cd.coverUrl && <img src={cd.coverUrl} alt={cd.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{cd.title}</div>
                      <div className="text-xs text-gray-600 truncate">{cd.artist}</div>
                    </div>
                    <span className="text-xs text-gray-400">{cd.playCount || 0} plays</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nenhum CD ouvido</p>
            )}
          </div>

          {/* Mais Baixados */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">⬇️</span>
              <h2 className="text-lg font-bold">Mais Baixados</h2>
            </div>
            {topDownloaded.length > 0 ? (
              <div className="space-y-3">
                {topDownloaded.map((cd, idx) => (
                  <div key={cd.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                    <span className="text-gray-400 text-sm">{idx + 1}</span>
                    <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                      {cd.coverUrl && <img src={cd.coverUrl} alt={cd.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{cd.title}</div>
                      <div className="text-xs text-gray-600 truncate">{cd.artist}</div>
                    </div>
                    <span className="text-xs text-gray-400">{cd.downloadCount || 0} downloads</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nenhum download</p>
            )}
          </div>
        </div>

        {/* CDs Grid */}
        <h2 className="text-2xl font-bold mb-4">Todos os CDs</h2>
        {filteredCds.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {filteredCds.map(cd => (
              <div key={cd.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className="aspect-square bg-gray-200 relative">
                  {cd.coverUrl && (
                    <img src={cd.coverUrl} alt={cd.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm truncate">{cd.title}</div>
                  <div className="text-xs text-gray-600 truncate">{cd.artist}</div>
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>▶️ {cd.playCount || 0}</span>
                    <span>⬇️ {cd.downloadCount || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg mb-8">
            <div className="text-5xl mb-4">🎵</div>
            <p className="text-gray-500">Nenhum CD encontrado</p>
            {isLoggedIn && (
              <p className="text-sm text-blue-500 mt-2">Clique em "Painel Admin" para adicionar CDs!</p>
            )}
          </div>
        )}

        {/* Fotos e Vídeos */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Vídeos */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🎥</span> Vídeos
            </h2>
            {videos.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {videos.map(video => (
                  <div key={video.id} className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                    <iframe 
                      src={video.url} 
                      className="w-full h-full"
                      title={video.title}
                      allowFullScreen
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-400">Nenhum vídeo disponível</p>
              </div>
            )}
          </div>

          {/* Fotos */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🖼️</span> Fotos
            </h2>
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                    <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-400">Nenhuma foto disponível</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto text-center px-4">
          <p className="text-gray-600 mb-4 text-sm">Siga-nos nas redes sociais</p>
          <div className="flex justify-center gap-4 mb-4">
            <a href="#" className="text-2xl text-gray-400 hover:text-blue-500">📷</a>
            <a href="#" className="text-2xl text-gray-400 hover:text-blue-500">👤</a>
            <a href="#" className="text-2xl text-gray-400 hover:text-blue-500">▶️</a>
            <a href="#" className="text-2xl text-gray-400 hover:text-blue-500">🐦</a>
          </div>
          <p className="text-xs text-gray-400">© 2024 Luís Da Mídia. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[2000]"
          onClick={(e) => e.target === e.currentTarget && setShowLogin(false)}
        >
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">🔐 Login Admin</h2>
              <p className="text-sm text-gray-600">Área restrita para gerenciamento</p>
            </div>

            {alert.message && (
              <div
                className={`p-3 rounded-lg mb-4 text-sm ${
                  alert.type === 'error'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : alert.type === 'success'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                }`}
              >
                {alert.message}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Player */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-[1000]">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex gap-2">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">🔀</button>
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">⏮️</button>
            <button className="w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600">
              ▶️
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">⏭️</button>
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">🔁</button>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Player Luís Da Mídia</div>
            <div className="text-xs text-gray-600">Tocando suas músicas favoritas</div>
          </div>
        </div>
      </div>
    </div>
  );
}