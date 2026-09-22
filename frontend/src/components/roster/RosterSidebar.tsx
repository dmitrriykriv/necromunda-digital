import { useMemo, useState } from 'react';
import { Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import { cloneRoster, rosterIndexMeta } from '@shared/roster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  fetchRoster,
  useApiHealth,
  useDeleteRoster,
  useRosterIndex,
  useSaveRoster,
} from '@/api/hooks';
import { handbook } from '@/lib/links';
import { confirmUnsaved } from '@/lib/unsaved';
import { useRosterStore } from '@/store/rosterStore';

export function RosterSidebar() {
  const currentFile = useRosterStore((state) => state.currentFile);
  const reset = useRosterStore((state) => state.reset);
  const setRoster = useRosterStore((state) => state.setRoster);
  const health = useApiHealth();
  const index = useRosterIndex();
  const save = useSaveRoster();
  const remove = useDeleteRoster();
  const online = health.isSuccess;
  const [query, setQuery] = useState('');
  const rosters = useMemo(() => {
    const list = index.data?.rosters ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((item) => {
      const haystack = [item.name, item.author, item.factionName, item.faction]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [index.data?.rosters, query]);

  async function copySaved(file: string) {
    try {
      const data = await fetchRoster(file);
      await save.mutateAsync(cloneRoster(data));
    } catch {
      /* список обновится при следующем удачном сохранении */
    }
  }

  async function openSaved(file: string) {
    if (file === currentFile && !useRosterStore.getState().isDirty()) return;
    if (!confirmUnsaved()) return;
    const data = await fetchRoster(file);
    setRoster(data, file);
  }

  function newRoster() {
    if (!confirmUnsaved()) return;
    reset();
  }

  function deleteSaved(file: string) {
    const wipingOpen = currentFile === file;
    if (wipingOpen && !confirmUnsaved()) return;
    remove.mutate(file, {
      onSuccess: () => {
        if (wipingOpen) reset();
      },
    });
  }

  return (
    <aside className="roster-sidebar border-b border-border bg-card p-4 md:sticky md:top-0 md:row-span-2 md:flex md:h-screen md:flex-col md:self-start md:border-b-0 md:border-r">
      <div className="roster-sidebar-body min-h-0 md:flex-1 md:overflow-y-auto">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Ростеры
      </h2>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {online
          ? 'Список сохранённых банд. «Сохранить» записывает текущую сюда.'
          : 'Список файлов недоступен. Правки остаются в этом браузере; можно скачать копию.'}
      </p>
      <Button type="button" variant="outline" className="mb-3 w-full" onClick={newRoster}>
        <Plus />
        Новый ростер
      </Button>
      {(index.data?.rosters.length ?? 0) > 0 ? (
        <Input
          type="search"
          value={query}
          placeholder="Найти по автору или названию"
          className="mb-3"
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}
      <ul className="space-y-2">
        {index.isLoading && (
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" />
            Загрузка списка…
          </li>
        )}
        {index.data?.rosters.length === 0 && (
          <li className="text-sm text-muted-foreground">Пока нет сохранённых банд.</li>
        )}
        {index.data && index.data.rosters.length > 0 && rosters.length === 0 ? (
          <li className="text-sm text-muted-foreground">Ничего не найдено.</li>
        ) : null}
        {rosters.map((item) => {
          const meta = rosterIndexMeta(item);
          return (
          <li key={item.file} className="flex items-stretch gap-1">
            <button
              type="button"
              className={`flex min-w-0 flex-1 flex-col rounded-md border px-3 py-2 text-left text-sm ${
                currentFile === item.file
                  ? 'border-primary bg-primary/15'
                  : 'border-border bg-background hover:border-primary'
              }`}
              onClick={() => {
                void openSaved(item.file);
              }}
            >
              <strong className="truncate">{item.name}</strong>
              {meta ? (
                <span className="truncate text-xs text-muted-foreground">{meta}</span>
              ) : null}
              {item.author ? (
                <span className="truncate text-xs text-muted-foreground">{item.author}</span>
              ) : null}
            </button>
            {online && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-auto min-h-9 w-9 shrink-0 self-stretch"
                  title="Скопировать ростер"
                  disabled={save.isPending}
                  onClick={() => {
                    void copySaved(item.file);
                  }}
                >
                  <Copy />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-auto min-h-9 w-9 shrink-0 self-stretch"
                  title="Удалить из списка"
                  onClick={() => {
                    deleteSaved(item.file);
                  }}
                >
                  <Trash2 />
                </Button>
              </>
            )}
          </li>
          );
        })}
      </ul>
      <Separator className="my-4" />
      <nav className="space-y-1 text-sm">
        <a
          className="block text-accent-foreground hover:underline"
          href={handbook.example}
          onClick={(event) => {
            if (!confirmUnsaved()) event.preventDefault();
          }}
        >
          Учебный пример Каудор
        </a>
        <a
          className="block text-accent-foreground hover:underline"
          href={handbook.gangs}
          onClick={(event) => {
            if (!confirmUnsaved()) event.preventDefault();
          }}
        >
          Списки банд
        </a>
        <a
          className="block text-accent-foreground hover:underline"
          href={handbook.createGang}
          onClick={(event) => {
            if (!confirmUnsaved()) event.preventDefault();
          }}
        >
          Правила создания банды
        </a>
      </nav>
      </div>
    </aside>
  );
}
