import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { rosterRouter } from './routes/rosters.ts';
import { rebuildIndex } from './services/rosterFiles.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FRONTEND_DIST = join(ROOT, 'frontend', 'dist');
const ROSTERS = join(ROOT, 'rosters');
const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = Number(process.env.PORT ?? 8000);
const VITE = process.env.VITE_URL ?? 'http://127.0.0.1:5173';
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
app.use('/api/rosters', rosterRouter(ROSTERS));

app.use('/pages', express.static(join(ROOT, 'pages')));
app.use('/data', express.static(join(ROOT, 'data')));
app.use('/frontend/dist', express.static(FRONTEND_DIST));
if (existsSync(join(FRONTEND_DIST, 'index.html'))) {
  app.use('/roster', express.static(FRONTEND_DIST));
}
app.get('/favicon.svg', (_req, res) => {
  res.sendFile(join(ROOT, 'pages', 'favicon.svg'));
});
app.get('/', (_req, res) => {
  res.sendFile(join(ROOT, 'index.html'));
});
app.get('/index.html', (_req, res) => {
  res.redirect(301, '/');
});

if (!isProd) {
  const viteProxy = createProxyMiddleware({
    target: VITE,
    changeOrigin: true,
    ws: true,
    pathFilter: (path) =>
      (path === '/roster' || path.startsWith('/roster/')) &&
      !existsSync(join(FRONTEND_DIST, 'index.html')),
  });
  app.use(viteProxy);
}

app.listen(PORT, HOST, async () => {
  await rebuildIndex(ROSTERS);
  const local = HOST === '0.0.0.0' ? '127.0.0.1' : HOST;
  console.log(`Справочник:  http://${local}:${PORT}/`);
  console.log(`Ростеры:     http://${local}:${PORT}/pages/roster-builder.html`);
  if (HOST === '0.0.0.0') {
    console.log(`По сети:     http://<этот-ПК>:${PORT}/`);
  }
  console.log(`Папка JSON:  ${ROSTERS}`);
  if (!isProd) {
    console.log(`Vite (HMR):  ${VITE}/`);
  }
});
