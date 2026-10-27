import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import config from '../config';

const client: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 180000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((reqConfig) => {
  const adminToken = localStorage.getItem('admin_token');
  const userToken = localStorage.getItem('user_token');

  // Для админки — admin_token, для остальных — user_token (или admin как fallback)
  if (reqConfig.url?.includes('/admin')) {
    if (adminToken) {
      reqConfig.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else if (userToken) {
    reqConfig.headers.Authorization = `Bearer ${userToken}`;
  } else if (adminToken) {
    reqConfig.headers.Authorization = `Bearer ${adminToken}`;
  }

  return reqConfig;
});

// Автопродление access-токена через refresh-токен.
// Родовой баг: токен живёт 24 часа, а фронт не продлевал его — после истечения
// чат продолжался без пользователя и сообщения писались в «ничейные» сессии,
// которые после перелогина исчезали из истории (баг пользователя leha).
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await axios.post(
      `${config.apiBaseUrl}/auth/refresh`,
      null,
      { params: { refresh_token: refreshToken } },
    );
    const access: string | undefined = response.data?.access_token;
    if (!access) return null;

    localStorage.setItem('user_token', access);
    if (response.data.user) {
      localStorage.setItem('user_info', JSON.stringify(response.data.user));
    }
    if (response.data.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    return access;
  } catch {
    localStorage.removeItem('user_token');
    localStorage.removeItem('refresh_token');
    return null;
  }
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url: string = original?.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');

    if (error.response?.status !== 401 || !original || original._retried || isAuthEndpoint) {
      return Promise.reject(error);
    }

    original._retried = true;
    refreshInFlight = refreshInFlight ?? refreshAccessToken();
    const newAccessToken = await refreshInFlight;
    refreshInFlight = null;

    if (!newAccessToken) {
      // Для админ-страниц редирект не делается: админка сама вернёт на форму входа
      if (!url.includes('/admin') && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    original.headers = original.headers ?? ({} as any);
    (original.headers as any).Authorization = `Bearer ${newAccessToken}`;
    return client(original) as any;
  }
);

export default client;