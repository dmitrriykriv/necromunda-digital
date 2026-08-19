import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  canAddFighters,
  canChangeFaction,
  cloneFighter,
  emptyFighter,
  emptyGear,
  emptyRoster,
  factionName,
  normalizeRoster,
  type Equipment,
  type Fighter,
  type Roster,
} from '@shared/roster';

type RosterState = {
  roster: Roster;
  currentFile: string;
  setRoster: (roster: Partial<Roster>, file?: string) => void;
  setMeta: (patch: Partial<Roster>) => void;
  reset: () => void;
  addFighter: () => string;
  copyFighter: (id: string) => string;
  updateFighter: (id: string, patch: Partial<Fighter>) => void;
  removeFighter: (id: string) => void;
  addGear: (fighterId: string) => void;
  updateGear: (fighterId: string, index: number, patch: Partial<Equipment>) => void;
  removeGear: (fighterId: string, index: number) => void;
};

function patchRoster(roster: Roster, patch: Partial<Roster>): Roster {
  const next = { ...roster, ...patch };
  if (patch.faction !== undefined) {
    next.factionName = factionName(patch.faction);
  }
  return next;
}

export const useRosterStore = create<RosterState>()(
  persist(
    (set, get) => ({
      roster: emptyRoster(),
      currentFile: '',
      setRoster: (roster, file) =>
        set({
          roster: normalizeRoster(roster),
          currentFile: file ?? (roster.id ? `${roster.id}.json` : ''),
        }),
      setMeta: (patch) =>
        set((state) => {
          if (
            patch.faction !== undefined &&
            patch.faction !== state.roster.faction &&
            !canChangeFaction(state.roster)
          ) {
            const { faction: _ignored, ...rest } = patch;
            if (Object.keys(rest).length === 0) return state;
            return { roster: patchRoster(state.roster, rest) };
          }
          return { roster: patchRoster(state.roster, patch) };
        }),
      reset: () => set({ roster: emptyRoster(), currentFile: '' }),
      addFighter: () => {
        if (!canAddFighters(get().roster)) return '';
        const fighter = emptyFighter(get().roster.fighters.length === 0);
        set((state) => ({
          roster: {
            ...state.roster,
            fighters: [...state.roster.fighters, fighter],
          },
        }));
        return fighter.id;
      },
      copyFighter: (id) => {
        const source = get().roster.fighters.find((fighter) => fighter.id === id);
        if (!source) return '';
        const copy = cloneFighter(source);
        set((state) => {
          const fighters = [...state.roster.fighters];
          const index = fighters.findIndex((fighter) => fighter.id === id);
          fighters.splice(index < 0 ? fighters.length : index + 1, 0, copy);
          return { roster: { ...state.roster, fighters } };
        });
        return copy.id;
      },
      updateFighter: (id, patch) =>
        set((state) => ({
          roster: {
            ...state.roster,
            fighters: state.roster.fighters.map((fighter) =>
              fighter.id === id ? { ...fighter, ...patch } : fighter,
            ),
          },
        })),
      removeFighter: (id) =>
        set((state) => ({
          roster: {
            ...state.roster,
            fighters: state.roster.fighters.filter((fighter) => fighter.id !== id),
          },
        })),
      addGear: (fighterId) =>
        set((state) => {
          if (!canAddFighters(state.roster)) return state;
          return {
            roster: {
              ...state.roster,
              fighters: state.roster.fighters.map((fighter) =>
                fighter.id === fighterId
                  ? { ...fighter, equipment: [...fighter.equipment, emptyGear()] }
                  : fighter,
              ),
            },
          };
        }),
      updateGear: (fighterId, index, patch) =>
        set((state) => ({
          roster: {
            ...state.roster,
            fighters: state.roster.fighters.map((fighter) =>
              fighter.id !== fighterId
                ? fighter
                : {
                    ...fighter,
                    equipment: fighter.equipment.map((item, i) =>
                      i === index ? { ...item, ...patch } : item,
                    ),
                  },
            ),
          },
        })),
      removeGear: (fighterId, index) =>
        set((state) => ({
          roster: {
            ...state.roster,
            fighters: state.roster.fighters.map((fighter) =>
              fighter.id !== fighterId
                ? fighter
                : {
                    ...fighter,
                    equipment: fighter.equipment.filter((_, i) => i !== index),
                  },
            ),
          },
        })),
    }),
    { name: 'necromunda-roster-draft-v2' },
  ),
);
