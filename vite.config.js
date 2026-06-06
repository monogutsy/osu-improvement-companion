import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const authApiUrl = env.VITE_AUTH_API_URL ?? '';
  const isDev = mode !== 'production' && mode !== 'preview';
  const isProduction = mode === 'production';

  const proxyTarget = (() => {
    if (!isDev) return undefined;
    try {
      const url = new URL(authApiUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      return 'http://localhost:4000';
    }
  })();

  return {
    plugins: [react()],
    envDir: './src',
    build: {
      sourcemap: !isProduction,
      chunkSizeWarningLimit: 800,
    },
    server: isDev
      ? {
          port: 5173,
          strictPort: true,
          proxy: proxyTarget
            ? {
                '/api': {
                  target: proxyTarget,
                  changeOrigin: true,
                  secure: false,
                },
              }
            : undefined,
        }
      : undefined,
    preview: {
      port: 5173,
      strictPort: true,
    },
  };
});
