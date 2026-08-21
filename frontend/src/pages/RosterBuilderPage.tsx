import { useEffect, useState } from 'react';
import { Download, Printer, Save, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { rosterWarnings, slugify, type Roster } from '@shared/roster';
import { useApiHealth, useFactionCatalog, useSaveRoster } from '@/api/hooks';
import { FighterCard } from '@/components/roster/FighterCard';
import { GangMetaForm } from '@/components/roster/GangMetaForm';
import { RosterSidebar } from '@/components/roster/RosterSidebar';
import { TotalsBar } from '@/components/roster/TotalsBar';
import { Button } from '@/components/ui/button';
import { downloadRoster, readJsonFile } from '@/lib/files';
import { handbook } from '@/lib/links';
import { confirmUnsaved } from '@/lib/unsaved';
import { useRosterStore } from '@/store/rosterStore';

export function RosterBuilderPage() {
  const roster = useRosterStore((state) => state.roster);
  const currentFile = useRosterStore((state) => state.currentFile);
  const setRoster = useRosterStore((state) => state.setRoster);
  const save = useSaveRoster();
  const health = useApiHealth();
  const catalogQuery = useFactionCatalog(roster.faction);
  const [status, setStatus] = useState<{ text: string; ok?: boolean } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; edge: 'before' | 'after' } | null>(null);
  const moveFighter = useRosterStore((state) => state.moveFighter);
  const warnings = rosterWarnings(roster, catalogQuery.data);
  const offline = health.isFetched && !health.isSuccess;
  const fighterIds = roster.fighters.map((fighter) => fighter.id);
  const allCollapsed =
    fighterIds.length > 0 && fighterIds.every((id) => collapsed.has(id));

  function toggleFighterCard(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function collapseAllCards() {
    setCollapsed(allCollapsed ? new Set() : new Set(fighterIds));
  }

  function moveFighterBy(id: string, delta: number) {
    const from = roster.fighters.findIndex((fighter) => fighter.id === id);
    if (from < 0) return;
    moveFighter(id, from + (delta > 0 ? delta + 1 : delta));
  }

  function dropFighter(targetId: string, edge: 'before' | 'after') {
    if (!dragId || dragId === targetId) return;
    const target = roster.fighters.findIndex((fighter) => fighter.id === targetId);
    if (target < 0) return;
    moveFighter(dragId, edge === 'before' ? target : target + 1);
    setDragId(null);
    setOver(null);
  }

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (!useRosterStore.getState().isDirty()) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, []);

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
    if (offline) {
      setStatus({
        text: 'Сервер недоступен. Список слева не обновится — можно скачать копию.',
        ok: false,
      });
      return;
    }
    try {
      const result = await save.mutateAsync(data);
      setRoster(result.roster, result.file);
      setStatus({ text: 'Сохранено в список слева.', ok: true });
    } catch {
      setStatus({
        text: 'Не удалось записать в список. Можно скачать копию и открыть её позже.',
        ok: false,
      });
    }
  }

  function onExport() {
    const data = payload();
    if (!data.name) {
      setStatus({ text: 'Сначала укажите название банды.', ok: false });
      return;
    }
    downloadRoster(data);
    setStatus({ text: 'Скачана копия JSON — это запасной файл, не запись в список.', ok: true });
  }

  async function onOpenFile(file: File | undefined) {
    if (!file) return;
    if (!confirmUnsaved()) return;
    try {
      const data = (await readJsonFile(file)) as Roster;
      setRoster(data, '');
      setStatus({
        text: `Открыт ${file.name}. «Сохранить» добавит банду в список слева.`,
        ok: true,
      });
    } catch (error) {
      setStatus({
        text: error instanceof Error ? error.message : 'Это не JSON ростера.',
        ok: false,
      });
    }
  }

  const hint = status?.text
    ?? (save.isPending
      ? 'Сохранение…'
      : offline
        ? 'Черновик в этом браузере. Сервер недоступен — список слева не открыть, можно скачать копию.'
        : currentFile
          ? ''
          : 'Черновик в этом браузере. «Сохранить» добавит банду в список слева.');

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-gradient-to-b from-[#1d2029] to-[#16181f] px-6 py-8 text-center">
        <a
          href={handbook.home}
          className="mb-3 inline-block text-sm text-accent-foreground hover:underline"
          onClick={(event) => {
            if (!confirmUnsaved()) event.preventDefault();
          }}
        >
          ← На главную
        </a>
        <h1 className="text-3xl font-semibold uppercase tracking-[0.35em] text-primary">
          Necromunda
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Составить ростер — бойцы, снаряжение и рейтинг
        </p>
      </header>

      <div className="mx-auto grid max-w-[1500px] md:grid-cols-[310px_minmax(0,1fr)]">
        <RosterSidebar />
        <main className="min-w-0 p-6 pb-20">
          <TotalsBar
            onCollapseAll={collapseAllCards}
            canCollapse={roster.fighters.length > 0}
            collapseLabel={allCollapsed ? 'Развернуть все' : 'Свернуть все'}
          />
          {warnings.length > 0 && (
            <div className="mb-4 rounded-r-lg border-l-[3px] border-destructive bg-destructive/15 px-4 py-3 text-sm text-red-200">
              {warnings.map((msg) => (
                <p key={msg} className="[&:not(:last-child)]:mb-1.5">
                  {msg}
                </p>
              ))}
            </div>
          )}
          <GangMetaForm />
          <div className="mb-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onSave()} disabled={save.isPending || offline}>
              <Save />
              Сохранить
            </Button>
            <Button type="button" variant="outline" onClick={onExport}>
              <Download />
              Скачать копию
            </Button>
            <Button type="button" variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload />
                Открыть файл
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
            <Button type="button" variant="outline" asChild>
              <Link to="/print">
                <Printer />
                Карточки для печати
              </Link>
            </Button>
          </div>
          {hint ? (
            <p
              className={`mb-4 min-h-6 text-sm ${
                status?.ok === false
                  ? 'text-red-300'
                  : status?.ok
                    ? 'text-lime-400'
                    : 'text-muted-foreground'
              }`}
            >
              {hint}
            </p>
          ) : null}
          {roster.fighters.length === 0 ? (
            <p className="italic text-muted-foreground">
              {roster.faction
                ? 'Бойцов пока нет. Добавьте лидера, затем чемпионов и гангеров.'
                : 'Сначала выберите банду — от неё зависят типы бойцов и снаряжение.'}
            </p>
          ) : (
            roster.fighters.map((fighter, index) => (
              <FighterCard
                key={fighter.id}
                fighter={fighter}
                open={!collapsed.has(fighter.id)}
                onToggle={() => toggleFighterCard(fighter.id)}
                index={index}
                count={roster.fighters.length}
                dragging={dragId === fighter.id}
                dropEdge={over?.id === fighter.id ? over.edge : null}
                onMoveBy={(delta) => moveFighterBy(fighter.id, delta)}
                onDragStart={() => {
                  setDragId(fighter.id);
                  setOver(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOver(null);
                }}
                onDragOverCard={(edge) => {
                  if (dragId && dragId !== fighter.id) setOver({ id: fighter.id, edge });
                }}
                onDropOnCard={(edge) => dropFighter(fighter.id, edge)}
              />
            ))
          )}
        </main>
      </div>

      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        <p>
          Типы бойцов и снаряжение подставляются из списка выбранной банды.
          «Сохранить» пишет банду в список слева; черновик в этом браузере не пропадает
          при обновлении страницы.
        </p>
        <p className="mt-2">
          <a
            href={handbook.home}
            className="text-accent-foreground hover:underline"
            onClick={(event) => {
              if (!confirmUnsaved()) event.preventDefault();
            }}
          >
            ← На главную
          </a>
        </p>
      </footer>
    </div>
  );
}
