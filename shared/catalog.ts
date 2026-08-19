export type FighterStats = {
  keys: string[];
  values: string[];
};

export type FighterTypeDef = {
  id: string;
  name: string;
  category: string;
  subtypes: string[];
  baseCost: number;
  xp: number;
  stats?: FighterStats;
  rules?: string[];
};

export type WeaponTrait = {
  name: string;
  text?: string;
};

export type WeaponProfile = {
  name: string;
  sr: string;
  lr: string;
  str: string;
  ap: string;
  l: string;
  traits: WeaponTrait[];
};

export type EquipmentUpgrade = {
  name: string;
  cost: number;
};

export type EquipmentDef = {
  name: string;
  cost: number;
  slots: number;
  category: string;
  list: string;
  upgrades?: EquipmentUpgrade[];
  profiles?: WeaponProfile[];
  description?: string;
};

export type FactionCatalog = {
  id: string;
  name: string;
  types: FighterTypeDef[];
  subtypes: string[];
  equipment: EquipmentDef[];
};

export type SkillDef = {
  name: string;
  label: string;
  text: string;
};

export type SkillSetDef = {
  id: string;
  name: string;
  skills: SkillDef[];
};

/** Universal Skill Sets from SKIRMUNDA, plus inherent skills. */
export const SKILL_SETS: SkillSetDef[] = [
  {
    id: 'agility',
    name: 'Ловкость',
    skills: [
      {
        name: 'Catfall',
        label: 'Падение кошкой',
        text: 'Когда эта модель падает или прыгает вниз с уступа, вертикальная дистанция считается на один уровень меньше обычного. Если она не Seriously Injured/Damaged и не выведена из боя падением, сделайте тест Agility — при успехе она не становится Suppressed.',
      },
      {
        name: 'Clamber',
        label: 'Лазание',
        text: 'Когда этот боец карабкается, пройденная дистанция не делится пополам; он всегда считается поднимающимся или спускающимся по лестнице.',
      },
      {
        name: 'Dodge',
        label: 'Уворот',
        text: 'Если эта модель получает Wound от стрельбы или ближнего боя (включая Unstable), бросьте D6. На 6 атака уворачивается. Против маркера Blast или шаблона огня 6 позволяет сдвинуться до 2" до проверки попадания.',
      },
      {
        name: 'Mighty Leap',
        label: 'Могучий прыжок',
        text: 'При измерении разрыва, который модель хочет перепрыгнуть, игнорируйте первые 2". Разрывы 4" или меньше можно прыгать без теста Agility.',
      },
      {
        name: 'Spring Up',
        label: 'Вскочить',
        text: 'Если этот боец Suppressed при активации, сделайте тест Agility. При успехе он больше не Suppressed и может выполнить два действия как обычно.',
      },
      {
        name: 'Sprint',
        label: 'Спринт',
        text: 'Пока Active, эта модель может выполнить действие Спринт (двойное): сдвинуться на Movement плюс удвоенная Initiative в дюймах.',
      },
    ],
  },
  {
    id: 'brawn',
    name: 'Сила',
    skills: [
      {
        name: 'Bull Charge',
        label: 'Бычий натиск',
        text: 'Когда модель атакует в ближнем бою как часть Charge, любое используемое оружие ближнего боя получает Knockback (6+) и разрешается с +1 Strength.',
      },
      {
        name: 'Bulging Biceps',
        label: 'Мощные бицепсы',
        text: 'При Braced Shot боец может сдвинуться на Initiative в дюймах до или после атаки. При атаке тяжёлым оружием в ближнем бою может объявить Secondary, если оно тоже не Heavy.',
      },
      {
        name: 'Fearsome',
        label: 'Устрашающий',
        text: 'Эта модель подвержена состоянию Fearsome.',
      },
      {
        name: 'Iron Jaw',
        label: 'Железная челюсть',
        text: 'Toughness этой модели считается на 2 выше обычного при разрешении попаданий ближнего боя с AP «–».',
      },
      {
        name: 'Nerves of Steel',
        label: 'Стальные нервы',
        text: 'Когда модель получает попадание дальней атакой, она может сделать проверку Cool. При успехе атака не делает её Suppressed.',
      },
      {
        name: 'Unstoppable',
        label: 'Неудержимый',
        text: 'Каждый раз, когда эта модель активируется, до любых действий сделайте проверку Willpower. При успехе она восстанавливает 1 Wound, потерянный ранее в бою.',
      },
    ],
  },
  {
    id: 'combat',
    name: 'Бой',
    skills: [
      {
        name: 'Berserker',
        label: 'Берсерк',
        text: 'Эта модель подвержена состоянию Frenzy.',
      },
      {
        name: 'Combat Master',
        label: 'Мастер боя',
        text: 'Эта модель никогда не получает штрафов к броскам попадания за Interference и всегда может давать Assist, сколько бы вражеских моделей ни было с ней Engaged.',
      },
      {
        name: 'Headbutt',
        label: 'Удар головой',
        text: 'Этот боец считается вооружённым Headbutt: SR E, Str S+1, AP –, L1, Additional Attack (1), Melee.',
      },
      {
        name: 'Heavy Blows',
        label: 'Тяжёлые удары',
        text: 'При использовании оружия со свойством Heavy в ближнем бою увеличьте Strength этого бойца на 1.',
      },
      {
        name: 'Rain of Blows',
        label: 'Град ударов',
        text: 'Первый раз за активацию, когда эта модель разрешает Fight, если она всё ещё Engaged с врагом, она может выполнить дополнительный Fight как свободное действие.',
      },
      {
        name: 'Two-weapon Fighter',
        label: 'Два оружия',
        text: 'В ближнем бою эта модель делает две атаки Secondary-оружием вместо обычной одной.',
      },
    ],
  },
  {
    id: 'cunning',
    name: 'Хитрость',
    skills: [
      {
        name: 'Backstab',
        label: 'Удар в спину',
        text: 'Всё оружие со свойством Melee этого бойца получает Backstab. Если оно уже есть, при использовании свойства добавляйте 2 к Strength оружия вместо обычной 1.',
      },
      {
        name: 'Counter-attack',
        label: 'Контратака',
        text: 'Когда вражеская модель разрешает Fight с участием этой модели, эта модель может сделать дополнительную атаку своим оружием с той же Initiative, что и атаки врага.',
      },
      {
        name: 'Cut-throat',
        label: 'Горлорез',
        text: 'При Coup de Grâce, после того как оба игрока бросили D6, этот боец может перебросить свой кубик.',
      },
      {
        name: 'Infiltrate',
        label: 'Инфильтрация',
        text: 'Вместо расстановки в начале боя бойца можно отложить. Непосредственно перед первым раундом его можно поставить куда угодно, где его не видят враги и не ближе 9" от них, либо в зоне расстановки своей банды.',
      },
      {
        name: 'Lie Low',
        label: 'Прижаться',
        text: 'Пока этот боец Suppressed, враги не могут целиться в него дальней атакой, если он не в Short Range атакующего оружия.',
      },
      {
        name: 'Overwatch',
        label: 'Надзор',
        text: 'Если эта модель Active, имеет Ready и линию видимости к цели, она может прервать действие врага сразу после объявления. Теряет Ready и сразу выполняет Shoot по этому врагу. Если враг становится Suppressed или Seriously Injured/Damaged, его активация заканчивается.',
      },
    ],
  },
  {
    id: 'savant',
    name: 'Знаток',
    skills: [
      {
        name: 'Connected',
        label: 'Связи',
        text: 'Эта модель может выполнить Visit Trading Post в пост-цикловой последовательности, добавляя 1 TP, в дополнение к любым другим действиям.',
      },
      {
        name: 'Fast Reload',
        label: 'Быстрая перезарядка',
        text: 'При действии Reload эта модель может перезарядить всё носимое оружие.',
      },
      {
        name: 'Iron Will',
        label: 'Железная воля',
        text: 'Вычтите 1 из результата любых ваших Bottle checks, пока эта модель на поле.',
      },
      {
        name: 'Medicate',
        label: 'Медикаменты',
        text: 'Пока Active или Suppressed, этот боец может выполнить действие Вылечить союзника (одиночное): дружественный боец в пределах 1", который не Seriously Injured, восстанавливает 1 Wound.',
      },
      {
        name: 'Mentor',
        label: 'Наставник',
        text: 'Делайте проверку Leadership за этого бойца каждый раз, когда другая дружественная модель в пределах 6" получает XP. При успехе другая модель получает дополнительный 1 XP.',
      },
      {
        name: 'Munitioneer',
        label: 'Оружейник',
        text: 'Пока Active или Suppressed, этот боец может выполнить действие Раздать патроны (одиночное): все дружественные бойцы в пределах 6" делают проверку Intelligence; каждый успешный может выполнить Reload как свободное действие.',
      },
    ],
  },
  {
    id: 'shooting',
    name: 'Стрельба',
    skills: [
      {
        name: 'Fast Shot',
        label: 'Быстрый выстрел',
        text: 'Эта модель может выполнить два действия Shoot за каждую активацию.',
      },
      {
        name: 'Gunfighter',
        label: 'Дуэлянт',
        text: 'Может стрелять из двух оружий со свойством Light в рамках одного Shoot. Каждое оружие может целиться в разную цель; обе цели нужно объявить до броска кубиков.',
      },
      {
        name: 'Hip-shooting',
        label: 'Стрельба с бедра',
        text: 'Всё дальнобойное оружие без свойства Heavy, которым экипирован этот боец, получает свойство Assault.',
      },
      {
        name: 'Marksman',
        label: 'Меткий стрелок',
        text: 'Применяет +1 ко всем броскам попадания дальней атаки по цели между Short и Long Range оружия.',
      },
      {
        name: 'Precision Shot',
        label: 'Точный выстрел',
        text: 'Если бросок попадания дальней атаки — натуральная 6 (оружием без Blast или Rapid Fire (X)), выстрел попадает в открытый участок и спасбросок брони сделать нельзя.',
      },
      {
        name: 'Sharpshooter',
        label: 'Снайпер',
        text: 'При Aimed Shot эта модель применяет +2 к броску попадания вместо +1.',
      },
    ],
  },
  {
    id: 'inherent',
    name: 'Врождённые',
    skills: [
      {
        name: 'Hit & Run',
        label: 'Удар и беги',
        text: 'После завершения Fight модель всегда может консолидироваться, даже если всё ещё Engaged. Во время этой консолидации она может входить в 1" от врагов, но должна закончить не ближе 1" от них.',
      },
      {
        name: 'Inspiring',
        label: 'Вдохновляющий',
        text: 'Может выполнять Group Activation как свободное действие.',
      },
      {
        name: 'Juggernaut',
        label: 'Джаггернаут',
        text: 'При попадании дальней атакой модель становится Suppressed, только если теряет Wound или по ней бросается и применяется кубик ранений.',
      },
    ],
  },
];

export function allSkillNames() {
  return SKILL_SETS.flatMap((group) => group.skills.map((skill) => skill.name));
}

export function findSkill(name: string) {
  for (const group of SKILL_SETS) {
    const match = group.skills.find((skill) => skill.name === name);
    if (match) return match;
  }
  return undefined;
}

export function skillLabel(name: string) {
  return findSkill(name)?.label ?? name;
}

export function findType(catalog: FactionCatalog | undefined, name: string) {
  return catalog?.types.find((item) => item.name === name);
}

export function findGear(catalog: FactionCatalog | undefined, name: string) {
  return catalog?.equipment.find((item) => item.name === name);
}

const WARGEAR_CATEGORY = /ARMOUR|EQUIPMENT|ACCESSORIES|MOUNTS|^PETS$/i;

export function isWeaponDef(def: EquipmentDef) {
  if (def.profiles?.length) return true;
  return !WARGEAR_CATEGORY.test(def.category ?? '');
}

export function isWeaponItem(
  def: EquipmentDef | undefined,
  item: { slots?: number },
) {
  if (def) return isWeaponDef(def);
  return (Number(item.slots) || 0) > 0;
}

export function gearCost(def: EquipmentDef | undefined, extras: string[] | undefined) {
  const selected = extras ?? [];
  const extra = (def?.upgrades ?? [])
    .filter((upgrade) => selected.includes(upgrade.name))
    .reduce((sum, upgrade) => sum + upgrade.cost, 0);
  return (def?.cost ?? 0) + extra;
}

export function equipmentGroups(
  catalog: FactionCatalog | undefined,
  kind?: 'weapon' | 'wargear',
) {
  const groups: { label: string; items: EquipmentDef[] }[] = [];
  const map = new Map<string, EquipmentDef[]>();
  for (const item of catalog?.equipment ?? []) {
    if (kind === 'weapon' && !isWeaponDef(item)) continue;
    if (kind === 'wargear' && isWeaponDef(item)) continue;
    const label =
      item.list && item.category
        ? `${item.list} · ${item.category}`
        : item.category || item.list || 'Снаряжение';
    let bucket = map.get(label);
    if (!bucket) {
      bucket = [];
      map.set(label, bucket);
      groups.push({ label, items: bucket });
    }
    bucket.push(item);
  }
  return groups;
}

export function namesMatch(a: string, b: string) {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/s\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return normalize(a) === normalize(b);
}

export function isAmmoProfile(profile: WeaponProfile, def: EquipmentDef) {
  return (def.upgrades ?? []).some((upgrade) => namesMatch(profile.name, upgrade.name));
}

export function visibleProfiles(def: EquipmentDef | undefined, extras: string[] | undefined) {
  if (!def?.profiles?.length) return [];
  const selected = extras ?? [];
  return def.profiles.filter((profile) => {
    if (!isAmmoProfile(profile, def)) return true;
    return selected.some((name) => namesMatch(profile.name, name));
  });
}

export function uniqueTraits(profiles: WeaponProfile[]) {
  const seen = new Set<string>();
  const list: WeaponTrait[] = [];
  for (const profile of profiles) {
    for (const trait of profile.traits) {
      if (seen.has(trait.name)) continue;
      seen.add(trait.name);
      list.push(trait);
    }
  }
  return list;
}
