import { describe, expect, it } from 'vitest';
import { namesMatch, allSkillNames, findSkill, isWeaponDef, visibleProfiles, type EquipmentDef } from '@shared/catalog';
import { fighterStatTip, weaponStatTip } from '@shared/statTips';
import {
  canAddFighters,
  canChangeFaction,
  cloneFighter,
  cloneRoster,
  copyRosterName,
  creditLimit,
  creditsRemaining,
  fighterCost,
  gangRating,
  normalizeRoster,
  rosterWarnings,
  rosterFingerprint,
  slugify,
} from '@shared/roster';

const sample = normalizeRoster({
  name: 'Гимн Пепельной часовни',
  stash: 0,
  fighters: [
    {
      id: 'malchus',
      name: 'Мальхус',
      type: 'Cawdor Word-Keeper',
      subtypes: ['Leader', 'Pious'],
      xp: 61,
      baseCost: 115,
      skills: ['Inspiring'],
      equipment: [
        { name: 'flamer', cost: 85, slots: 2 },
        { name: 'knife', cost: 5, slots: 1 },
        { name: 'mesh', cost: 40, slots: 0 },
        { name: 'icon', cost: 40, slots: 0 },
        { name: 'frag', cost: 30, slots: 0 },
      ],
    },
  ],
});

describe('roster math', () => {
  it('sums fighter cost', () => {
    expect(fighterCost(sample.fighters[0])).toBe(315);
  });

  it('clones a fighter with a new id and copied gear', () => {
    const copy = cloneFighter(sample.fighters[0]);
    expect(copy.id).not.toBe(sample.fighters[0].id);
    expect(copy.name).toBe('Мальхус');
    expect(copy.equipment).toEqual(sample.fighters[0].equipment);
    expect(copy.equipment).not.toBe(sample.fighters[0].equipment);
    copy.equipment[0].name = 'changed';
    expect(sample.fighters[0].equipment[0].name).toBe('flamer');
  });

  it('clones a roster with a new id and copy name', () => {
    const copy = cloneRoster(sample);
    expect(copy.id).not.toBe(sample.id);
    expect(copy.name).toBe('Гимн Пепельной часовни (копия)');
    expect(copy.fighters).toHaveLength(1);
    expect(copy.fighters[0].id).not.toBe(sample.fighters[0].id);
    expect(copy.fighters[0].name).toBe('Мальхус');
    expect(copyRosterName('Гимн (копия)')).toBe('Гимн (копия 2)');
    expect(copyRosterName('Гимн (копия 2)')).toBe('Гимн (копия 3)');
  });

  it('ignores updatedAt when fingerprinting a roster', () => {
    const a = rosterFingerprint({ ...sample, updatedAt: '2024-01-01' });
    const b = rosterFingerprint({ ...sample, updatedAt: '2026-08-19' });
    expect(a).toBe(b);
    expect(rosterFingerprint({ ...sample, name: 'Другое' })).not.toBe(a);
  });

  it('translates cyrillic slugs', () => {
    expect(slugify('Гимн Пепельной часовни')).toBe('gimn-pepelnoj-chasovni');
  });

  it('warns without a single leader', () => {
    const none = rosterWarnings({ fighters: [] });
    expect(none).toEqual([]);
    const gangerOnly = rosterWarnings({
      fighters: [{ ...sample.fighters[0], subtypes: ['Ganger'] }],
    });
    expect(gangerOnly.some((msg) => /Leader/.test(msg))).toBe(true);
  });

  it('counts Leader toward the rest, not Champion/Brute/Hanger-on', () => {
    const champ = {
      ...sample.fighters[0],
      equipment: [],
      baseCost: 95,
      subtypes: ['Champion'],
    };
    const ganger = { ...champ, subtypes: ['Ganger'], baseCost: 40 };
    const valid = rosterWarnings({
      fighters: [
        { ...sample.fighters[0], equipment: [], baseCost: 115 },
        { ...champ, id: 'c1' },
        { ...champ, id: 'c2' },
        { ...ganger, id: 'g1' },
        { ...ganger, id: 'g2' },
      ],
    });
    expect(valid).toEqual([]);
    const over = rosterWarnings({
      fighters: [
        { ...sample.fighters[0], equipment: [], baseCost: 115 },
        { ...champ, id: 'c1' },
        { ...champ, id: 'c2' },
        { ...champ, id: 'c3' },
        { ...ganger, id: 'g1' },
      ],
    });
    expect(over.some((msg) => /Champion, Brute или Hanger-on/.test(msg))).toBe(true);
  });

  it('skips core composition for Blades of the Matriarch', () => {
    expect(
      rosterWarnings({
        faction: 'blades-of-the-matriarch',
        fighters: [{ ...sample.fighters[0], subtypes: ['Ganger'], equipment: [], baseCost: 40 }],
      }),
    ).toEqual([]);
  });

  it('warns on more than three weapon slots', () => {
    const overSlots = rosterWarnings({
      fighters: [
        {
          ...sample.fighters[0],
          equipment: [
            { name: 'autogun', cost: 20, slots: 1 },
            { name: 'stub gun', cost: 5, slots: 1 },
            { name: 'axe', cost: 10, slots: 1 },
            { name: 'knife', cost: 5, slots: 1 },
          ],
        },
      ],
    });
    expect(overSlots.some((msg) => /три слота/.test(msg))).toBe(true);
  });

  it('rates a gang', () => {
    expect(gangRating(sample)).toBe(315);
  });

  it('treats stash as a soft credit cap', () => {
    expect(creditLimit({ stash: 1000 })).toBe(1000);
    expect(creditsRemaining({ ...sample, stash: 1000 })).toBe(685);
    expect(creditsRemaining({ ...sample, stash: 0 })).toBeNull();
    const over = rosterWarnings({ ...sample, stash: 300 });
    expect(over.some((msg) => /превышает лимит 300/.test(msg))).toBe(true);
    expect(rosterWarnings({ ...sample, stash: 0 }).some((msg) => /лимит/.test(msg))).toBe(false);
  });

  it('locks the house once fighters exist', () => {
    expect(canAddFighters({ faction: '' })).toBe(false);
    expect(canAddFighters({ faction: 'house-cawdor' })).toBe(true);
    expect(canChangeFaction({ fighters: [] })).toBe(true);
    expect(canChangeFaction(sample)).toBe(false);
  });
});

describe('print catalog helpers', () => {
  it('matches warp round names', () => {
    expect(namesMatch('warp round', 'warp rounds')).toBe(true);
  });

  it('hides unselected ammo profiles', () => {
    const def: EquipmentDef = {
      name: 'Autogun',
      cost: 20,
      slots: 1,
      category: 'AUTO/STUB WEAPONS',
      list: 'HOUSE CAWDOR',
      upgrades: [{ name: 'warp rounds', cost: 10 }],
      profiles: [
        { name: 'Autogun', sr: '8”', lr: '24”', str: '3', ap: '-', l: '1', traits: [] },
        { name: 'warp rounds', sr: '8”', lr: '24”', str: '3', ap: '-', l: '1', traits: [] },
      ],
    };
    expect(visibleProfiles(def, []).map((item) => item.name)).toEqual(['Autogun']);
    expect(visibleProfiles(def, ['warp rounds']).map((item) => item.name)).toEqual([
      'Autogun',
      'warp rounds',
    ]);
  });

  it('lists universal skills by English name', () => {
    const names = allSkillNames();
    expect(names).toContain('Inspiring');
    expect(names).toContain('Iron Will');
    expect(names).toContain('Rain of Blows');
    expect(names).toHaveLength(39);
    expect(findSkill('Dodge')?.text).toMatch(/D6/);
    expect(findSkill('Inspiring')?.label).toBe('Вдохновляющий');
  });

  it('treats profiles as weapons and armour as wargear', () => {
    const autogun: EquipmentDef = {
      name: 'Autogun',
      cost: 20,
      slots: 1,
      category: 'AUTO/STUB WEAPONS',
      list: 'HOUSE CAWDOR',
      profiles: [
        { name: 'Autogun', sr: '8”', lr: '24”', str: '3', ap: '-', l: '1', traits: [] },
      ],
    };
    const mesh: EquipmentDef = {
      name: 'Mesh armour',
      cost: 40,
      slots: 0,
      category: 'ARMOUR & FIELD ARMOUR',
      list: 'HOUSE CAWDOR',
      description: 'Save +1 in melee.',
    };
    const sight: EquipmentDef = {
      name: 'Mono-sight',
      cost: 20,
      slots: 1,
      category: 'WEAPON ACCESSORIES',
      list: 'HOUSE CAWDOR',
      description: 'Aimed Shot +2.',
    };
    const grenade: EquipmentDef = {
      name: 'Frag grenades',
      cost: 30,
      slots: 0,
      category: 'GRENADES',
      list: 'HOUSE CAWDOR',
      profiles: [
        { name: 'Frag grenades', sr: '-', lr: 'SX2', str: '3', ap: '-', l: '1', traits: [] },
      ],
    };
    expect(isWeaponDef(autogun)).toBe(true);
    expect(isWeaponDef(grenade)).toBe(true);
    expect(isWeaponDef(mesh)).toBe(false);
    expect(isWeaponDef(sight)).toBe(false);
  });
});

describe('stat tooltips', () => {
  it('explains fighter and weapon profile abbreviations', () => {
    expect(fighterStatTip('WS')).toMatch(/Weapon Skill/);
    expect(fighterStatTip('Starting XP')).toMatch(/опыт/i);
    expect(weaponStatTip('SR')).toMatch(/Short Range/);
    expect(weaponStatTip('S')).toMatch(/Strength/);
    expect(weaponStatTip('Оружие')).toBeUndefined();
  });
});
