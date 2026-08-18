import { Router } from 'express';
import {
  deleteRoster,
  readRoster,
  rebuildIndex,
  saveRoster,
} from '../services/rosterFiles.ts';

export function rosterRouter(rostersDir: string): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await rebuildIndex(rostersDir));
  });

  router.get('/:file', async (req, res) => {
    const roster = await readRoster(rostersDir, req.params.file);
    if (!roster) {
      res.status(404).json({ error: 'Ростер не найден' });
      return;
    }
    res.json(roster);
  });

  router.put('/', async (req, res) => {
    try {
      const saved = await saveRoster(rostersDir, req.body ?? {});
      res.json({ ok: true, ...saved });
    } catch {
      res.status(400).json({ error: 'Некорректный JSON ростера' });
    }
  });

  router.delete('/:file', async (req, res) => {
    const index = await deleteRoster(rostersDir, req.params.file);
    if (!index) {
      res.status(400).json({ error: 'Некорректное имя файла' });
      return;
    }
    res.json({ ok: true, index });
  });

  return router;
}
