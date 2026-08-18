import { gangRating, gangWealth } from '@shared/roster';
import { useRosterStore } from '@/store/rosterStore';

const ITEMS = [
  { key: 'models', label: 'Модели' },
  { key: 'rating', label: 'Рейтинг' },
  { key: 'stash', label: 'Запас' },
  { key: 'wealth', label: 'Богатство' },
] as const;

export function TotalsBar() {
  const roster = useRosterStore((state) => state.roster);
  const values = {
    models: roster.fighters.length,
    rating: gangRating(roster),
    stash: Number(roster.stash) || 0,
    wealth: gangWealth(roster),
  };

  return (
    <div className="sticky top-0 z-10 mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-4">
      {ITEMS.map((item) => (
        <div key={item.key}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {item.label}
          </div>
          <div className="text-xl font-semibold tabular-nums text-amber-200">
            {values[item.key]}
          </div>
        </div>
      ))}
    </div>
  );
}
