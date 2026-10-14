import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import handler from './api/index.ts';

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          try {
            await handler(req as any, res as any);
          } catch (err) {
            next(err);
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
});
