import axios from 'axios';
import { getToken, clearToken } from './auth';
import { router } from 'expo-router';

const API_BASE = 'http://192.168.1.33:3000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearToken();
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  }
);

export default api;
