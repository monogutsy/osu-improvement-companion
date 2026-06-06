import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import Toast from '../components/ui/Toast';
import { useAuth } from './AuthContext';
import {
  appendActivity,
  normalizeActivityList,
  normalizeBeatmap,
  normalizePpData,
  normalizeSkin,
  safeNumber,
} from '../utils/osu';

const AppContext = createContext(null);

const defaultPpData = normalizePpData({
  currentPP: 0,
  goalPP: 0,
  linkedUsername: '',
  history: [],
});

export function AppProvider({ children }) {
  const { profile, isAuthenticated } = useAuth();

  const [ppDataState, setPpDataState] = useLocalStorage('osu_pp_data', defaultPpData);
  const [beatmapsState, setBeatmapsState] = useLocalStorage('osu_beatmaps', []);
  const [skinsState, setSkinsState] = useLocalStorage('osu_skins', []);
  const [lastReplay, setLastReplay] = useLocalStorage('osu_last_replay', null);
  const [favoritePlayersState, setFavoritePlayersState] = useLocalStorage('osu_favorite_players', []);
  const [activityState, setActivityState] = useLocalStorage('osu_activity', []);
  const [profileDirectoryState, setProfileDirectoryState] = useLocalStorage('osu_profile_directory', []);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const addActivity = useCallback(
    (message) => {
      setActivityState((current) => appendActivity(current, message));
    },
    [setActivityState]
  );

  useEffect(() => {
    if (!isAuthenticated || !profile?.username) return;
    addActivity(
      `Signed in as @${profile.username} (${safeNumber(profile.pp_raw)}pp)`
    );
  }, [isAuthenticated, profile?.user_id]);

  const setPpData = useCallback(
    (nextValue) => {
      setPpDataState((current) => {
        const resolved = typeof nextValue === 'function' ? nextValue(normalizePpData(current)) : nextValue;
        return normalizePpData(resolved);
      });
    },
    [setPpDataState]
  );

  const setBeatmaps = useCallback(
    (nextValue) => {
      setBeatmapsState((current) => {
        const next = typeof nextValue === 'function' ? nextValue(current.map(normalizeBeatmap)) : nextValue;
        return Array.isArray(next) ? next.map(normalizeBeatmap) : [];
      });
    },
    [setBeatmapsState]
  );

  const setSkins = useCallback(
    (nextValue) => {
      setSkinsState((current) => {
        const next = typeof nextValue === 'function' ? nextValue(current.map(normalizeSkin)) : nextValue;
        return Array.isArray(next) ? next.map(normalizeSkin) : [];
      });
    },
    [setSkinsState]
  );

  const setFavoritePlayers = useCallback(
    (nextValue) => {
      setFavoritePlayersState((current) => {
        const next = typeof nextValue === 'function' ? nextValue(current) : nextValue;
        return Array.isArray(next) ? next.map((value) => String(value)) : [];
      });
    },
    [setFavoritePlayersState]
  );

  const activity = useMemo(() => normalizeActivityList(activityState), [activityState]);
  const ppData = useMemo(() => normalizePpData(ppDataState), [ppDataState]);
  const beatmaps = useMemo(
    () => (Array.isArray(beatmapsState) ? beatmapsState.map(normalizeBeatmap) : []),
    [beatmapsState]
  );
  const skins = useMemo(
    () => (Array.isArray(skinsState) ? skinsState.map(normalizeSkin) : []),
    [skinsState]
  );
  const favoritePlayers = useMemo(
    () =>
      Array.isArray(favoritePlayersState) ? favoritePlayersState.map((value) => String(value)) : [],
    [favoritePlayersState]
  );

  const activeUser = isAuthenticated ? profile : null;
  const username = activeUser?.username ?? '';
  const currentPP = safeNumber(activeUser?.pp_raw ?? ppData.currentPP);
  const goalPP = safeNumber(ppData.goalPP);
  const practiceCount = beatmaps.length;
  const completedGoals = beatmaps.filter((beatmap) => beatmap.completed).length;
  const ppWidgetLink = ppData.linkedUsername ?? '';

  const value = useMemo(
    () => ({
      activeUser,
      ppData,
      setPpData,
      beatmaps,
      setBeatmaps,
      skins,
      setSkins,
      lastReplay,
      setLastReplay,
      favoritePlayers,
      setFavoritePlayers,
      profileDirectory: profileDirectoryState,
      setProfileDirectory: setProfileDirectoryState,
      activity,
      addActivity,
      showToast,
      toasts,
      username,
      currentPP,
      goalPP,
      practiceCount,
      completedGoals,
      ppWidgetLink,
    }),
    [
      activeUser,
      ppData,
      setPpData,
      beatmaps,
      setBeatmaps,
      skins,
      setSkins,
      lastReplay,
      favoritePlayers,
      setFavoritePlayers,
      profileDirectoryState,
      setProfileDirectoryState,
      activity,
      addActivity,
      showToast,
      toasts,
      username,
      currentPP,
      goalPP,
      practiceCount,
      completedGoals,
      ppWidgetLink,
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}