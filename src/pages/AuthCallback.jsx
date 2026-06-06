import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LuCircleCheck, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { explainAuthError } from '../utils/auth';

const ERROR_CODES = new Set([
  'state_mismatch',
  'missing_code',
  'token_exchange_failed',
  'access_denied',
  'oauth_not_configured',
  'upstream_error',
  'backend_unavailable',
  'network_error',
]);

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [phase, setPhase] = useState('working');
  const [errorMessage, setErrorMessage] = useState('');
  const hasFinalized = useRef(false);

  useEffect(() => {
    if (hasFinalized.current) return;
    hasFinalized.current = true;

    const errorCode = params.get('error');
    if (errorCode) {
      setPhase('error');
      setErrorMessage(
        ERROR_CODES.has(errorCode)
          ? explainAuthError(errorCode)
          : `Login failed (${errorCode}). Please try again.`
      );
      return;
    }

    refresh()
      .then((profile) => {
        if (profile) {
          setPhase('success');
          window.setTimeout(() => navigate('/', { replace: true }), 600);
        } else {
          setPhase('error');
          setErrorMessage(
            'We could not load your osu! profile. Please try logging in again.'
          );
        }
      })
      .catch((err) => {
        setPhase('error');
        setErrorMessage(err?.message ?? 'Login failed. Please try again.');
      });
  }, [params, refresh, navigate]);

  return (
    <div className="auth-callback">
      <div className="auth-callback__card">
        {phase === 'working' && (
          <>
            <LoadingSpinner label="Finishing your osu! login" />
            <p className="auth-callback__hint">
              Hang tight — we're pulling your profile from osu!.
            </p>
            <ul className="auth-callback__steps">
              <li className="auth-callback__step auth-callback__step--done">osu! authorized the app</li>
              <li className="auth-callback__step auth-callback__step--active">
                Exchanging authorization code…
              </li>
              <li className="auth-callback__step">Loading your profile…</li>
            </ul>
          </>
        )}

        {phase === 'success' && (
          <>
            <div className="auth-callback__icon auth-callback__icon--success" aria-hidden="true">
              <LuCircleCheck />
            </div>
            <h1>You're in!</h1>
            <p className="auth-callback__hint">Taking you to your dashboard…</p>
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="auth-callback__icon auth-callback__icon--error" aria-hidden="true">
              <LuTriangleAlert />
            </div>
            <h1>Login failed</h1>
            <p className="auth-callback__error">{errorMessage}</p>
            <p className="auth-callback__hint">
              Common causes: the osu! OAuth app hasn't been authorized, the
              secret was rotated on the osu! side, or the auth server
              encountered an error. Please try signing in again.
            </p>
            <div className="auth-callback__actions">
              <Button
                variant="primary"
                onClick={() => navigate('/', { replace: true })}
                icon={<LuRefreshCw />}
              >
                Back to home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}