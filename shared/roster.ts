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

const HEAVY = /Leader|Champion|Brute|Hanger-on/i;

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
    stash: 0,
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

export function emptyGear(): Equipment {
  return { name: '', cost: 0, slots: 1, extras: [] };
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

export function rosterWarnings(roster: Pick<Roster, 'fighters'>): string[] {
  const fighters = roster.fighters ?? [];
  const leaders = fighters.filter((fighter) =>
    (fighter.subtypes || []).some((item) => /Leader/i.test(item)),
  );
  const heavy = fighters.filter((fighter) =>
    (fighter.subtypes || []).some((item) => HEAVY.test(item)),
  );
  const rest = fighters.length - heavy.length;
  const messages: string[] = [];
  if (fighters.length && leaders.length !== 1) {
    messages.push(`Нужен ровно один Leader (сейчас ${leaders.length}).`);
  }
  if (heavy.length > rest) {
    messages.push(
      'Чемпионов, громил и прихвостней не должно быть больше остальных моделей.',
    );
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
