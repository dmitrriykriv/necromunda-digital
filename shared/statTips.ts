/** Подсказки к аббревиатурам профилей модели и оружия. */

export const FIGHTER_STAT_TIPS: Record<string, string> = {
  M: 'Movement — сколько дюймов модель проходит обычным действием Move.',
  WS: 'Weapon Skill — целевое число ближнего боя на D6. Чем меньше, тем лучше.',
  BS: 'Ballistic Skill — целевое число стрельбы на D6. Чем меньше, тем лучше.',
  S: 'Strength — сила модели. Чем выше, тем легче ранить в ближнем бою.',
  T: 'Toughness — стойкость. Чем выше, тем сложнее ранить эту модель.',
  W: 'Wounds — сколько урона модель выдержит, прежде чем бросают кубики ранений.',
  I: 'Initiative — скорость реакции в бою.',
  A: 'Attacks — сколько кубиков бросается в схватке, пока модель Engaged.',
  Sv: 'Save — целевое число спасброска брони. Чем меньше, тем лучше.',
  Ld: 'Leadership — приказы в бою. Проверка: 2D6, нужно выбросить не больше Ld.',
  Cl: 'Cool — спокойствие под огнём. Проверка: 2D6, нужно выбросить не больше Cl.',
  Wil: 'Willpower — устойчивость к ужасам. Проверка: 2D6, нужно выбросить не больше Wil.',
  Int: 'Intelligence — ум и знания. Проверка: 2D6, нужно выбросить не больше Int.',
  XP: 'Starting XP — опыт, с которым боец начинает в банде.',
};

export const WEAPON_STAT_TIPS: Record<string, string> = {
  SR: 'Short Range — короткая дистанция. E — только в Engaged, T — шаблон огня, «–» — нельзя.',
  LR: 'Long Range — дальняя дистанция; за ней попасть нельзя. E / T / «–» — как у SR.',
  Str: 'Strength — сила оружия для бросков на ранение. S — сила владельца, S+N — с модификатором, «–» — смотрите свойства.',
  S: 'Strength — сила оружия для бросков на ранение. S — сила владельца, S+N — с модификатором, «–» — смотрите свойства.',
  AP: 'Armour Piercing — модификатор к спасброску брони, чаще всего отрицательный.',
  L: 'Lethality — сколько кубиков ранений бросают, если Wounds цели упали до 0.',
};

export function fighterStatTip(key: string): string | undefined {
  return FIGHTER_STAT_TIPS[key] ?? (key === 'Starting XP' ? FIGHTER_STAT_TIPS.XP : undefined);
}

export function weaponStatTip(key: string): string | undefined {
  return WEAPON_STAT_TIPS[key];
}
