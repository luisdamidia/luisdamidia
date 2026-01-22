import { projectId, publicAnonKey } from '/utils/supabase/info';

const SUPABASE_URL = `https://${projectId}.supabase.co`;

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    console.warn('Sem refresh token disponível');
    return null;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': publicAnonKey,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      console.error('Falha ao renovar token:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.access_token) {
      localStorage.setItem('accessToken', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token);
      }
      console.log('✅ Token renovado com sucesso');
      return data.access_token;
    }

    return null;
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    return null;
  }
};

export const getValidToken = async (): Promise<string | null> => {
  let token = localStorage.getItem('accessToken');
  
  if (!token) {
    // Tentar renovar se não tiver token
    token = await refreshAccessToken();
  }
  
  return token;
};

export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};
