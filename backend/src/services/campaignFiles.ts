import { mkdir, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  CampaignCustomType,
  CampaignEventMode,
  CampaignBattle,
  CampaignCycle,
  CampaignCycleAction,
  CampaignCycleEvent,
  CampaignDocument,
  CampaignIndex,
  CampaignIndexItem,
  CampaignMeta,
  CampaignNames,
  CampaignPlayer,
  CampaignStatus,
  CampaignTerritory,
  CampaignTypes,
} from '../../../shared/campaign.ts';
import { normalizeRoster, slugify, type Roster } from '../../../shared/roster.ts';
import { readRoster, saveRoster } from './rosterFiles.ts';

const INDEX = 'index.json';
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isSafeId(id: string): boolean {
  return SAFE_ID.test(id);
}

function assertId(id: string): void {
  if (!isSafeId(id)) throw new Error('Некорректный id');
}

function campaignDir(root: string, id: string): string {
  assertId(id);
  return join(root, id);
}

function rosterDir(root: string, id: string): string {
  return join(campaignDir(root, id), 'rosters');
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function text(value: unknown, max = 200): string {
  return String(value ?? '').trim().slice(0, max);
}

function whole(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function statusOf(value: unknown): CampaignStatus {
  return value === 'finished' ? 'finished' : 'active';
}

function emptyMeta(id: string, name: string): CampaignMeta {
  return {
    id,
    name: name || 'Кампания',
    occupation: 3,
    downtime: 1,
    takeover: 3,
    liveCycle: 1,
    eventMode: 'full',
    status: 'active',
    updatedAt: today(),
  };
}

export function emptyDocument(id: string, name: string): CampaignDocument {
  return {
    campaign: emptyMeta(id, name),
    players: [],
    territories: [],
    types: { disabled: [], custom: [] },
    names: {},
    cycles: [],
  };
}

function normalizePlayer(raw: Partial<CampaignPlayer>): CampaignPlayer | null {
  const id = text(raw.id, 40);
  if (!isSafeId(id)) return null;
  return {
    id,
    name: text(raw.name, 80),
    gangName: text(raw.gangName, 80),
    rosterFile: text(raw.rosterFile, 80),
    sourceRosterFile: text(raw.sourceRosterFile, 80),
    reputation: whole(raw.reputation, 1, 99, 1),
    rating: whole(raw.rating, 0, 1_000_000, 0),
    wealth: whole(raw.wealth, 0, 1_000_000, 0),
    battles: whole(raw.battles, 0, 10_000, 0),
    ooa: whole(raw.ooa, 0, 10_000, 0),
  };
}

function normalizeTerritory(raw: Partial<CampaignTerritory>): CampaignTerritory | null {
  const id = text(raw.id, 40);
  if (!isSafeId(id)) return null;
  const status = text(raw.status, 20);
  return {
    id,
    name: text(raw.name, 80),
    kind: text(raw.kind, 80),
    status: status === 'owned' || status === 'staked' ? status : 'uncontrolled',
    ownerId: text(raw.ownerId, 40),
  };
}

function normalizeCustom(raw: Partial<CampaignCustomType>): CampaignCustomType | null {
  const id = text(raw.id, 40);
  if (!isSafeId(id)) return null;
  const income = raw.income === '' || raw.income == null ? '' : whole(raw.income, 0, 10_000, 0);
  return {
    id,
    name: text(raw.name, 80),
    income,
    extras: text(raw.extras, 500),
  };
}

function normalizeTypes(raw: Partial<CampaignTypes> | undefined): CampaignTypes {
  const disabled = Array.isArray(raw?.disabled)
    ? raw.disabled.map((id) => text(id, 80)).filter((id) => isSafeId(id))
    : [];
  const custom = Array.isArray(raw?.custom)
    ? raw.custom.map((item) => normalizeCustom(item)).filter((item): item is CampaignCustomType => !!item)
    : [];
  return { disabled, custom };
}

function normalizeNames(raw: CampaignNames | undefined): CampaignNames {
  const names: CampaignNames = {};
  if (!raw || typeof raw !== 'object') return names;
  for (const [kind, list] of Object.entries(raw)) {
    const key = text(kind, 80);
    if (!isSafeId(key) || !Array.isArray(list)) continue;
    const seen = new Set<string>();
    names[key] = [];
    for (const item of list) {
      const name = text(item, 80);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names[key].push(name);
    }
  }
  return names;
}

function normalizeEvent(raw: Partial<CampaignCycleEvent>): CampaignCycleEvent | null {
  const playerId = text(raw.playerId, 40);
  if (!isSafeId(playerId)) return null;
  return {
    playerId,
    targetId: text(raw.targetId, 40),
    stakeId: text(raw.stakeId, 40),
    challenge: text(raw.challenge, 20),
    opponentId: text(raw.opponentId, 40),
    result: text(raw.result, 20),
    ooa: whole(raw.ooa, 0, 100, 0),
    sideJob: Boolean(raw.sideJob),
    notes: text(raw.notes, 400),
    stakePriorId: text(raw.stakePriorId, 40),
    stakePriorStatus: text(raw.stakePriorStatus, 20),
    stakePriorOwnerId: text(raw.stakePriorOwnerId, 40),
  };
}

function idOrEmpty(value: unknown): string {
  const id = text(value, 40);
  return isSafeId(id) ? id : '';
}

function normalizeBattle(raw: Partial<CampaignBattle>): CampaignBattle | null {
  const id = text(raw.id, 40);
  if (!isSafeId(id)) return null;
  return {
    id,
    challengerId: idOrEmpty(raw.challengerId),
    responderId: idOrEmpty(raw.responderId),
    stakeId: idOrEmpty(raw.stakeId),
    challenge: text(raw.challenge, 20),
    result: text(raw.result, 20),
    challengerOoa: whole(raw.challengerOoa, 0, 100, 0),
    responderOoa: whole(raw.responderOoa, 0, 100, 0),
    challengerSideJob: Boolean(raw.challengerSideJob),
    responderSideJob: Boolean(raw.responderSideJob),
    challengerNotes: text(raw.challengerNotes, 400),
    responderNotes: text(raw.responderNotes, 400),
    stakePriorId: text(raw.stakePriorId, 40),
    stakePriorStatus: text(raw.stakePriorStatus, 20),
    stakePriorOwnerId: text(raw.stakePriorOwnerId, 40),
  };
}

function normalizeAction(raw: Partial<CampaignCycleAction>): CampaignCycleAction | null {
  const id = text(raw.id, 40);
  const playerId = text(raw.playerId, 40);
  if (!isSafeId(id) || !isSafeId(playerId)) return null;
  return {
    id,
    playerId,
    fighter: text(raw.fighter, 80),
    action: text(raw.action, 40),
  };
}

function normalizeCycle(raw: Partial<CampaignCycle>): CampaignCycle | null {
  const cycle = whole(raw.cycle, 1, 99, 0);
  if (!cycle) return null;
  const events = Array.isArray(raw.events)
    ? raw.events.map((item) => normalizeEvent(item)).filter((item): item is CampaignCycleEvent => !!item)
    : [];
  const actions = Array.isArray(raw.actions)
    ? raw.actions.map((item) => normalizeAction(item)).filter((item): item is CampaignCycleAction => !!item)
    : [];
  const battles = Array.isArray(raw.battles)
    ? raw.battles.map((item) => normalizeBattle(item)).filter((item): item is CampaignBattle => !!item)
    : [];
  if (!events.length && !actions.length && !battles.length) return null;
  return { cycle, events, actions, battles };
}

function eventModeOf(meta: Partial<CampaignMeta>, cycles: unknown): CampaignEventMode {
  if (meta.eventMode === 'short' || meta.eventMode === 'full') return meta.eventMode;
  const list = Array.isArray(cycles) ? cycles : [];
  const legacyShort = list.some((cycle) => !!cycle && (cycle as { mode?: string }).mode === 'short');
  return legacyShort ? 'short' : 'full';
}

export function normalizeDocument(raw: Partial<CampaignDocument>, id: string): CampaignDocument {
  const meta: Partial<CampaignMeta> = raw.campaign ?? {};
  const base = emptyDocument(id, text(meta.name, 80) || 'Кампания');
  base.campaign = {
    id,
    name: text(meta.name, 80) || 'Кампания',
    occupation: whole(meta.occupation, 0, 12, 3),
    downtime: whole(meta.downtime, 0, 6, 1),
    takeover: whole(meta.takeover, 0, 12, 3),
    liveCycle: whole(meta.liveCycle, 1, 99, 1),
    eventMode: eventModeOf(meta, raw.cycles),
    status: statusOf(meta.status),
    updatedAt: today(),
  };
  if (base.campaign.occupation + base.campaign.downtime + base.campaign.takeover < 1) {
    base.campaign.occupation = 1;
  }
  base.players = Array.isArray(raw.players)
    ? raw.players.map((item) => normalizePlayer(item)).filter((item): item is CampaignPlayer => !!item)
    : [];
  base.territories = Array.isArray(raw.territories)
    ? raw.territories.map((item) => normalizeTerritory(item)).filter((item): item is CampaignTerritory => !!item)
    : [];
  base.types = normalizeTypes(raw.types);
  base.names = normalizeNames(raw.names);
  const cycles = Array.isArray(raw.cycles)
    ? raw.cycles.map((item) => normalizeCycle(item)).filter((item): item is CampaignCycle => !!item)
    : [];
  const seen = new Set<number>();
  base.cycles = cycles.filter((cycle) => {
    if (seen.has(cycle.cycle)) return false;
    seen.add(cycle.cycle);
    return true;
  });
  return base;
}

function toIndexItem(doc: CampaignDocument): CampaignIndexItem {
  return {
    id: doc.campaign.id,
    name: doc.campaign.name,
    status: doc.campaign.status,
    liveCycle: doc.campaign.liveCycle,
    players: doc.players.length,
    updatedAt: doc.campaign.updatedAt,
  };
}

async function writeCycles(dir: string, cycles: CampaignCycle[]): Promise<void> {
  const cycleDir = join(dir, 'cycles');
  await mkdir(cycleDir, { recursive: true });
  const keep = new Set(cycles.map((cycle) => `${cycle.cycle}.json`));
  const existing = await readdir(cycleDir).catch(() => [] as string[]);
  for (const name of existing) {
    if (name.endsWith('.json') && !keep.has(name)) {
      await unlink(join(cycleDir, name)).catch(() => undefined);
    }
  }
  for (const cycle of cycles) {
    await writeJson(join(cycleDir, `${cycle.cycle}.json`), cycle);
  }
}

export async function writeDocument(root: string, doc: CampaignDocument): Promise<void> {
  const dir = campaignDir(root, doc.campaign.id);
  await mkdir(dir, { recursive: true });
  await mkdir(rosterDir(root, doc.campaign.id), { recursive: true });
  await writeJson(join(dir, 'campaign.json'), doc.campaign);
  await writeJson(join(dir, 'players.json'), doc.players);
  await writeJson(join(dir, 'territories.json'), doc.territories);
  await writeJson(join(dir, 'types.json'), doc.types);
  await writeJson(join(dir, 'names.json'), doc.names);
  await writeCycles(dir, doc.cycles);
  await rebuildCampaignIndex(root);
}

async function readCycles(dir: string): Promise<CampaignCycle[]> {
  const cycleDir = join(dir, 'cycles');
  const names = (await readdir(cycleDir).catch(() => [] as string[])).filter((name) => /^\d+\.json$/.test(name));
  const cycles: CampaignCycle[] = [];
  for (const name of names) {
    const raw = await readJson<Partial<CampaignCycle>>(join(cycleDir, name), {});
    const cycle = normalizeCycle(raw);
    if (cycle) cycles.push(cycle);
  }
  cycles.sort((a, b) => a.cycle - b.cycle);
  return cycles;
}

export async function readDocument(root: string, id: string): Promise<CampaignDocument | null> {
  if (!isSafeId(id)) return null;
  const dir = campaignDir(root, id);
  const meta = await readJson<Partial<CampaignMeta> | null>(join(dir, 'campaign.json'), null);
  if (!meta || !meta.id) return null;
  const doc = normalizeDocument(
    {
      campaign: { ...emptyMeta(id, ''), ...meta, id },
      players: await readJson(join(dir, 'players.json'), []),
      territories: await readJson(join(dir, 'territories.json'), []),
      types: await readJson(join(dir, 'types.json'), { disabled: [], custom: [] }),
      names: await readJson(join(dir, 'names.json'), {}),
      cycles: await readCycles(dir),
    },
    id,
  );
  return doc;
}

export async function rebuildCampaignIndex(root: string): Promise<CampaignIndex> {
  await mkdir(root, { recursive: true });
  const entries = await readdir(root, { withFileTypes: true });
  const campaigns: CampaignIndexItem[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !isSafeId(entry.name)) continue;
    const doc = await readDocument(root, entry.name);
    if (doc) campaigns.push(toIndexItem(doc));
  }
  campaigns.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const index: CampaignIndex = { campaigns };
  await writeJson(join(root, INDEX), index);
  return index;
}

export async function listCampaigns(root: string): Promise<CampaignIndex> {
  return rebuildCampaignIndex(root);
}

async function uniqueId(root: string, base: string): Promise<string> {
  let id = base || 'campaign';
  let n = 2;
  while (await readDocument(root, id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

export async function createCampaign(root: string, raw: Partial<CampaignDocument>): Promise<CampaignDocument> {
  const name = text(raw.campaign?.name, 80) || 'Кампания';
  const id = await uniqueId(root, slugify(name));
  const doc = normalizeDocument(
    {
      ...raw,
      campaign: {
        ...emptyMeta(id, name),
        ...raw.campaign,
        name,
        id,
        status: 'active',
      },
    },
    id,
  );
  doc.campaign.status = 'active';
  await writeDocument(root, doc);
  return doc;
}

export async function saveCampaign(root: string, id: string, raw: Partial<CampaignDocument>): Promise<CampaignDocument | null> {
  const existing = await readDocument(root, id);
  if (!existing) return null;
  const doc = normalizeDocument(raw, id);
  if (existing.campaign.status === 'finished') doc.campaign.status = 'finished';
  await writeDocument(root, doc);
  return doc;
}

export async function finishCampaign(root: string, id: string): Promise<CampaignDocument | null> {
  const doc = await readDocument(root, id);
  if (!doc) return null;
  doc.campaign.status = 'finished';
  doc.campaign.updatedAt = today();
  await writeDocument(root, doc);
  return doc;
}

export async function deleteCampaign(root: string, id: string): Promise<CampaignIndex | null> {
  if (!isSafeId(id)) return null;
  await rm(campaignDir(root, id), { recursive: true, force: true });
  return rebuildCampaignIndex(root);
}

export async function copyLibraryRoster(
  libraryDir: string,
  sourceFile: string,
  root: string,
  campaignId: string,
  playerId: string,
): Promise<{ file: string; roster: Roster } | null> {
  if (!isSafeId(campaignId) || !isSafeId(playerId)) return null;
  const campaign = await readDocument(root, campaignId);
  if (!campaign || campaign.campaign.status === 'finished') return null;
  const source = await readRoster(libraryDir, sourceFile);
  if (!source) return null;
  const roster = normalizeRoster(source);
  roster.id = playerId;
  roster.updatedAt = today();
  const file = `${playerId}.json`;
  const dir = rosterDir(root, campaignId);
  await mkdir(dir, { recursive: true });
  await writeJson(join(dir, file), roster);
  return { file, roster };
}

export async function publishRoster(
  libraryDir: string,
  root: string,
  campaignId: string,
  file: string,
): Promise<{ file: string; roster: Roster } | null> {
  const campaign = await readDocument(root, campaignId);
  if (!campaign || campaign.campaign.status !== 'finished') return null;
  const source = await readRoster(rosterDir(root, campaignId), file);
  if (!source) return null;
  const base = slugify(source.name || source.id || 'roster');
  let id = base;
  let n = 2;
  while (await readRoster(libraryDir, `${id}.json`)) {
    id = slugify(`${base}-${n}`);
    n += 1;
  }
  const roster = normalizeRoster(source);
  roster.id = id;
  const saved = await saveRoster(libraryDir, roster);
  return { file: saved.file, roster: saved.roster };
}

export function campaignRosterDir(root: string, id: string): string | null {
  if (!isSafeId(id)) return null;
  return rosterDir(root, id);
}
