import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const publicEnv = loadEnv(mode, process.cwd(), 'VITE_');
  for (const [key,value] of Object.entries(publicEnv)) {
    let privileged = value.startsWith('sb_secret_');
    if (value.split('.').length === 3) {
      try { privileged ||= JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role === 'service_role'; } catch { /* Not a JWT. */ }
    }
    if (privileged || /SECRET|SERVICE_ROLE|PRIVATE_KEY/i.test(key)) throw new Error(`Private credential must not be exposed through ${key}`);
  }
  return {
    base: './',
    publicDir: mode === 'verifier' ? false : 'public',
    define: {
      __GAME_DEV_TOOLS__: JSON.stringify(command === 'serve'),
      __RANKING_VERIFIER__: JSON.stringify(mode === 'verifier'),
    },
    server: {
      host: true,
      port: 5201,
      open: false,
      watch: { ignored: ['**/dist-verifier/**', '**/outputs/**'] }
    },
    build: {
      rollupOptions: { input: { main: 'index.html', authConfirm: 'auth-confirm.html', authGoogle: 'auth-google.html', authMicrosoft: 'auth-microsoft.html' } },
      outDir: mode === 'verifier' ? 'dist-verifier' : 'dist',
      sourcemap: false,
      target: 'es2020',
      chunkSizeWarningLimit: 2000
    }
  };
});
