export type Equipment = {
  name: string;
  cost: number;
  slots: number;
  extras?: string[];
};

export type Fighter = {
  id: string;
  name: string;
  type: string;
  subtypes: string[];
  xp: number;
  baseCost: number;
  skills: string[];
  equipment: Equipment[];
};

export type Roster = {
  id: string;
  name: string;
  faction: string;
  factionName: string;
  notes: string;
  reputation: number;
  stash: number;
  fighters: Fighter[];
  updatedAt: string;
};

export type RosterIndexItem = {
  file: string;
  id: string;
  name: string;
  faction: string;
  factionName: string;
  rating: number;
};

export type RosterIndex = {
  rosters: RosterIndexItem[];
};

export type Faction = {
  id: string;
  name: string;
};

export const FACTIONS: Faction[] = [
  { id: '', name: '— выберите банду —' },
  { id: 'house-cawdor', name: 'Дом Каудор' },
  { id: 'house-delaque', name: 'Дом Делак' },
  { id: 'house-escher', name: 'Дом Эшер' },
  { id: 'house-goliath', name: 'Дом Голиаф' },
  { id: 'house-orlock', name: 'Дом Орлок' },
  { id: 'house-van-saar', name: 'Дом Ван Саар' },
  { id: 'blades-of-the-matriarch', name: 'Клинки Матриарха' },
  { id: 'forge-smelters', name: 'Плавильщики кузниц' },
  { id: 'chaos-helot-cult', name: 'Культ хаоситских илотов' },
  { id: 'corpse-grinder-cult', name: 'Культ Трупорезов' },
  { id: 'genestealer-cult', name: 'Культ генокрадов' },
  { id: 'malstrain', name: 'Мальстрейн' },
  { id: 'ash-waste-nomad', name: 'Кочевники Пепельных пустошей' },
  { id: 'free-ogryn', name: 'Свободные огрины' },
  { id: 'ironhead-squat', name: 'Сквоты Айронхед' },
  { id: 'outcast', name: 'Изгои' },
  { id: 'palanite-enforcer', name: 'Паланитские энфорсеры' },
  { id: 'spyre-hunting', name: 'Охотники Шпиля' },
  { id: 'venator', name: 'Венаторы' },
];

const RESTRICTED = /Champion|Brute|Hanger-on/i;
const LEADER = /Leader/i;
const PET = /\bPet\b/i;
const FOUNDING_BUDGET = 1000;
const WEAPON_SLOT_MAX = 3;

/** Gang lists that replace the core Champion/Brute/Hanger-on ratio. */
const SKIP_RATIO = new Set([
  'blades-of-the-matriarch',
  'forge-smelters',
  'spyre-hunting',
]);

/** Gang lists that also skip the single-Leader requirement. */
const SKIP_LEADER = new Set(['blades-of-the-matriarch', 'forge-smelters']);

const CYRILLIC: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'j',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function emptyRoster(): Roster {
  return {
    id: '',
    name: '',
    faction: '',
    factionName: '',
    notes: '',
    reputation: 1,
    stash: FOUNDING_BUDGET,
    fighters: [],
    updatedAt: '',
  };
}

export function emptyFighter(isLeader: boolean): Fighter {
  return {
    id: uid('f'),
    name: '',
    type: '',
    subtypes: isLeader ? ['Leader'] : ['Ganger'],
    xp: 0,
    baseCost: 0,
    skills: [],
    equipment: [],
  };
}

export function emptyGear(kind: 'weapon' | 'wargear' = 'weapon'): Equipment {
  return { name: '', cost: 0, slots: kind === 'weapon' ? 1 : 0, extras: [] };
}

export function cloneFighter(fighter: Fighter): Fighter {
  return {
    ...fighter,
    id: uid('f'),
    subtypes: [...fighter.subtypes],
    skills: [...fighter.skills],
    equipment: fighter.equipment.map((item) => ({
      ...item,
      extras: item.extras ? [...item.extras] : [],
    })),
  };
}

export function copyRosterName(name: string): string {
  const base = (name || '').trim() || 'Ростер';
  const match = /^(.*) \(копия(?: (\d+))?\)$/.exec(base);
  if (!match) return `${base} (копия)`;
  const n = match[2] ? Number(match[2]) + 1 : 2;
  return `${match[1]} (копия ${n})`;
}

export function cloneRoster(roster: Roster): Roster {
  const name = copyRosterName(roster.name);
  const stem = slugify(roster.id || roster.name || 'roster').slice(0, 48);
  return {
    ...roster,
    id: `${stem}-${uid('c')}`,
    name,
    fighters: (roster.fighters ?? []).map(cloneFighter),
    updatedAt: '',
  };
}

export function uid(prefix = 'f'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function factionName(id: string): string {
  return FACTIONS.find((item) => item.id === id)?.name ?? '';
}

export function fighterCost(fighter: Fighter): number {
  const gear = (fighter.equipment ?? []).reduce(
    (sum, item) => sum + (Number(item.cost) || 0),
    0,
  );
  return (Number(fighter.baseCost) || 0) + gear;
}

export function gangRating(roster: Pick<Roster, 'fighters'>): number {
  return (roster.fighters ?? []).reduce((sum, fighter) => sum + fighterCost(fighter), 0);
}

export function gangWealth(roster: Pick<Roster, 'fighters' | 'stash'>): number {
  return gangRating(roster) + (Number(roster.stash) || 0);
}

/** Soft credit cap for list-building. 0 means no cap. */
export function creditLimit(roster: Pick<Roster, 'stash'>): number {
  return Math.max(0, Number(roster.stash) || 0);
}

/** Remaining credits against the cap, or null if no cap is set. */
export function creditsRemaining(roster: Pick<Roster, 'fighters' | 'stash'>): number | null {
  const limit = creditLimit(roster);
  if (limit <= 0) return null;
  return limit - gangRating(roster);
}

/** Types and gear come from the house list — nothing to pick without a faction. */
export function canAddFighters(roster: Pick<Roster, 'faction'>): boolean {
  return Boolean(roster.faction);
}

/** Changing house would leave illegal types and gear. Empty roster can still switch. */
export function canChangeFaction(roster: Pick<Roster, 'fighters'>): boolean {
  return (roster.fighters ?? []).length === 0;
}

export function slugify(text: string): string {
  const mapped = (text || '')
    .toLowerCase()
    .split('')
    .map((ch) => (CYRILLIC[ch] !== undefined ? CYRILLIC[ch] : ch))
    .join('');
  return (
    mapped
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'roster'
  );
}

export function splitList(text: string): string[] {
  return String(text || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasSubtype(fighter: Fighter, pattern: RegExp): boolean {
  return (fighter.subtypes || []).some((item) => pattern.test(item));
}

export function rosterWarnings(
  roster: Pick<Roster, 'fighters'> & Partial<Pick<Roster, 'faction' | 'reputation' | 'stash'>>,
): string[] {
  const fighters = roster.fighters ?? [];
  const counted = fighters.filter((fighter) => !hasSubtype(fighter, PET));
  const faction = roster.faction ?? '';
  const messages: string[] = [];

  if (counted.length && !SKIP_LEADER.has(faction)) {
    const leaders = counted.filter((fighter) => hasSubtype(fighter, LEADER));
    if (leaders.length !== 1) {
      messages.push(`Нужен ровно один Leader (сейчас ${leaders.length}).`);
    }
  }

  if (counted.length && !SKIP_RATIO.has(faction)) {
    const restricted = counted.filter((fighter) => hasSubtype(fighter, RESTRICTED));
    const rest = counted.length - restricted.length;
    if (restricted.length > rest) {
      messages.push(
        'Моделей с Champion, Brute или Hanger-on не должно быть больше остальных (Leader считается в остальных; питомцы не считаются).',
      );
    }
  }

  if (roster.reputation !== undefined && roster.reputation < 1) {
    messages.push('Reputation не может быть ниже 1.');
  }

  const rating = gangRating({ fighters });
  const limit = creditLimit({ stash: roster.stash ?? 0 });
  if (limit > 0 && fighters.length && rating > limit) {
    messages.push(
      `Рейтинг ${rating} превышает лимит ${limit} кредитов (остаток ${limit - rating}).`,
    );
  }

  for (const fighter of fighters) {
    const slots = (fighter.equipment ?? [])
      .filter((item) => item.name)
      .reduce((sum, item) => sum + (Number(item.slots) || 0), 0);
    if (slots > WEAPON_SLOT_MAX) {
      const label = fighter.name || fighter.type || 'Боец';
      messages.push(
        `${label}: максимум три слота оружия (сейчас ${slots}; гранаты — wargear).`,
      );
    }
  }

  return messages;
}

export function normalizeRoster(data: Partial<Roster>): Roster {
  const roster = { ...emptyRoster(), ...data };
  roster.fighters = (roster.fighters ?? []).map((fighter) => ({
    ...emptyFighter(false),
    ...fighter,
    id: fighter.id || uid(),
    subtypes: fighter.subtypes ?? [],
    skills: fighter.skills ?? [],
    equipment: (fighter.equipment ?? []).map((item) => ({
      name: item.name || '',
      cost: Number(item.cost) || 0,
      slots: Number(item.slots) || 0,
      extras: item.extras ?? [],
    })),
  }));
  return roster;
}

export function toIndexItem(roster: Roster, file: string): RosterIndexItem {
  return {
    file,
    id: roster.id || file.replace(/\.json$/, ''),
    name: roster.name || file,
    faction: roster.faction || '',
    factionName: roster.factionName || '',
    rating: gangRating(roster),
  };
}

/** Stable snapshot for unsaved-change checks. Ignores updatedAt. */
export function rosterFingerprint(roster: Roster): string {
  return JSON.stringify({
    id: roster.id,
    name: roster.name,
    faction: roster.faction,
    factionName: roster.factionName,
    notes: roster.notes,
    reputation: roster.reputation,
    stash: roster.stash,
    fighters: roster.fighters,
  });
}
