const RAW_BASE = import.meta.env.VITE_AUTH_API_URL ?? '';
export const AUTH_API_URL = RAW_BASE.replace(/\/$/, '');

export const AUTH_ERROR_MESSAGES = {
  state_mismatch:
    "The login request didn't match. Please try logging in again - this usually means the cookie was cleared or the request took too long.",
  missing_code:
    'osu! did not return an authorization code. Please try logging in again.',
  token_exchange_failed:
    'We could not complete the login with osu!. Please double-check that your OSU_CLIENT_ID and OSU_CLIENT_SECRET are correct, then try again.',
  access_denied: 'You cancelled the osu! login. You can sign in any time.',
  oauth_not_configured:
    'The auth server is missing OSU_CLIENT_ID or OSU_CLIENT_SECRET. Set these in the server environment and restart.',
  upstream_error:
    "We couldn't reach osu! just now. Please try again in a moment.",
  backend_unavailable:
    "We couldn't reach the auth server. Check your connection. If deploying, verify VITE_AUTH_API_URL is set correctly and the backend is running.",
  network_error:
    "Network error contacting the auth server. Check your connection and that the server is running.",
};

export function explainAuthError(code) {
  if (!code) return '';
  return AUTH_ERROR_MESSAGES[code] ?? `Login failed (${code}). Please try again.`;
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function authError(code, status, body) {
  const error = new Error(explainAuthError(code) || `Auth error: ${code}`);
  error.code = code;
  error.status = status;
  error.body = body;
  return error;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${AUTH_API_URL}${path}`, {
      credentials: 'include',
      headers: { Accept: 'application/json', ...(options.headers ?? {}) },
      ...options,
    });
  } catch (networkError) {
    throw authError('backend_unavailable', 0, null);
  }
  const body = await parseResponse(response);
  if (!response.ok) {
    const code =
      (body && typeof body === 'object' && (body.error || body.code)) ||
      `http_${response.status}`;
    throw authError(code, response.status, body);
  }
  return body;
}

export function getAuthApiUrl() {
  return AUTH_API_URL;
}

export async function pingBackend({ timeoutMs = 2500 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${AUTH_API_URL}/api/health`, {
      credentials: 'include',
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      data: response.ok ? await response.json() : null,
    };
  } catch (error) {
    return { ok: false, status: 0, error: error?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export function fetchAuthStatus() {
  return request('/api/auth/status');
}

export function startLogin() {
  if (typeof window !== 'undefined') {
    window.location.href = `${AUTH_API_URL}/api/auth/login`;
  }
}

export function fetchMe() {
  return request('/api/me');
}

export async function logout() {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.warn('[auth] logout request failed', error);
  }
}