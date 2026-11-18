import { Router } from 'express';
import { deleteRoster, readRoster, rebuildIndex, saveRoster } from '../services/rosterFiles.ts';
import {
  campaignRosterDir,
  copyLibraryRoster,
  createCampaign,
  deleteCampaign,
  finishCampaign,
  listCampaigns,
  publishRoster,
  readDocument,
  saveCampaign,
} from '../services/campaignFiles.ts';

export function campaignRouter(root: string, libraryDir: string): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await listCampaigns(root));
  });

  router.post('/', async (req, res) => {
    const doc = await createCampaign(root, req.body ?? {});
    const index = await listCampaigns(root);
    res.status(201).json({ document: doc, index });
  });

  router.get('/:id/rosters', async (req, res) => {
    const dir = campaignRosterDir(root, req.params.id);
    if (!dir || !(await readDocument(root, req.params.id))) {
      res.status(404).json({ error: 'Кампания не найдена' });
      return;
    }
    res.json(await rebuildIndex(dir));
  });

  router.get('/:id/rosters/:file', async (req, res) => {
    const dir = campaignRosterDir(root, req.params.id);
    if (!dir) {
      res.status(404).json({ error: 'Кампания не найдена' });
      return;
    }
    const roster = await readRoster(dir, req.params.file);
    if (!roster) {
      res.status(404).json({ error: 'Ростер не найден' });
      return;
    }
    res.json(roster);
  });

  router.put('/:id/rosters', async (req, res) => {
    const dir = campaignRosterDir(root, req.params.id);
    if (!dir || !(await readDocument(root, req.params.id))) {
      res.status(404).json({ error: 'Кампания не найдена' });
      return;
    }
    try {
      const saved = await saveRoster(dir, req.body ?? {});
      res.json({ ok: true, ...saved });
    } catch {
      res.status(400).json({ error: 'Некорректный JSON ростера' });
    }
  });

  router.delete('/:id/rosters/:file', async (req, res) => {
    const dir = campaignRosterDir(root, req.params.id);
    if (!dir) {
      res.status(404).json({ error: 'Кампания не найдена' });
      return;
    }
    const index = await deleteRoster(dir, req.params.file);
    if (!index) {
      res.status(400).json({ error: 'Некорректное имя файла' });
      return;
    }
    res.json({ ok: true, index });
  });

  router.post('/:id/rosters/:file/publish', async (req, res) => {
    const published = await publishRoster(libraryDir, root, req.params.id, req.params.file);
    if (!published) {
      res.status(400).json({ error: 'Ростер можно вернуть в общие только из завершённой кампании' });
      return;
    }
    res.json({ ok: true, ...published });
  });

  router.post('/:id/players/:playerId/roster', async (req, res) => {
    const copied = await copyLibraryRoster(
      libraryDir,
      String(req.body?.sourceFile ?? ''),
      root,
      req.params.id,
      req.params.playerId,
    );
    if (!copied) {
      res.status(400).json({ error: 'Не удалось скопировать ростер в кампанию' });
      return;
    }
    res.json({ ok: true, ...copied });
  });

  router.post('/:id/finish', async (req, res) => {
    const doc = await finishCampaign(root, req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Кампания не найдена' });
      return;
    }
    const index = await listCampaigns(root);
    res.json({ document: doc, index });
  });

  router.get('/:id', async (req, res) => {
    const doc = await readDocument(root, req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Кампания не найдена' });
      return;
    }
    res.json(doc);
  });

  router.put('/:id', async (req, res) => {
    const doc = await saveCampaign(root, req.params.id, req.body ?? {});
    if (!doc) {
      res.status(404).json({ error: 'Кампания не найдена' });
      return;
    }
    const index = await listCampaigns(root);
    res.json({ document: doc, index });
  });

  router.delete('/:id', async (req, res) => {
    const index = await deleteCampaign(root, req.params.id);
    if (!index) {
      res.status(400).json({ error: 'Некорректный id' });
      return;
    }
    res.json({ ok: true, index });
  });

  return router;
}
