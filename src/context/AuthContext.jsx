import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../utils/auth';
import { normalizeProfile } from '../utils/osu';

const AuthContext = createContext(null);

const LAST_SEEN_KEY = 'osuhub_last_user_id';

function readLastSeenId() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(LAST_SEEN_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeLastSeenId(id) {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      window.localStorage.setItem(LAST_SEEN_KEY, id);
    } else {
      window.localStorage.removeItem(LAST_SEEN_KEY);
    }
  } catch {
  }
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [backendReachable, setBackendReachable] = useState(true);
  const [lastSeenId, setLastSeenId] = useState(readLastSeenId);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const me = await authApi.fetchMe();
      const normalized = normalizeProfile(me.profile);
      setProfile(normalized);
      setLastSeenId(normalized?.user_id ?? '');
      writeLastSeenId(normalized?.user_id ?? '');
      setBackendReachable(true);
      setStatus('authenticated');
      return normalized;
    } catch (err) {
      if (err?.status === 401) {
        setProfile(null);
        setStatus('unauthenticated');
        return null;
      }
      if (err?.code === 'backend_unavailable' || err?.code === 'network_error') {
        setBackendReachable(false);
      }
      setError(err?.message ?? 'Could not verify your session.');
      setStatus('unauthenticated');
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async () => {
    const ping = await authApi.pingBackend();
    if (!ping.ok) {
      const err = new Error(authApi.AUTH_ERROR_MESSAGES.backend_unavailable);
      err.code = 'backend_unavailable';
      setBackendReachable(false);
      setError(err.message);
      throw err;
    }
    setBackendReachable(true);
    authApi.startLogin();
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setProfile(null);
      setStatus('unauthenticated');
      setLastSeenId('');
      writeLastSeenId('');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      profile,
      error,
      backendReachable,
      lastSeenId,
      login,
      logout,
      refresh,
      clearError,
    }),
    [status, profile, error, backendReachable, lastSeenId, login, logout, refresh, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}