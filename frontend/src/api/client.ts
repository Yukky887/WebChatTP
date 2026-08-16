import axios, { AxiosInstance, AxiosError } from 'axios';
import config from '../config';

const client: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 180000, // 3 минуты для LLM
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена админа
client.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem(config.tokenKey);
  if (token) {
    reqConfig.params = {
      ...reqConfig.params,
      token,
    };
  }
  return reqConfig;
});

// Интерцептор для обработки ошибок
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Токен истёк — разлогиниваем
      localStorage.removeItem(config.tokenKey);
    }
    return Promise.reject(error);
  }
);

export default client;