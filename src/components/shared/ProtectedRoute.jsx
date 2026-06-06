import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="protected-loading">
        <LoadingSpinner label="Verifying your session" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}