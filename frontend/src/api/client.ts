import axios, { AxiosInstance } from 'axios';
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

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(config.tokenKey);
    }
    return Promise.reject(error);
  }
);

export default client;