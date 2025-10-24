// Centraliza a base URL da API com boas práticas e fallbacks seguros.
// Prioriza VITE_API_URL; em dev usa localhost; em produção pode usar o mesmo host com prefixo /api.

export function getApiBase() {
  try {
    const envUrl = (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_API_URL) || '';
    if (envUrl) {
      return envUrl.replace(/\/$/, '');
    }
  } catch (_) {
    // ignore
  }

  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (/localhost|127\.0\.0\.1/.test(origin)) {
      return 'http://localhost:8001/api';
    }
    return origin.replace(/\/$/, '') + '/api';
  }

  return 'http://localhost:8001/api';
}

export const API_BASE = getApiBase();
