import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LuActivity,
  LuCalendarCheck2,
  LuChartLine,
  LuLogIn,
  LuMap,
  LuPalette,
  LuShieldCheck,
  LuSparkles,
  LuTriangleAlert,
  LuTarget,
  LuUsers,
} from 'react-icons/lu';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { frontendConfig } from '../utils/config';
import { AUTH_API_URL } from '../utils/auth';

const features = [
  {
    icon: LuTarget,
    title: 'Live PP tracker',
    body: 'See your current PP, rank, and country rank the moment you log in - no manual refresh, no API key juggling.',
  },
  {
    icon: LuActivity,
    title: 'Replay analyzer',
    body: 'Drop in your latest play stats and get a personalized breakdown of what to drill next session.',
  },
  {
    icon: LuMap,
    title: 'Smart map finder',
    body: 'Map recommendations are tuned to your real osu! profile - your accuracy, PP, and play style.',
  },
  {
    icon: LuCalendarCheck2,
    title: 'Practice planner',
    body: 'Build a session plan, track deadlines, and watch your completion rate climb across the week.',
  },
  {
    icon: LuChartLine,
    title: 'Personalized dashboard',
    body: 'Recent activity, last replay, top recommendations, and PP progress - all in one place.',
  },
  {
    icon: LuUsers,
    title: 'Community & comparison',
    body: 'See where you stack up against other players, mark favourites, and find rivals your skill level.',
  },
];

const highlights = [
  { icon: LuShieldCheck, label: 'Secure OAuth' },
  { icon: LuSparkles, label: 'Personalized in seconds' },
  { icon: LuPalette, label: 'Skins & planner' },
];

export default function Landing() {
  const { login, isLoading, error, clearError, backendReachable } = useAuth();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  async function handleLogin() {
    setBusy(true);
    setLocalError('');
    clearError();
    try {
      await login();
    } catch (err) {
      setLocalError(err?.message ?? 'Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const friendlyError = localError || error;

  return (
    <div className="landing">
      <div className="landing__inner">
        <header className="landing__header">
          <div className="landing__brand">
            <span className="landing__brand-text">osu!</span>
            <span className="landing__brand-accent">Hub</span>
          </div>
          <div className="landing__header-cta">
            <Button
              variant="primary"
              size="lg"
              onClick={handleLogin}
              disabled={isLoading || busy}
              icon={<LuLogIn />}
            >
              {busy ? 'Connecting…' : 'Login with osu!'}
            </Button>
          </div>
        </header>

        {!backendReachable && (
          <div className="landing__alert landing__alert--error" role="alert">
            <LuTriangleAlert />
            <div>
              <strong>Auth server unreachable</strong>
              <p>
                We couldn't reach <code>{AUTH_API_URL}</code>. The authentication
                server may be starting up or experiencing a temporary outage.
                Please wait a moment and try again. If the problem persists,
                contact the site administrator.
              </p>
            </div>
          </div>
        )}

        {friendlyError && (
          <div className="landing__alert landing__alert--error" role="alert">
            <LuTriangleAlert />
            <div>
              <strong>Login failed</strong>
              <p>{friendlyError}</p>
            </div>
          </div>
        )}

        {frontendConfig.errors.length > 0 && (
          <div className="landing__alert landing__alert--error" role="alert">
            <LuTriangleAlert />
            <div>
              <strong>Frontend configuration is missing</strong>
              <ul>
                {frontendConfig.errors.map((e) => (
                  <li key={e.field}>
                    <code>{e.field}</code> – {e.message}
                  </li>
                ))}
              </ul>
              <p>
                Copy <code>src/.env.example</code> to <code>src/.env</code> and
                restart <code>npm run dev</code>.
              </p>
            </div>
          </div>
        )}

        <section className="landing__hero">
          <p className="landing__eyebrow">Your osu! companion</p>
          <h1 className="landing__title">
            Connect your <span className="landing__title-accent">osu! profile</span> and unlock
            <br />
            a personalized performance dashboard.
          </h1>
          <p className="landing__lede">
            osu!Hub is your home for tracking PP goals, building practice plans, analyzing replays,
            and discovering maps that match your skill. Sign in once with osu! and your data follows
            you everywhere - across devices, between sessions, instantly.
          </p>
          <div className="landing__cta-row">
            <Button
              variant="primary"
              size="lg"
              onClick={handleLogin}
              disabled={isLoading || busy}
              icon={busy ? undefined : <LuLogIn />}
            >
              {busy ? (
                <span className="landing__cta-busy">
                  <LoadingSpinner label="Connecting" small />
                </span>
              ) : (
                'Login with osu!'
              )}
            </Button>
            <span className="landing__cta-hint">
              You'll be redirected to osu.ppy.sh to authorize the app.
            </span>
          </div>

          <ul className="landing__highlights">
            {highlights.map((highlight) => (
              <li key={highlight.label} className="landing__highlight">
                <highlight.icon />
                <span>{highlight.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing__features" aria-label="Features">
          <header className="landing__section-head">
            <p className="landing__eyebrow">What you get</p>
            <h2>Everything tied to your real osu! account</h2>
          </header>
          <div className="landing__feature-grid">
            {features.map((feature) => (
              <article key={feature.title} className="landing__feature-card">
                <div className="landing__feature-icon" aria-hidden="true">
                  <feature.icon />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing__cta">
          <h2>Ready to see your numbers?</h2>
          <p>Sign in once, and your personalized dashboard is one click away.</p>
          <Button
            variant="primary"
            size="lg"
            onClick={handleLogin}
            disabled={isLoading || busy}
            icon={<LuLogIn />}
          >
            Login with osu!
          </Button>
          <p className="landing__legal">
            By signing in you agree to share your basic osu! profile data (username, avatar,
            stats) with osu!Hub.{' '}
            <Link to="/about">Learn more</Link>
          </p>
        </section>
      </div>
    </div>
  );
}