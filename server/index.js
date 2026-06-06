import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  validateConfig,
  printStartupBanner,
  probeOsuApi,
} from './startup.js';

const { config, errors, warnings } = validateConfig();
printStartupBanner({ config, errors, warnings });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SESSION_COOKIE = 'osuhub_session';
const STATE_COOKIE = 'osuhub_state';
const SCOPES = config.scopes;
const COOKIE_SECURE = config.isProduction;
const COOKIE_SAMESITE = config.isProduction ? 'none' : 'lax';
const VERBOSE_LOGGING = !config.isProduction;

const app = express();

app.disable('x-powered-by');

if (config.trustProxy) {
  app.set('trust proxy', 1);
}

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  'https://osu-improvement-companion.vercel.app',
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app');

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '32kb' }));

if (VERBOSE_LOGGING) {
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api/')) {
      const stamp = new Date().toISOString();
      console.log(`[${stamp}] ${req.method} ${req.path}`);
    }
    next();
  });
}

function generateState() {
  return crypto.randomBytes(24).toString('hex');
}

function setSessionCookie(res, session) {
  const maxAgeMs = (session.expires_in ?? 86400) * 1000;
  res.cookie(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: COOKIE_SAMESITE,
    secure: COOKIE_SECURE,
    maxAge: maxAgeMs,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

function readSession(req) {
  const raw = req.cookies?.[SESSION_COOKIE];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function logOsuError(stage, err) {
  console.error(`[osu!Hub] ${stage} failed:`, err?.message ?? err);
  if (err?.body && VERBOSE_LOGGING) {
    console.error('  upstream body:', err.body);
  }
}

async function exchangeCodeForToken(code) {
  const response = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: Number(config.clientId),
      client_secret: config.clientSecret,
      code: String(code),
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Token exchange failed: ${response.status} ${text}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }
  return response.json();
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: Number(config.clientId),
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: SCOPES,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Token refresh failed: ${response.status} ${text}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }
  return response.json();
}

async function fetchOsuMe(accessToken) {
  const response = await fetch('https://osu.ppy.sh/api/v2/me/osu', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`osu! /me request failed: ${response.status}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }
  return response.json();
}

function normalizeProfile(payload) {
  const stats = payload?.statistics ?? {};
  return {
    user_id: String(payload?.id ?? ''),
    username: payload?.username ?? '',
    avatar_url: payload?.avatar_url ?? '',
    cover_url: payload?.cover?.url ?? '',
    country: payload?.country?.code ?? '',
    country_name: payload?.country?.name ?? '',
    pp_raw: Number(stats?.pp ?? 0),
    pp_rank: Number(stats?.global_rank ?? 0),
    pp_country_rank: Number(stats?.country_rank ?? 0),
    accuracy: Number(stats?.hit_accuracy ?? 0),
    level: Number(stats?.level?.current ?? 0),
    playcount: Number(stats?.play_count ?? 0),
    total_seconds_played: Number(stats?.play_time ?? 0),
    ranked_score: Number(stats?.ranked_score ?? 0),
    total_score: Number(stats?.total_score ?? 0),
    join_date: payload?.join_date ?? '',
    loadedAt: new Date().toISOString(),
  };
}

async function ensureFreshSession(req, res) {
  const session = readSession(req);
  if (!session?.access_token) return null;

  const expiresAt = Date.now() + (session.expires_in ?? 0) * 1000 - 60_000;
  if (Date.now() < expiresAt) return session;

  if (!session.refresh_token) {
    clearSessionCookie(res);
    return null;
  }

  try {
    const refreshed = await refreshAccessToken(session.refresh_token);
    const next = {
      ...session,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? session.refresh_token,
      expires_in: refreshed.expires_in ?? session.expires_in,
    };
    setSessionCookie(res, next);
    if (VERBOSE_LOGGING) console.log('[osu!Hub] refreshed access token');
    return next;
  } catch (error) {
    logOsuError('refresh', error);
    clearSessionCookie(res);
    return null;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'osu-hub-auth',
    version: '1.0.0',
    environment: config.isProduction ? 'production' : 'development',
    configured: config.isConfigured,
    envLoaded: config.envLoaded,
    allowedOrigins: config.allowedOrigins,
    redirectUri: config.redirectUri,
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ready', (_req, res) => {
  if (!config.isConfigured) {
    return res.status(503).json({
      ok: false,
      ready: false,
      reason: 'oauth_not_configured',
      message:
        'Server is missing OSU_CLIENT_ID or OSU_CLIENT_SECRET. The deploy will be marked unhealthy until these are set.',
    });
  }
  res.json({ ok: true, ready: true, timestamp: new Date().toISOString() });
});

app.get('/api/diagnostics', async (_req, res) => {
  const upstream = await probeOsuApi();
  res.json({
    ok: true,
    server: {
      environment: config.isProduction ? 'production' : 'development',
      configured: config.isConfigured,
      envLoaded: config.envLoaded,
      allowedOrigins: config.allowedOrigins,
      redirectUri: config.redirectUri,
      port: config.port,
      pid: process.pid,
      uptime_seconds: Math.round(process.uptime()),
      node_version: process.version,
      trustProxy: config.trustProxy,
    },
    osu: upstream,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/auth/status', async (req, res) => {
  const session = await ensureFreshSession(req, res);
  if (!session) {
    return res.json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    expires_at: Date.now() + (session.expires_in ?? 0) * 1000,
  });
});

app.get('/api/auth/login', (_req, res) => {
  if (!config.isConfigured) {
    return res.status(503).json({
      error: 'oauth_not_configured',
      message:
        'The server is missing OSU_CLIENT_ID or OSU_CLIENT_SECRET. Update server/.env (or the Render dashboard) and restart.',
    });
  }
  const state = generateState();
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: COOKIE_SAMESITE,
    secure: COOKIE_SECURE,
    maxAge: 10 * 60 * 1000,
    path: '/',
  });
  const params = new URLSearchParams({
    client_id: String(config.clientId),
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: SCOPES,
    state,
  });
  const url = `https://osu.ppy.sh/oauth/authorize?${params.toString()}`;
  if (VERBOSE_LOGGING) {
    console.log(`[osu!Hub] /api/auth/login -> redirecting to osu! (state ${state.slice(0, 8)}…)`);
  }
  res.redirect(url);
});

app.get('/api/auth/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    console.warn(`[osu!Hub] osu! returned error on callback: ${oauthError}`);
    const target = `${config.frontendOrigin}/auth/callback?error=${encodeURIComponent(String(oauthError))}`;
    return res.redirect(target);
  }

  const expectedState = req.cookies?.[STATE_COOKIE];
  if (!state || !expectedState || state !== expectedState) {
    console.warn('[osu!Hub] callback state mismatch');
    const target = `${config.frontendOrigin}/auth/callback?error=${encodeURIComponent('state_mismatch')}`;
    return res.redirect(target);
  }

  if (!code) {
    const target = `${config.frontendOrigin}/auth/callback?error=${encodeURIComponent('missing_code')}`;
    return res.redirect(target);
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    setSessionCookie(res, tokens);
    res.clearCookie(STATE_COOKIE, { path: '/' });
    console.log(`[osu!Hub] login success (session expires in ${tokens.expires_in}s)`);
    res.redirect(`${config.frontendOrigin}/auth/callback?status=ok`);
  } catch (err) {
    logOsuError('token exchange', err);
    res.redirect(
      `${config.frontendOrigin}/auth/callback?error=${encodeURIComponent('token_exchange_failed')}`
    );
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', async (req, res) => {
  const session = await ensureFreshSession(req, res);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }
  try {
    const me = await fetchOsuMe(session.access_token);
    res.json({ authenticated: true, profile: normalizeProfile(me) });
  } catch (err) {
    logOsuError('/me', err);
    res.status(502).json({
      authenticated: false,
      error: 'upstream_error',
      message: 'Failed to load profile from osu!. Please try signing in again.',
    });
  }
});

app.use('/api/osu', async (req, res) => {
  const session = await ensureFreshSession(req, res);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }
  const upstreamPath = req.originalUrl.replace(/^\/api\/osu/, '');
  try {
    const upstream = await fetch(`https://osu.ppy.sh/api/v2${upstreamPath}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        Accept: 'application/json',
      },
    });
    const body = await upstream.text();
    res
      .status(upstream.status)
      .type(upstream.headers.get('content-type') ?? 'application/json')
      .send(body);
  } catch (err) {
    logOsuError('osu proxy', err);
    res.status(502).json({ error: 'upstream_error' });
  }
});

if (config.isProduction && process.env.SERVE_STATIC === 'true') {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Unknown API route' });
});

app.use((err, _req, res, _next) => {
  console.error('[osu!Hub] request error:', err?.message ?? err);
  res.status(500).json({ error: 'server_error', message: err?.message ?? 'Unknown error' });
});

const server = app.listen(config.port, () => {
  const env = config.isProduction ? 'production' : 'development';
  console.log(
    `[osu!Hub] listening on port ${config.port} (env=${env}, configured=${config.isConfigured})`
  );
  console.log(`[osu!Hub] health:   /api/health`);

  console.log(`[osu!Hub] oauth cb: ${config.redirectUri}`);
  if (!config.isConfigured) {
    console.log('[osu!Hub] /api/auth/login will return 503 until OSU_CLIENT_ID and OSU_CLIENT_SECRET are set.');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[osu!Hub] FATAL: port ${config.port} is already in use.`
    );
    console.error(
      '         Stop the other process (e.g. `taskkill /F /IM node.exe` on Windows)'
    );
    process.exit(1);
  } else {
    console.error('[osu!Hub] server error:', err.message ?? err);
  }
});