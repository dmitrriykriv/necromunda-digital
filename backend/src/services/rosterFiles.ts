import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Roster, RosterIndex } from '../../../shared/roster.ts';
import { normalizeRoster, slugify, toIndexItem } from '../../../shared/roster.ts';

const INDEX = 'index.json';

function isRosterFile(name: string): boolean {
  return name.endsWith('.json') && name !== INDEX && !name.includes('..');
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function rebuildIndex(dir: string): Promise<RosterIndex> {
  await ensureDir(dir);
  const names = (await readdir(dir)).filter(isRosterFile).sort();
  const rosters = [];
  for (const name of names) {
    try {
      const raw = JSON.parse(await readFile(join(dir, name), 'utf8')) as Partial<Roster>;
      rosters.push(toIndexItem(normalizeRoster(raw), name));
    } catch {
      continue;
    }
  }
  const index: RosterIndex = { rosters };
  await writeFile(join(dir, INDEX), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

export async function readRoster(dir: string, file: string): Promise<Roster | null> {
  if (!isRosterFile(file)) return null;
  try {
    const raw = JSON.parse(await readFile(join(dir, file), 'utf8')) as Partial<Roster>;
    return normalizeRoster(raw);
  } catch {
    return null;
  }
}

export async function saveRoster(
  dir: string,
  incoming: Partial<Roster>,
): Promise<{ roster: Roster; file: string; index: RosterIndex }> {
  const roster = normalizeRoster(incoming);
  roster.id = slugify(roster.id || roster.name || 'roster');
  roster.updatedAt = new Date().toISOString().slice(0, 10);
  roster.factionName = roster.factionName || roster.faction;
  const file = `${roster.id}.json`;
  await ensureDir(dir);
  await writeFile(join(dir, file), `${JSON.stringify(roster, null, 2)}\n`, 'utf8');
  const index = await rebuildIndex(dir);
  return { roster, file, index };
}

export async function deleteRoster(dir: string, file: string): Promise<RosterIndex | null> {
  if (!isRosterFile(file)) return null;
  try {
    await unlink(join(dir, file));
  } catch {
    /* already gone */
  }
  return rebuildIndex(dir);
}
