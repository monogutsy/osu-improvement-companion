import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import MobileNav from './components/layout/MobileNav';
import TopBar from './components/layout/TopBar';
import BackgroundEffects from './components/layout/BackgroundEffects';
import Dashboard from './pages/Dashboard';
import BeatmapPlanner from './pages/BeatmapPlanner';
import PPTracker from './pages/PPTracker';
import MapRecommendations from './pages/MapRecommendations';
import ReplayAnalyzer from './pages/ReplayAnalyzer';
import SkinManager from './pages/SkinManager';
import CommunityFinder from './pages/CommunityFinder';
import Landing from './pages/Landing';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

const routeTitles = {
  '/': 'Dashboard',
  '/planner': 'Beatmap Planner',
  '/pp-tracker': 'PP Goal Tracker',
  '/recommendations': 'Map Recommendations',
  '/replay-analyzer': 'Replay Analyzer',
  '/skins': 'Skin Manager',
  '/community': 'Community Finder',
};

function ShellRoutes() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  if (location.pathname === '/auth/callback') {
    return (
      <AppProvider>
        <AuthCallback />
      </AppProvider>
    );
  }

  if (isLoading) {
    return (
      <div className="app-loading">
        <BackgroundEffects />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (location.pathname !== '/') {
      return <Navigate to="/" replace />;
    }
    return (
      <AppProvider>
        <Landing />
      </AppProvider>
    );
  }

  const title = routeTitles[location.pathname] ?? 'osu! Companion';

  return (
    <AppProvider>
      <div className="app-shell">
        <BackgroundEffects />
        <Sidebar />
        <MobileNav />
        <div className="app-main">
          <TopBar title={title} />
          <main key={location.pathname} className="page-transition page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route
                path="/planner"
                element={
                  <ProtectedRoute>
                    <BeatmapPlanner />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pp-tracker"
                element={
                  <ProtectedRoute>
                    <PPTracker />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recommendations"
                element={
                  <ProtectedRoute>
                    <MapRecommendations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/replay-analyzer"
                element={
                  <ProtectedRoute>
                    <ReplayAnalyzer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/skins"
                element={
                  <ProtectedRoute>
                    <SkinManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/community"
                element={
                  <ProtectedRoute>
                    <CommunityFinder />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </AppProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ShellRoutes />
    </AuthProvider>
  );
}

export default App;