import { describe, expect, it } from 'vitest';
import {
  namesMatch,
  allSkillNames,
  findSkill,
  fighterPatchForType,
  gearPreviewText,
  innateSkillsFromRules,
  isWeaponDef,
  orderedSkillSets,
  skillAccessFor,
  skillOptionLabel,
  visibleProfiles,
  type EquipmentDef,
  type FactionCatalog,
  type FighterTypeDef,
} from '@shared/catalog';
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
  moveFighterInList,
  normalizeRoster,
  rosterWarnings,
  rosterFingerprint,
  slugify,
  snapshotRoster,
  weaponSlotsUsed,
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

  it('snapshots a roster without sharing equipment arrays', () => {
    const snap = snapshotRoster(sample);
    expect(snap).toEqual(sample);
    expect(snap.fighters[0].equipment).not.toBe(sample.fighters[0].equipment);
    snap.fighters[0].name = 'Другой';
    snap.fighters[0].equipment[0].name = 'changed';
    expect(sample.fighters[0].name).toBe('Мальхус');
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

  it('reorders fighters relative to each other', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    expect(moveFighterInList(list, 'b', 0).map((item) => item.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(moveFighterInList(list, 'a', 2).map((item) => item.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(moveFighterInList(list, 'a', 4).map((item) => item.id)).toEqual(['b', 'c', 'd', 'a']);
    expect(moveFighterInList(list, 'c', 1).map((item) => item.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(moveFighterInList(list, 'b', 1)).toBe(list);
    expect(moveFighterInList(list, 'b', 2)).toBe(list);
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

  it('warns on more than three weapons', () => {
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
    expect(overSlots.some((msg) => /4 единицы оружия при максимуме 3/.test(msg))).toBe(true);
  });

  it('counts starred weapons as two unless suspensors are fitted', () => {
    const laser = {
      ...sample.fighters[0],
      equipment: [
        { name: 'Mining laser*', cost: 125, slots: 2 },
        { name: 'autogun', cost: 20, slots: 1 },
        { name: 'knife', cost: 5, slots: 1 },
      ],
    };
    expect(rosterWarnings({ fighters: [laser] }).some((msg) => /оружия при максимуме/.test(msg))).toBe(
      true,
    );
    const withSuspensors = {
      ...laser,
      equipment: [
        { name: 'Mining laser*', cost: 165, slots: 2, extras: ['Suspensors'] },
        { name: 'autogun', cost: 20, slots: 1 },
        { name: 'knife', cost: 5, slots: 1 },
      ],
    };
    expect(
      rosterWarnings({ fighters: [withSuspensors] }).some((msg) => /оружия при максимуме/.test(msg)),
    ).toBe(false);
  });

  it('allows four weapons with Extra Arm', () => {
    const catalog = {
      id: 'genestealer-cult',
      name: 'Культ генокрадов',
      types: [
        {
          id: 'alpha',
          name: 'Genestealer Cult Alpha',
          category: 'Fighter',
          subtypes: ['Leader'],
          baseCost: 150,
          xp: 61,
          rules: [
            'Дополнительная рука: этот Fighter может нести четыре единицы оружия вместо обычных трёх.',
          ],
        },
      ],
      subtypes: ['Leader'],
      equipment: [],
    };
    const gear = [
      { name: 'autogun', cost: 20, slots: 1 },
      { name: 'stub gun', cost: 5, slots: 1 },
      { name: 'axe', cost: 10, slots: 1 },
      { name: 'knife', cost: 5, slots: 1 },
    ];
    const alpha = { ...sample.fighters[0], type: 'Genestealer Cult Alpha', equipment: gear };
    expect(rosterWarnings({ fighters: [alpha] }).some((msg) => /оружия при максимуме/.test(msg))).toBe(
      true,
    );
    expect(
      rosterWarnings({ fighters: [alpha] }, catalog).some((msg) => /оружия при максимуме/.test(msg)),
    ).toBe(false);
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

  it('builds a hover preview for weapons and wargear', () => {
    const gun: EquipmentDef = {
      name: 'Stub cannon',
      cost: 35,
      slots: 1,
      category: 'AUTO/STUB WEAPONS',
      list: 'HOUSE GOLIATH',
      profiles: [
        {
          name: 'Stub cannon',
          sr: '9”',
          lr: '18”',
          str: '5',
          ap: '-',
          l: '1',
          traits: [{ name: 'Knockback (5+)' }],
        },
      ],
    };
    const mesh: EquipmentDef = {
      name: 'Mesh armor',
      cost: 15,
      slots: 0,
      category: 'ARMOUR',
      list: 'HOUSE GOLIATH',
      description: 'Save +1 против попаданий в ближнем бою.',
    };
    expect(gearPreviewText(gun)).toContain('SR 9”');
    expect(gearPreviewText(gun)).toContain('Knockback (5+)');
    expect(gearPreviewText(gun)).not.toContain('Stub cannon:');
    expect(gearPreviewText(mesh)).toBe('Save +1 против попаданий в ближнем бою.');
    expect(gearPreviewText(undefined)).toBe('');
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

  it('orders primary skill sets before secondary, then the rest', () => {
    const access = {
      primary: ['cunning', 'savant'],
      secondary: ['brawn', 'combat'],
    };
    expect(orderedSkillSets(access).map((group) => group.id)).toEqual([
      'cunning',
      'savant',
      'brawn',
      'combat',
      'agility',
      'shooting',
      'inherent',
    ]);
    expect(skillOptionLabel(findSkill('Dodge')!, 'primary')).toBe(
      'Уворот (Dodge) · основной',
    );
  });

  it('picks Outcast skill access from the selected archetype', () => {
    const type: FighterTypeDef = {
      id: 'outcast-leader',
      name: 'Outcast Leader',
      category: 'Fighter',
      subtypes: ['Leader'],
      baseCost: 135,
      xp: 61,
      skillAccessByArchetype: {
        Brawler: { primary: ['combat', 'savant'], secondary: ['brawn', 'cunning'] },
        Gunslinger: { primary: ['savant', 'shooting'], secondary: ['agility', 'cunning'] },
      },
    };
    expect(skillAccessFor(type, ['Leader'])).toBeUndefined();
    expect(skillAccessFor(type, ['Leader', 'Brawler'])?.primary).toEqual([
      'combat',
      'savant',
    ]);
    expect(skillAccessFor(type, ['Leader', 'Gunslinger'])?.primary).toEqual([
      'savant',
      'shooting',
    ]);
  });

  it('reads built-in skills from the Skills special rule', () => {
    expect(
      innateSkillsFromRules([
        'Навыки: у Malstrain Alpha есть навыки Clamber, Dodge, Infiltrate, Juggernaut, Nerves of Steel и Rain of Blows.',
        'Ambush Predator: While Active, the Malstrain Alpha may perform the Fade action',
      ]),
    ).toEqual([
      'Clamber',
      'Dodge',
      'Infiltrate',
      'Juggernaut',
      'Nerves of Steel',
      'Rain of Blows',
    ]);
    expect(
      innateSkillsFromRules(['Навыки: у Malstrain Tyramite есть навык Dodge.']),
    ).toEqual(['Dodge']);
    expect(
      innateSkillsFromRules([
        'Навыки: у Escher Blade Maiden есть навыки Deadly Blows и Hit & Run.',
      ]),
    ).toEqual(['Deadly Blows', 'Hit & Run']);
    expect(
      innateSkillsFromRules([
        'Навыки: пока Orlock Arms Master на поле боя, его банда может перебрасывать проверки Bottle.',
      ]),
    ).toEqual([]);
    expect(
      innateSkillsFromRules([
        'Skills: An Escher Chem Wytch has the Medicate skill Equipment: When added to a Gang Roster, an Escher Chem Wytch may purchase weapons and wargear from the Blades of the Matriarch Equipment List',
      ]),
    ).toEqual(['Medicate']);
  });

  it('applies type subtypes and built-in skills when the type is chosen', () => {
    const catalog: FactionCatalog = {
      id: 'malstrain',
      name: 'Мальстрейн',
      subtypes: ['Leader', 'Ganger', 'Specialist'],
      equipment: [],
      types: [
        {
          id: 'malstrain-alpha',
          name: 'Malstrain Alpha',
          category: 'Fighter',
          subtypes: ['Leader'],
          baseCost: 285,
          xp: 61,
          rules: [
            'Навыки: у Malstrain Alpha есть навыки Clamber, Dodge, Infiltrate, Juggernaut, Nerves of Steel и Rain of Blows.',
          ],
        },
        {
          id: 'brood-scum',
          name: 'Malstrain Brood Scum',
          category: 'Fighter',
          subtypes: ['Ganger', 'Specialist'],
          baseCost: 45,
          xp: 13,
        },
        {
          id: 'outcast-leader',
          name: 'Outcast Leader',
          category: 'Fighter',
          subtypes: ['Leader'],
          baseCost: 135,
          xp: 61,
          skillAccessByArchetype: {
            Brawler: { primary: ['combat'], secondary: ['brawn'] },
          },
        },
      ],
    };

    expect(
      fighterPatchForType(catalog, 'Malstrain Alpha', {
        type: '',
        subtypes: ['Ganger'],
        skills: [],
        baseCost: 0,
        xp: 0,
      }),
    ).toMatchObject({
      type: 'Malstrain Alpha',
      subtypes: ['Leader'],
      skills: [
        'Clamber',
        'Dodge',
        'Infiltrate',
        'Juggernaut',
        'Nerves of Steel',
        'Rain of Blows',
      ],
      baseCost: 285,
      xp: 61,
    });

    expect(
      fighterPatchForType(catalog, 'Outcast Leader', {
        type: '',
        subtypes: ['Ganger', 'Brawler'],
        skills: ['Inspiring'],
        baseCost: 0,
        xp: 0,
      }).subtypes,
    ).toEqual(['Leader', 'Brawler']);

    expect(
      fighterPatchForType(catalog, 'Malstrain Brood Scum', {
        type: 'Malstrain Alpha',
        subtypes: ['Leader'],
        skills: [
          'Clamber',
          'Dodge',
          'Infiltrate',
          'Juggernaut',
          'Nerves of Steel',
          'Rain of Blows',
          'Inspiring',
        ],
        baseCost: 285,
        xp: 61,
      }),
    ).toMatchObject({
      subtypes: ['Ganger', 'Specialist'],
      skills: ['Inspiring'],
      baseCost: 45,
      xp: 13,
    });
  });

  it('reads built-in skills from a live Malstrain catalog card', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const data = JSON.parse(
      readFileSync(resolve(root, 'data/factions/malstrain.json'), 'utf8'),
    ) as FactionCatalog;
    const alpha = data.types.find((item) => item.name === 'Malstrain Alpha');
    expect(fighterPatchForType(data, 'Malstrain Alpha', {
      type: '',
      subtypes: ['Ganger'],
      skills: [],
      baseCost: 0,
      xp: 0,
    })).toMatchObject({
      subtypes: ['Leader'],
      skills: [
        'Clamber',
        'Dodge',
        'Infiltrate',
        'Juggernaut',
        'Nerves of Steel',
        'Rain of Blows',
      ],
      baseCost: 285,
      xp: 61,
    });
    expect(alpha?.subtypes).toEqual(['Leader']);
    expect(alpha?.rules?.some((rule) => rule.startsWith('Хищник из засады'))).toBe(true);
    expect(alpha?.rules?.some((rule) => rule.startsWith('Ambush Predator'))).toBe(false);
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
    const launcher: EquipmentDef = {
      name: 'Grenade launcher with frag & krak grenades',
      cost: 65,
      slots: 1,
      category: 'GRENADE LAUNCHERS',
      list: 'HOUSE CAWDOR',
      profiles: [
        { name: 'frag grenades', sr: '6”', lr: '24”', str: '3', ap: '-', l: '1', traits: [] },
      ],
    };
    expect(isWeaponDef(autogun)).toBe(true);
    expect(isWeaponDef(launcher)).toBe(true);
    expect(isWeaponDef(grenade)).toBe(false);
    expect(isWeaponDef(mesh)).toBe(false);
    expect(isWeaponDef(sight)).toBe(false);
  });

  it('does not count grenades toward the weapon slot cap', () => {
    const catalog: FactionCatalog = {
      id: 'house-cawdor',
      name: 'Каудор',
      types: [],
      subtypes: [],
      equipment: [
        {
          name: 'Autogun',
          cost: 20,
          slots: 1,
          category: 'AUTO/STUB WEAPONS',
          list: 'HOUSE CAWDOR',
        },
        {
          name: 'Frag grenades',
          cost: 30,
          slots: 0,
          category: 'GRENADES',
          list: 'HOUSE CAWDOR',
          profiles: [
            { name: 'Frag grenades', sr: '-', lr: 'SX2', str: '3', ap: '-', l: '1', traits: [] },
          ],
        },
      ],
    };
    expect(
      weaponSlotsUsed(
        {
          equipment: [
            { name: 'Autogun', cost: 20, slots: 1 },
            { name: 'Autogun', cost: 20, slots: 1 },
            { name: 'Autogun', cost: 20, slots: 1 },
            { name: 'Frag grenades', cost: 30, slots: 1 },
          ],
        },
        catalog,
      ),
    ).toBe(3);
  });
});

describe('innate weapons in faction catalogs', () => {
  it('keeps the clawed arm on a Genestealer Cult Alpha', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const data = JSON.parse(
      readFileSync(resolve(root, 'data/factions/genestealer-cult.json'), 'utf8'),
    ) as { types: { name: string; weapons?: { name: string }[] }[] };
    const alpha = data.types.find((item) => item.name === 'Genestealer Cult Alpha');
    expect(alpha?.weapons?.map((item) => item.name)).toEqual(['Clawed arm']);
  });
});

describe('fighter special rules in faction catalogs', () => {
  async function loadCult() {
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    return JSON.parse(
      readFileSync(resolve(root, 'data/factions/genestealer-cult.json'), 'utf8'),
    ) as { types: { name: string; rules?: string[] }[] };
  }

  it('attaches Extra Arm to a Genestealer Cult Alpha', async () => {
    const data = await loadCult();
    const alpha = data.types.find((item) => item.name === 'Genestealer Cult Alpha');
    const extraArm = alpha?.rules?.find((rule) => rule.startsWith('Дополнительная рука'));
    expect(extraArm).toMatch(/Braced Shot/);
    expect(extraArm).toMatch(/четыре единицы оружия/);
    expect(extraArm).not.toMatch(/clawed arm/i);
  });

  it('does not auto-attach Extra Arm to a later-generation Acolyte', async () => {
    const data = await loadCult();
    const acolyte = data.types.find((item) => item.name === 'Genestealer Cult Hybrid Acolyte');
    expect(acolyte?.rules?.some((rule) => rule.startsWith('Дополнительная рука'))).toBe(false);
  });

  it('does not leak English originals into fighter rules', async () => {
    const data = await loadCult();
    const adept = data.types.find((item) => item.name === 'Genestealer Cult Adept');
    expect(adept?.rules?.join(' ')).not.toMatch(/Оригинал/);
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

describe('faction equipment catalogs', () => {
  it('keeps shop items and does not ingest wyrd powers or sentry guns', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const data = JSON.parse(
      readFileSync(resolve(root, 'data/factions/genestealer-cult.json'), 'utf8'),
    ) as { equipment: { name: string }[]; types: { name: string; weapons?: { name: string }[] }[] };
    const names = data.equipment.map((item) => item.name);
    expect(names.some((name) => name.startsWith('Cult icon'))).toBe(true);
    expect(names.some((name) => /Hypnosis|Unbreakable Will|Trazior/i.test(name))).toBe(false);
    const alpha = data.types.find((item) => item.name === 'Genestealer Cult Alpha');
    expect(alpha?.weapons?.map((item) => item.name)).toEqual(['Clawed arm']);
    const abominant = data.types.find((item) => item.name === 'Genestealer Cult Abominant');
    expect(abominant?.weapons?.map((item) => item.name)).toEqual(['Power sledgehammer']);
  });
});

describe('skill access in faction catalogs', () => {
  async function loadFaction(id: string) {
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    return JSON.parse(readFileSync(resolve(root, `data/factions/${id}.json`), 'utf8')) as {
      types: FighterTypeDef[];
    };
  }

  it('tags Genestealer Cult Alpha primary and secondary sets', async () => {
    const data = await loadFaction('genestealer-cult');
    const alpha = data.types.find((item) => item.name === 'Genestealer Cult Alpha');
    expect(alpha?.skillAccess).toEqual({
      primary: ['cunning', 'savant'],
      secondary: ['brawn', 'combat'],
    });
  });

  it('does not confuse Cawdor Brethren with Way-Brethren', async () => {
    const data = await loadFaction('house-cawdor');
    const brethren = data.types.find((item) => item.name === 'Cawdor Brethren');
    const way = data.types.find((item) => item.name === 'Cawdor Way-Brethren');
    expect(brethren?.skillAccess?.primary).toEqual(['combat']);
    expect(way?.skillAccess?.primary).toEqual(['agility']);
  });
});
