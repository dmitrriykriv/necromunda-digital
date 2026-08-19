import { Plus } from 'lucide-react';
import { canAddFighters, creditLimit, creditsRemaining, gangRating } from '@shared/roster';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRosterStore } from '@/store/rosterStore';

export function TotalsBar() {
  const roster = useRosterStore((state) => state.roster);
  const addFighter = useRosterStore((state) => state.addFighter);
  const rating = gangRating(roster);
  const limit = creditLimit(roster);
  const remaining = creditsRemaining(roster);
  const allowAdd = canAddFighters(roster);

  function onAdd() {
    const id = addFighter();
    if (!id) return;
    window.setTimeout(() => {
      document.getElementById(`fighter-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }

  return (
    <div className="sticky top-0 z-10 mb-4 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center">
      <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Модели" value={roster.fighters.length} />
        <Stat label="Лимит" value={limit > 0 ? limit : '—'} />
        <Stat label="Рейтинг" value={rating} />
        <Stat
          label="Остаток"
          value={remaining === null ? '—' : remaining}
          warn={remaining !== null && remaining < 0}
        />
      </div>
      <Button
        type="button"
        className="w-full shrink-0 md:w-auto"
        disabled={!allowAdd}
        title={allowAdd ? undefined : 'Сначала выберите банду'}
        onClick={onAdd}
      >
        <Plus />
        Добавить бойца
      </Button>
    </div>
  );
}

function Stat({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: number | string;
  warn?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'text-xl font-semibold tabular-nums',
          warn ? 'text-red-300' : 'text-amber-200',
        )}
      >
        {value}
      </div>
    </div>
  );
}
