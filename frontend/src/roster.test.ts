import { describe, expect, it } from 'vitest';
import { namesMatch, visibleProfiles, type EquipmentDef } from '@shared/catalog';
import {
  fighterCost,
  gangRating,
  normalizeRoster,
  rosterWarnings,
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

  it('rates a gang', () => {
    expect(gangRating(sample)).toBe(315);
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
});
