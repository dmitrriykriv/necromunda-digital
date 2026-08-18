import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { fetchRoster, useApiHealth, useDeleteRoster, useRosterIndex } from '@/api/hooks';
import { handbook } from '@/lib/links';
import { useRosterStore } from '@/store/rosterStore';

export function RosterSidebar() {
  const currentFile = useRosterStore((state) => state.currentFile);
  const reset = useRosterStore((state) => state.reset);
  const setRoster = useRosterStore((state) => state.setRoster);
  const health = useApiHealth();
  const index = useRosterIndex();
  const remove = useDeleteRoster();
  const online = health.isSuccess;

  return (
    <aside className="border-b border-border bg-card p-4 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-b-0 md:border-r">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Ростеры
      </h2>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {online
          ? 'Сервер запущен: «Сохранить» пишет JSON в папку rosters/.'
          : 'Нет связи с API. Запустите npm run dev в корне проекта — черновик всё равно хранится в браузере.'}
      </p>
      <Button type="button" variant="outline" className="mb-3 w-full" onClick={() => reset()}>
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
          <li className="text-sm text-muted-foreground">В папке пока нет файлов.</li>
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
              onClick={async () => {
                const data = await fetchRoster(item.file);
                setRoster(data, item.file);
              }}
            >
              <strong className="truncate">{item.name}</strong>
              <span className="text-xs text-muted-foreground">
                {item.factionName || item.faction}
                {item.rating ? ` · ${item.rating} cr` : ''}
              </span>
            </button>
            {online && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                title="Удалить файл"
                onClick={() => {
                  remove.mutate(item.file, {
                    onSuccess: () => {
                      if (currentFile === item.file) reset();
                    },
                  });
                }}
              >
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Separator className="my-4" />
      <nav className="space-y-1 text-sm">
        <a className="block text-accent-foreground hover:underline" href={handbook.example}>
          Учебный пример Каудор
        </a>
        <a className="block text-accent-foreground hover:underline" href={handbook.gangs}>
          Списки банд
        </a>
        <a className="block text-accent-foreground hover:underline" href={handbook.createGang}>
          Правила создания банды
        </a>
      </nav>
    </aside>
  );
}
