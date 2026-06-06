const RAW_AUTH_URL = import.meta.env.VITE_AUTH_API_URL ?? '';
const RAW_CLIENT_ID = import.meta.env.VITE_OSU_CLIENT_ID ?? '';

const warnings = [];
const errors = [];

if (!RAW_AUTH_URL) {
  errors.push({
    field: 'VITE_AUTH_API_URL',
    message: 'Missing VITE_AUTH_API_URL. The frontend cannot reach the auth server without it.',
  });
} else {
  try {
    const url = new URL(RAW_AUTH_URL);
    if (!['http:', 'https:'].includes(url.protocol)) {
      errors.push({
        field: 'VITE_AUTH_API_URL',
        message: `VITE_AUTH_API_URL must be http:// or https:// (got "${url.protocol}")`,
      });
    }
  } catch {
    errors.push({
      field: 'VITE_AUTH_API_URL',
      message: `VITE_AUTH_API_URL is not a valid URL: "${RAW_AUTH_URL}"`,
    });
  }
}

if (!RAW_CLIENT_ID) {
  warnings.push({
    field: 'VITE_OSU_CLIENT_ID',
    message: 'VITE_OSU_CLIENT_ID is not set. The UI will still work, but we cannot tell the user which osu! app is requesting authorization.',
  });
} else if (!/^\d+$/.test(RAW_CLIENT_ID)) {
  warnings.push({
    field: 'VITE_OSU_CLIENT_ID',
    message: `VITE_OSU_CLIENT_ID should be a numeric id (got "${RAW_CLIENT_ID.slice(0, 6)}…").`,
  });
}

export const frontendConfig = Object.freeze({
  authApiUrl: RAW_AUTH_URL.replace(/\/$/, ''),
  osuClientId: RAW_CLIENT_ID,
  envLoaded: true,
  errors,
  warnings,
  hasIssues: errors.length > 0 || warnings.length > 0,
});

export function logFrontendConfig() {
  if (typeof window === 'undefined') return;
  if (errors.length) {
    console.groupCollapsed('%c[osu!Hub] frontend configuration has errors', 'color:#ff6384;font-weight:bold');
    errors.forEach((e) => console.error(`✗ ${e.field}: ${e.message}`));
    console.groupEnd();
  } else if (warnings.length) {
    console.groupCollapsed('[osu!Hub] frontend configuration warnings');
    warnings.forEach((w) => console.warn(`! ${w.field}: ${w.message}`));
    console.groupEnd();
  } else {
    console.log(
      `%c[osu!Hub]%c frontend config OK → auth API: ${frontendConfig.authApiUrl}`,
      'color:#b060ff;font-weight:bold',
      'color:inherit'
    );
  }
}