import { Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PrintNameCards } from '@/components/roster/PrintNameCards';
import { Button } from '@/components/ui/button';
import { useRosterStore } from '@/store/rosterStore';

export function PrintSmallCardsPage() {
  const roster = useRosterStore((state) => state.roster);
  const fighters = roster.fighters.filter(
    (fighter) => fighter.name || fighter.type || fighter.equipment.length,
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="print-toolbar border-b border-border bg-gradient-to-b from-[#1d2029] to-[#16181f] px-6 py-6">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/" className="text-sm text-accent-foreground hover:underline">
              ← К построителю
            </Link>
            <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.28em] text-primary">
              Маленькие карточки
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {roster.name || 'Без названия'}
              {roster.author ? ` · ${roster.author}` : ''}
              {roster.factionName ? ` · ${roster.factionName}` : ''}
              {fighters.length ? ` · ${fighters.length} карт` : ''}
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Только бирки 63×88 мм с именем и типом — тот лист, который в полной
              печати идёт последним. На страницу помещается 9 карточек.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/print">Большие карточки</Link>
            </Button>
            <Button type="button" onClick={() => window.print()} disabled={fighters.length === 0}>
              <Printer />
              Печать
            </Button>
          </div>
        </div>
      </header>

      <main className="print-sheet mx-auto max-w-[1100px] p-6 pb-16">
        {fighters.length === 0 ? (
          <p className="italic text-muted-foreground">
            В ростере ещё нет бойцов. Добавьте их в построителе, затем вернитесь сюда.
          </p>
        ) : (
          <PrintNameCards fighters={fighters} showIntro={false} />
        )}
      </main>
    </div>
  );
}
