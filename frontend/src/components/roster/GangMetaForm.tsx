import { canChangeFaction, FACTIONS } from '@shared/roster';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRosterStore } from '@/store/rosterStore';

export function GangMetaForm() {
  const roster = useRosterStore((state) => state.roster);
  const setMeta = useRosterStore((state) => state.setMeta);
  const factionLocked = !canChangeFaction(roster);

  return (
    <section className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1.5">
        <Label htmlFor="gang-name">Название банды</Label>
        <Input
          id="gang-name"
          value={roster.name}
          placeholder="Гимн Пепельной часовни"
          onChange={(event) => setMeta({ name: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <Label htmlFor="gang-faction">Банда</Label>
        <select
          id="gang-faction"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          value={roster.faction}
          disabled={factionLocked}
          onChange={(event) => setMeta({ faction: event.target.value })}
        >
          {FACTIONS.map((faction) => (
            <option key={faction.id || 'none'} value={faction.id}>
              {faction.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {factionLocked
            ? 'Чтобы сменить банду, сначала удалите всех бойцов.'
            : 'От выбранной банды зависят типы и снаряжение.'}
        </span>
      </label>
      <label className="flex flex-col gap-1.5">
        <Label htmlFor="gang-rep">Репутация</Label>
        <Input
          id="gang-rep"
          type="number"
          min={1}
          value={roster.reputation}
          onChange={(event) =>
            setMeta({ reputation: Math.max(1, Number(event.target.value) || 1) })
          }
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <Label htmlFor="gang-stash">Лимит кредитов</Label>
        <Input
          id="gang-stash"
          type="number"
          min={0}
          step={5}
          value={roster.stash}
          onChange={(event) => setMeta({ stash: Number(event.target.value) || 0 })}
        />
        <span className="text-xs text-muted-foreground">
          Мягкий потолок сборки (обычно 1000). 0 — без ограничения.
        </span>
      </label>
      <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4">
        <Label htmlFor="gang-notes">Заметки</Label>
        <Textarea
          id="gang-notes"
          rows={2}
          placeholder="Путь дома, кампания, договорённости арбитра…"
          value={roster.notes}
          onChange={(event) => setMeta({ notes: event.target.value })}
        />
      </label>
    </section>
  );
}
