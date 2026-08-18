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

export function findType(catalog: FactionCatalog | undefined, name: string) {
  return catalog?.types.find((item) => item.name === name);
}

export function findGear(catalog: FactionCatalog | undefined, name: string) {
  return catalog?.equipment.find((item) => item.name === name);
}

export function gearCost(def: EquipmentDef | undefined, extras: string[] | undefined) {
  const selected = extras ?? [];
  const extra = (def?.upgrades ?? [])
    .filter((upgrade) => selected.includes(upgrade.name))
    .reduce((sum, upgrade) => sum + upgrade.cost, 0);
  return (def?.cost ?? 0) + extra;
}

export function equipmentGroups(catalog: FactionCatalog | undefined) {
  const groups: { label: string; items: EquipmentDef[] }[] = [];
  const map = new Map<string, EquipmentDef[]>();
  for (const item of catalog?.equipment ?? []) {
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
