import { Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import { cloneRoster } from '@shared/roster';
import { Button } from '@/components/ui/button';
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
    <aside className="border-b border-border bg-card p-4 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-b-0 md:border-r">
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
        {index.data?.rosters.map((item) => (
          <li key={item.file} className="flex gap-1">
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
              <span className="text-xs text-muted-foreground">
                {item.factionName || item.faction}
                {item.rating ? ` · ${item.rating} cr` : ''}
              </span>
            </button>
            {online && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
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
        ))}
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
    </aside>
  );
}
