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
  moveFighterInList,
  normalizeRoster,
  rosterFingerprint,
  snapshotRoster,
  type Equipment,
  type Fighter,
  type Roster,
} from '@shared/roster';

type RosterState = {
  roster: Roster;
  savedRoster: Roster;
  currentFile: string;
  cleanFingerprint: string;
  isDirty: () => boolean;
  setRoster: (roster: Partial<Roster>, file?: string) => void;
  setMeta: (patch: Partial<Roster>) => void;
  reset: () => void;
  revertDraft: () => void;
  addFighter: () => string;
  copyFighter: (id: string) => string;
  moveFighter: (id: string, insertAt: number) => void;
  updateFighter: (id: string, patch: Partial<Fighter>) => void;
  removeFighter: (id: string) => void;
  addGear: (fighterId: string, kind?: 'weapon' | 'wargear') => void;
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

const empty = emptyRoster();

export const useRosterStore = create<RosterState>()(
  persist(
    (set, get) => ({
      roster: empty,
      savedRoster: snapshotRoster(empty),
      currentFile: '',
      cleanFingerprint: rosterFingerprint(empty),
      isDirty: () => rosterFingerprint(get().roster) !== get().cleanFingerprint,
      setRoster: (roster, file) => {
        const next = normalizeRoster(roster);
        set({
          roster: next,
          savedRoster: snapshotRoster(next),
          currentFile: file ?? (roster.id ? `${roster.id}.json` : ''),
          cleanFingerprint: rosterFingerprint(next),
        });
      },
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
      reset: () => {
        const roster = emptyRoster();
        set({
          roster,
          savedRoster: snapshotRoster(roster),
          currentFile: '',
          cleanFingerprint: rosterFingerprint(roster),
        });
      },
      revertDraft: () => {
        const saved = get().savedRoster;
        set({ roster: snapshotRoster(saved) });
      },
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
      moveFighter: (id, insertAt) =>
        set((state) => {
          const fighters = moveFighterInList(state.roster.fighters, id, insertAt);
          if (fighters === state.roster.fighters) return state;
          return { roster: { ...state.roster, fighters } };
        }),
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
      addGear: (fighterId, kind = 'weapon') =>
        set((state) => {
          if (!canAddFighters(state.roster)) return state;
          return {
            roster: {
              ...state.roster,
              fighters: state.roster.fighters.map((fighter) =>
                fighter.id === fighterId
                  ? { ...fighter, equipment: [...fighter.equipment, emptyGear(kind)] }
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
    {
      name: 'necromunda-roster-draft-v2',
      partialize: (state) => ({
        roster: state.roster,
        savedRoster: state.savedRoster,
        currentFile: state.currentFile,
        cleanFingerprint: state.cleanFingerprint,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.roster) return;
        if (!state.savedRoster) {
          state.savedRoster = snapshotRoster(state.roster);
        }
        if (!state.cleanFingerprint) {
          state.cleanFingerprint = rosterFingerprint(state.roster);
        }
      },
    },
  ),
);
