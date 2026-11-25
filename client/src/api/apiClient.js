// In Docker, VITE_API_URL is intentionally empty so we use a relative /api path.
// nginx on the same origin proxies /api/* → server:5001.
// In local dev, falls back to http://localhost:5001/api (direct connection,
// or proxied via Vite's server.proxy config).
const DEFAULT_API_URL = 'http://localhost:5001/api';

const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof process !== 'undefined' &&
    (process.env.EXPO_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL)) ||
  DEFAULT_API_URL;

// When RAW_API_URL is empty string (Docker same-origin mode), use relative /api
const CLEAN_BASE = RAW_API_URL.trim() === '' ? '/api' : RAW_API_URL.replace(/\/+$/, '');
export const API_BASE_URL = CLEAN_BASE.endsWith('/api')
  ? CLEAN_BASE
  : `${CLEAN_BASE}/api`;

let getAuthToken = () => {
  try {
    const raw = localStorage.getItem('cloudvault_token');
    return raw || null;
  } catch {
    return null;
  }
};

export function setAuthTokenProvider(provider) {
  getAuthToken = provider;
}

export class ApiError extends Error {
  constructor(message, status, code, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export function buildQuery(params) {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Core apiClient wrapper handling base URL, credentials, token authorization,
 * JSON serialization, and structured error throwing.
 */
export async function apiClient(path, init = {}) {
  const token = await getAuthToken();
  const headers = new Headers(init.headers);
  let body = init.body;

  if (body !== undefined && body !== null) {
    if (
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer) &&
      typeof body !== 'string'
    ) {
      body = JSON.stringify(body);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    } else if (!headers.has('Content-Type') && !(body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Normalize path ensuring leading slash
  let normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Prevent duplicate /api if path already starts with /api
  if (normalizedPath.startsWith('/api/')) {
    normalizedPath = normalizedPath.slice(4); // Remove leading /api
  }

  const url = `${API_BASE_URL}${normalizedPath}`;

  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers,
    body,
  });

  let parsed = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok || (parsed && typeof parsed === 'object' && parsed.success === false)) {
    const message =
      (parsed && typeof parsed === 'object' && (parsed.error || parsed.message)) ||
      `Request failed with status ${response.status}`;
    const code = parsed && typeof parsed === 'object' ? parsed.code : undefined;
    throw new ApiError(message, response.status, code, parsed);
  }

  return parsed;
}
