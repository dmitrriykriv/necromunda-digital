import { useState } from 'react';
import { Download, Plus, Printer, Save, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { rosterWarnings, slugify, type Roster } from '@shared/roster';
import { useSaveRoster } from '@/api/hooks';
import { FighterCard } from '@/components/roster/FighterCard';
import { GangMetaForm } from '@/components/roster/GangMetaForm';
import { RosterSidebar } from '@/components/roster/RosterSidebar';
import { TotalsBar } from '@/components/roster/TotalsBar';
import { Button } from '@/components/ui/button';
import { downloadRoster, readJsonFile } from '@/lib/files';
import { handbook } from '@/lib/links';
import { useRosterStore } from '@/store/rosterStore';

export function RosterBuilderPage() {
  const roster = useRosterStore((state) => state.roster);
  const setRoster = useRosterStore((state) => state.setRoster);
  const addFighter = useRosterStore((state) => state.addFighter);
  const save = useSaveRoster();
  const [status, setStatus] = useState<{ text: string; ok?: boolean } | null>(null);
  const warnings = rosterWarnings(roster);

  function payload(): Roster {
    const name = roster.name.trim();
    return {
      ...roster,
      name,
      notes: roster.notes.trim(),
      id: slugify(roster.id || name || 'roster'),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  }

  async function onSave() {
    const data = payload();
    if (!data.name) {
      setStatus({ text: 'Сначала укажите название банды.', ok: false });
      return;
    }
    try {
      const result = await save.mutateAsync(data);
      setRoster(result.roster, result.file);
      setStatus({ text: `Записано в rosters/${result.file}`, ok: true });
    } catch {
      downloadRoster(data);
      setStatus({
        text: 'API недоступен — JSON скачан. Положите файл в папку rosters/.',
        ok: false,
      });
    }
  }

  async function onOpenFile(file: File | undefined) {
    if (!file) return;
    try {
      const data = (await readJsonFile(file)) as Roster;
      setRoster(data, file.name);
      setStatus({ text: `Загружен ${file.name}`, ok: true });
    } catch (error) {
      setStatus({
        text: error instanceof Error ? error.message : 'Это не JSON ростера.',
        ok: false,
      });
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-gradient-to-b from-[#1d2029] to-[#16181f] px-6 py-8 text-center">
        <a
          href={handbook.home}
          className="mb-3 inline-block text-sm text-accent-foreground hover:underline"
        >
          ← На главную
        </a>
        <h1 className="text-3xl font-semibold uppercase tracking-[0.35em] text-primary">
          Necromunda
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Составить ростер — React-прототип, JSON в папке <code>rosters/</code>
        </p>
      </header>

      <div className="mx-auto grid max-w-[1500px] md:grid-cols-[310px_minmax(0,1fr)]">
        <RosterSidebar />
        <main className="min-w-0 p-6 pb-20">
          <TotalsBar />
          {warnings.length > 0 && (
            <p className="mb-4 rounded-r-lg border-l-[3px] border-destructive bg-destructive/15 px-4 py-3 text-sm text-red-200">
              {warnings.join(' ')}
            </p>
          )}
          <GangMetaForm />
          <div className="mb-2 flex flex-wrap gap-2">
            <Button type="button" onClick={onSave} disabled={save.isPending}>
              <Save />
              Сохранить в папку
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                downloadRoster(payload());
                setStatus({ text: 'Файл скачан.', ok: true });
              }}
            >
              <Download />
              Скачать JSON
            </Button>
            <Button type="button" variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload />
                Открыть JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(event) => {
                    void onOpenFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
            </Button>
            <Button type="button" variant="outline" onClick={() => addFighter()}>
              <Plus />
              Добавить бойца
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/print">
                <Printer />
                Карточки для печати
              </Link>
            </Button>
          </div>
          <p
            className={`mb-4 min-h-6 text-sm ${
              status?.ok === false
                ? 'text-red-300'
                : status?.ok
                  ? 'text-lime-400'
                  : 'text-muted-foreground'
            }`}
          >
            {status?.text ?? (save.isPending ? 'Сохранение…' : '')}
          </p>
          {roster.fighters.length === 0 ? (
            <p className="italic text-muted-foreground">
              Бойцов пока нет. Добавьте лидера, затем чемпионов и гангеров.
            </p>
          ) : (
            roster.fighters.map((fighter) => (
              <FighterCard key={fighter.id} fighter={fighter} />
            ))
          )}
        </main>
      </div>

      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        <p>
          Каталог оружия банд пока не подключён: стоимость и снаряжение вводятся вручную.
          Готовые ростеры — отдельные JSON в <code>rosters/</code>.
        </p>
        <p className="mt-2">
          <a href={handbook.home} className="text-accent-foreground hover:underline">
            ← На главную
          </a>
        </p>
      </footer>
    </div>
  );
}
