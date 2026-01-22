import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middlewares
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger(console.log));

// Supabase Client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// ===== ROTAS =====

// Health check
app.get('/make-server-80fba11b/health', (c) => {
  return c.json({ status: 'ok', message: 'Luís Da Mídia API funcionando!' });
});

// Refresh token route
app.post('/make-server-80fba11b/refresh-token', async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return c.json({ error: 'Refresh token não fornecido' }, 400);
    }

    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      return c.json({ error: 'Erro ao renovar token' }, 401);
    }

    console.log('✅ Token renovado com sucesso');
    return c.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
  } catch (error) {
    console.error('❌ Erro ao renovar token:', error);
    return c.json({ error: 'Erro ao renovar token' }, 500);
  }
});

// Criar admin automaticamente na primeira vez
app.post('/make-server-80fba11b/init-admin', async (c) => {
  try {
    const email = 'luisdamidia@admin.com';
    const password = 'Jilmaria@2004';
    
    // Verifica se já existe
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const adminExists = existingUser?.users?.some(u => u.email === email);
    
    if (adminExists) {
      return c.json({ success: true, message: 'Admin já existe' });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: 'Luís Da Mídia Admin' },
      email_confirm: true,
    });

    if (error) {
      console.error('❌ Erro ao criar admin:', error.message);
      return c.json({ error: error.message }, 400);
    }

    console.log(`✅ Admin criado: ${email}`);
    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error('❌ Erro ao inicializar admin:', error);
    return c.json({ error: 'Erro ao criar admin' }, 500);
  }
});

// Upload de CD
app.post('/make-server-80fba11b/upload-cd', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Erro de autenticação:', authError?.message);
      return c.json({ error: 'Token inválido' }, 401);
    }

    const body = await c.req.json();
    const { title, artist, genre, coverUrl, songs } = body;

    const cdId = `cd_${Date.now()}`;
    const cdData = {
      id: cdId,
      title,
      artist,
      genre,
      coverUrl,
      songs: songs || [],
      playCount: 0,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    };

    await kv.set(cdId, cdData);

    console.log(`✅ CD criado: ${title} - ${artist}`);
    return c.json({ success: true, cd: cdData });
  } catch (error) {
    console.error('❌ Erro ao criar CD:', error);
    return c.json({ error: 'Erro ao criar CD' }, 500);
  }
});

// Upload de CD via ZIP
app.post('/make-server-80fba11b/upload-cd-zip', async (c) => {
  try {
    console.log('📦 Iniciando upload de CD via ZIP...');
    
    const authHeader = c.req.header('Authorization');
    console.log('Auth header presente:', !!authHeader);
    
    if (!authHeader) {
      console.error('❌ Sem header de autorização');
      return c.json({ error: 'Não autorizado - falta header' }, 401);
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extraído, tamanho:', token?.length || 0);
    
    // Validar o token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Erro de autenticação:', authError?.message || 'Usuário não encontrado');
      console.error('Auth error details:', JSON.stringify(authError));
      return c.json({ error: `Token inválido: ${authError?.message || 'Usuário não encontrado'}` }, 401);
    }

    console.log('✅ Usuário autenticado:', user.email);

    const formData = await c.req.formData();
    const zipFile = formData.get('zipFile') as File;
    const title = formData.get('title') as string;
    const artist = formData.get('artist') as string;
    const genre = formData.get('genre') as string;

    console.log('📝 Dados recebidos:', { title, artist, genre, zipFileName: zipFile?.name });

    if (!zipFile || !title || !artist || !genre) {
      return c.json({ error: 'Dados incompletos' }, 400);
    }

    console.log(`📦 Processando ZIP: ${zipFile.name} (${zipFile.size} bytes)`);

    // Salvar ZIP temporariamente
    const zipBuffer = await zipFile.arrayBuffer();
    const zipPath = `/tmp/${Date.now()}_${zipFile.name}`;
    await Deno.writeFile(zipPath, new Uint8Array(zipBuffer));

    // Extrair ZIP usando comando unzip do sistema
    const extractPath = `/tmp/extracted_${Date.now()}`;
    await Deno.mkdir(extractPath, { recursive: true });
    
    const unzipProcess = new Deno.Command('unzip', {
      args: ['-q', zipPath, '-d', extractPath],
    });
    
    const { success: unzipSuccess } = await unzipProcess.output();
    
    if (!unzipSuccess) {
      console.error('❌ Erro ao extrair ZIP');
      return c.json({ error: 'Erro ao extrair arquivo ZIP' }, 500);
    }

    console.log('✅ ZIP extraído com sucesso');

    // Encontrar arquivos de música e capa
    const files = [];
    for await (const entry of Deno.readDir(extractPath)) {
      if (entry.isFile) {
        files.push(entry.name);
      }
    }

    const musicExtensions = ['.mp3', '.m4a', '.wav', '.flac', '.ogg'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    const musicFiles = files.filter(f => musicExtensions.some(ext => f.toLowerCase().endsWith(ext)));
    const imageFiles = files.filter(f => imageExtensions.some(ext => f.toLowerCase().endsWith(ext)));

    console.log(`🎵 Encontradas ${musicFiles.length} músicas`);
    console.log(`🖼️ Encontradas ${imageFiles.length} imagens`);

    const cdId = `cd_${Date.now()}`;
    const bucketName = 'make-80fba11b-cds';

    // Upload da capa
    let coverUrl = '';
    if (imageFiles.length > 0) {
      const coverFile = imageFiles[0];
      const coverPath = `${extractPath}/${coverFile}`;
      const coverData = await Deno.readFile(coverPath);
      const coverStoragePath = `${cdId}/cover${coverFile.substring(coverFile.lastIndexOf('.'))}`;
      
      const { data: coverUpload, error: coverError } = await supabase.storage
        .from(bucketName)
        .upload(coverStoragePath, coverData, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!coverError && coverUpload) {
        const { data: signedUrl } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(coverStoragePath, 31536000); // 1 ano
        
        coverUrl = signedUrl?.signedUrl || '';
        console.log(`✅ Capa uploaded: ${coverStoragePath}`);
      }
    }

    // Upload das músicas
    const songs = [];
    for (const musicFile of musicFiles.slice(0, 30)) { // Limitar a 30 músicas
      const musicPath = `${extractPath}/${musicFile}`;
      const musicData = await Deno.readFile(musicPath);
      const musicStoragePath = `${cdId}/songs/${musicFile}`;
      
      const { data: musicUpload, error: musicError } = await supabase.storage
        .from(bucketName)
        .upload(musicStoragePath, musicData, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (!musicError && musicUpload) {
        const { data: signedUrl } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(musicStoragePath, 31536000);
        
        songs.push({
          title: musicFile.replace(/\.[^/.]+$/, ''), // Remove extensão
          url: signedUrl?.signedUrl || '',
          duration: 0
        });
        
        console.log(`✅ Música uploaded: ${musicFile}`);
      }
    }

    // Limpar arquivos temporários
    try {
      await Deno.remove(zipPath);
      await Deno.remove(extractPath, { recursive: true });
      console.log('🗑️ Arquivos temporários removidos');
    } catch (e) {
      console.warn('Aviso: Erro ao limpar arquivos temporários:', e);
    }

    // Salvar CD no banco de dados
    const cdData = {
      id: cdId,
      title,
      artist,
      genre,
      coverUrl,
      songs,
      playCount: 0,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    };

    await kv.set(cdId, cdData);

    console.log(`✅ CD criado via ZIP: ${title} - ${artist} (${songs.length} músicas)`);
    return c.json({ success: true, cd: cdData });
  } catch (error) {
    console.error('❌ Erro ao processar ZIP:', error);
    return c.json({ error: `Erro ao processar ZIP: ${error.message}` }, 500);
  }
});

// Listar todos os CDs
app.get('/make-server-80fba11b/cds', async (c) => {
  try {
    const cds = await kv.getByPrefix('cd_');
    console.log(`📀 Retornando ${cds.length} CDs`);
    return c.json({ cds });
  } catch (error) {
    console.error('❌ Erro ao listar CDs:', error);
    return c.json({ error: 'Erro ao listar CDs' }, 500);
  }
});

// Buscar CD por ID
app.get('/make-server-80fba11b/cds/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const cd = await kv.get(id);

    if (!cd) {
      return c.json({ error: 'CD não encontrado' }, 404);
    }

    return c.json({ cd });
  } catch (error) {
    console.error('❌ Erro ao buscar CD:', error);
    return c.json({ error: 'Erro ao buscar CD' }, 500);
  }
});

// Incrementar play count
app.post('/make-server-80fba11b/cds/:id/play', async (c) => {
  try {
    const id = c.req.param('id');
    const cd = await kv.get(id);

    if (!cd) {
      return c.json({ error: 'CD não encontrado' }, 404);
    }

    cd.playCount = (cd.playCount || 0) + 1;
    await kv.set(id, cd);

    console.log(`▶️ Play count incrementado: ${cd.title} (${cd.playCount})`);
    return c.json({ success: true, playCount: cd.playCount });
  } catch (error) {
    console.error('❌ Erro ao incrementar play:', error);
    return c.json({ error: 'Erro ao incrementar play' }, 500);
  }
});

// Incrementar download count
app.post('/make-server-80fba11b/cds/:id/download', async (c) => {
  try {
    const id = c.req.param('id');
    const cd = await kv.get(id);

    if (!cd) {
      return c.json({ error: 'CD não encontrado' }, 404);
    }

    cd.downloadCount = (cd.downloadCount || 0) + 1;
    await kv.set(id, cd);

    console.log(`⬇️ Download count incrementado: ${cd.title} (${cd.downloadCount})`);
    return c.json({ success: true, downloadCount: cd.downloadCount });
  } catch (error) {
    console.error('❌ Erro ao incrementar download:', error);
    return c.json({ error: 'Erro ao incrementar download' }, 500);
  }
});

// Upload de foto
app.post('/make-server-80fba11b/upload-photo', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: 'Token inválido' }, 401);
    }

    const body = await c.req.json();
    const { url, title } = body;

    const photoId = `photo_${Date.now()}`;
    const photoData = {
      id: photoId,
      url,
      title: title || 'Foto',
      createdAt: new Date().toISOString(),
    };

    await kv.set(photoId, photoData);

    console.log(`📷 Foto adicionada: ${title}`);
    return c.json({ success: true, photo: photoData });
  } catch (error) {
    console.error('❌ Erro ao adicionar foto:', error);
    return c.json({ error: 'Erro ao adicionar foto' }, 500);
  }
});

// Listar fotos
app.get('/make-server-80fba11b/photos', async (c) => {
  try {
    const photos = await kv.getByPrefix('photo_');
    console.log(`🖼️ Retornando ${photos.length} fotos`);
    return c.json({ photos });
  } catch (error) {
    console.error('❌ Erro ao listar fotos:', error);
    return c.json({ error: 'Erro ao listar fotos' }, 500);
  }
});

// Upload de vídeo
app.post('/make-server-80fba11b/upload-video', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: 'Token inválido' }, 401);
    }

    const body = await c.req.json();
    const { url, title } = body;

    const videoId = `video_${Date.now()}`;
    const videoData = {
      id: videoId,
      url,
      title: title || 'Vídeo',
      createdAt: new Date().toISOString(),
    };

    await kv.set(videoId, videoData);

    console.log(`🎥 Vídeo adicionado: ${title}`);
    return c.json({ success: true, video: videoData });
  } catch (error) {
    console.error('❌ Erro ao adicionar vídeo:', error);
    return c.json({ error: 'Erro ao adicionar vídeo' }, 500);
  }
});

// Listar vídeos
app.get('/make-server-80fba11b/videos', async (c) => {
  try {
    const videos = await kv.getByPrefix('video_');
    console.log(`🎬 Retornando ${videos.length} vídeos`);
    return c.json({ videos });
  } catch (error) {
    console.error('❌ Erro ao listar vídeos:', error);
    return c.json({ error: 'Erro ao listar vídeos' }, 500);
  }
});

// Salvar configurações do site
app.post('/make-server-80fba11b/save-settings', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: 'Token inválido' }, 401);
    }

    const body = await c.req.json();
    await kv.set('site_settings', body);

    console.log('⚙️ Configurações do site atualizadas');
    return c.json({ success: true, settings: body });
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    return c.json({ error: 'Erro ao salvar configurações' }, 500);
  }
});

// Buscar configurações do site
app.get('/make-server-80fba11b/settings', async (c) => {
  try {
    const settings = await kv.get('site_settings') || {
      siteName: 'Luís Da Mídia',
      siteSlogan: 'Sua música, seu estilo',
      logoUrl: '',
      bannerTitle: 'Bem-vindo ao Luís Da Mídia',
      bannerSubtitle: 'Descubra e baixe os melhores álbuns musicais',
      bannerImageUrl: ''
    };
    
    console.log('⚙️ Retornando configurações do site');
    return c.json({ settings });
  } catch (error) {
    console.error('❌ Erro ao buscar configurações:', error);
    return c.json({ error: 'Erro ao buscar configurações' }, 500);
  }
});

// Iniciar servidor
Deno.serve(app.fetch);

// Criar bucket no Supabase Storage se não existir
const initStorage = async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketName = 'make-80fba11b-cds';
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 524288000 // 500MB
      });
      console.log('✅ Bucket criado:', bucketName);
    }
  } catch (error) {
    console.error('Erro ao criar bucket:', error);
  }
};

initStorage();

console.log('🚀 Servidor Luís Da Mídia iniciado!');