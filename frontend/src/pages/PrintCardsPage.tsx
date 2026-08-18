import { Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFactionCatalog } from '@/api/hooks';
import { PrintFighterCard } from '@/components/roster/PrintFighterCard';
import { Button } from '@/components/ui/button';
import { useRosterStore } from '@/store/rosterStore';

export function PrintCardsPage() {
  const roster = useRosterStore((state) => state.roster);
  const catalogQuery = useFactionCatalog(roster.faction);
  const catalog = catalogQuery.data;
  const fighters = roster.fighters.filter((fighter) => fighter.name || fighter.type || fighter.equipment.length);

  return (
    <div className="min-h-screen bg-background">
      <header className="print-toolbar border-b border-border bg-gradient-to-b from-[#1d2029] to-[#16181f] px-6 py-6">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/" className="text-sm text-accent-foreground hover:underline">
              ← К построителю
            </Link>
            <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.28em] text-primary">
              Карточки бойцов
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {roster.name || 'Без названия'}
              {roster.factionName ? ` · ${roster.factionName}` : ''}
              {fighters.length ? ` · ${fighters.length} карт` : ''}
            </p>
          </div>
          <Button type="button" onClick={() => window.print()} disabled={fighters.length === 0}>
            <Printer />
            Печать
          </Button>
        </div>
      </header>

      <main className="print-sheet mx-auto max-w-[1100px] space-y-5 p-6 pb-16">
        {catalogQuery.isLoading && roster.faction ? (
          <p className="text-sm text-muted-foreground">Загрузка каталога банды…</p>
        ) : null}
        {fighters.length === 0 ? (
          <p className="italic text-muted-foreground">
            В ростере ещё нет бойцов. Добавьте их в построителе, затем вернитесь сюда.
          </p>
        ) : (
          fighters.map((fighter) => (
            <PrintFighterCard
              key={fighter.id}
              fighter={fighter}
              roster={roster}
              catalog={catalog}
            />
          ))
        )}
      </main>
    </div>
  );
}
