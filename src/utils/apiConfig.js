// ─── URJAA — Resilient Multi-Host API Resolver ────────────
const CLOUD_API_FALLBACK = 'https://bhev-api.wittybay-7a064b00.centralindia.azurecontainerapps.io';

export function resolveApiUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000';
    }
  }

  return CLOUD_API_FALLBACK;
}

export const API_URL = resolveApiUrl();
export default API_URL;
