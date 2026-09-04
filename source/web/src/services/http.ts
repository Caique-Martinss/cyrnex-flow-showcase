import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { error?: string } | undefined;

    if (responseData?.error) {
      return responseData.error;
    }

    if (error.code === 'ECONNABORTED') {
      return 'A conexão demorou demais. Tente novamente.';
    }

    if (!error.response) {
      return 'Não foi possível conectar ao servidor.';
    }
  }

  return 'Ocorreu um erro inesperado.';
}


export function getRetryAfterSeconds(error: unknown): number {
  if (!axios.isAxiosError(error)) return 0;
  const responseData = error.response?.data as { retryAfterSeconds?: number } | undefined;
  const value = Number(responseData?.retryAfterSeconds ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 0;
}

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && !String(error.config?.url).includes('/auth/')) {
      window.dispatchEvent(new Event('cyrnex:unauthorized'));
    }
    if (error.response?.status === 402) {
      window.dispatchEvent(new Event('cyrnex:subscription-blocked'));
    }
    return Promise.reject(error);
  }
);
