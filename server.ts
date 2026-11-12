import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createAppServer } from './src/server/createAppServer';
import { initPostgres } from './src/server/db';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  await initPostgres();

  const { app, server } = createAppServer();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MAFIA PRO server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
