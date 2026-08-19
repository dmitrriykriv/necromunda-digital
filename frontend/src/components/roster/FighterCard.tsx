import type { ReactNode } from 'react';
import { Copy } from 'lucide-react';
import {
  equipmentGroups,
  findGear,
  findType,
  gearCost,
  visibleProfiles,
  type FactionCatalog,
} from '@shared/catalog';
import { WeaponProfileTable } from '@/components/roster/WeaponProfileTable';
import { fighterCost, splitList, type Equipment, type Fighter } from '@shared/roster';
import { useFactionCatalog } from '@/api/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';
import { useRosterStore } from '@/store/rosterStore';

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

export function FighterCard({ fighter }: { fighter: Fighter }) {
  const faction = useRosterStore((state) => state.roster.faction);
  const catalogQuery = useFactionCatalog(faction);
  const catalog = catalogQuery.data;
  const updateFighter = useRosterStore((state) => state.updateFighter);
  const removeFighter = useRosterStore((state) => state.removeFighter);
  const addGear = useRosterStore((state) => state.addGear);
  const copyFighter = useRosterStore((state) => state.copyFighter);
  const updateGear = useRosterStore((state) => state.updateGear);
  const removeGear = useRosterStore((state) => state.removeGear);

  const typeNames = catalog?.types.map((item) => item.name) ?? [];
  const typeOptions =
    fighter.type && !typeNames.includes(fighter.type)
      ? [fighter.type, ...typeNames]
      : typeNames;

  const subtypeOptions = Array.from(
    new Set([...(catalog?.subtypes ?? []), ...fighter.subtypes]),
  );

  function applyType(name: string) {
    const def = findType(catalog, name);
    updateFighter(fighter.id, {
      type: name,
      subtypes: def?.subtypes ?? fighter.subtypes,
      baseCost: def?.baseCost ?? fighter.baseCost,
      xp: def?.xp ?? fighter.xp,
    });
  }

  function toggleSubtype(subtype: string, on: boolean) {
    const next = on
      ? [...fighter.subtypes, subtype]
      : fighter.subtypes.filter((item) => item !== subtype);
    updateFighter(fighter.id, { subtypes: next });
  }

  return (
    <Card
      id={`fighter-${fighter.id}`}
      className="mb-3 scroll-mt-36 border-l-[3px] border-l-primary"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
          {fighter.name || 'Боец'}
        </h4>
        <Badge variant="gold">{fighterCost(fighter)} кредитов</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Имя">
            <Input
              value={fighter.name}
              onChange={(event) => updateFighter(fighter.id, { name: event.target.value })}
            />
          </Field>
          <Field label="Тип из списка банды">
            <NativeSelect
              value={fighter.type}
              disabled={!faction || catalogQuery.isLoading}
              onChange={(event) => applyType(event.target.value)}
            >
              <option value="">
                {!faction
                  ? 'Сначала выберите банду'
                  : catalogQuery.isLoading
                    ? 'Загрузка списка…'
                    : '— выберите тип —'}
              </option>
              {typeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="flex flex-col gap-1.5 xl:col-span-1 md:col-span-2">
            <Label>Подтипы</Label>
            {subtypeOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {!faction ? 'Сначала выберите банду' : 'Список подтипов пуст'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {subtypeOptions.map((subtype) => {
                  const checked = fighter.subtypes.includes(subtype);
                  return (
                    <label
                      key={subtype}
                      className={cn(
                        'cursor-pointer rounded-md border px-2 py-1 text-xs font-medium',
                        checked
                          ? 'border-primary bg-primary/15 text-accent-foreground'
                          : 'border-input bg-background text-muted-foreground hover:border-primary',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={(event) => toggleSubtype(subtype, event.target.checked)}
                      />
                      {subtype}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <Field label="Стартовый XP">
            <Input
              type="number"
              min={0}
              value={fighter.xp}
              onChange={(event) =>
                updateFighter(fighter.id, { xp: Number(event.target.value) || 0 })
              }
            />
          </Field>
          <Field label="Базовая стоимость">
            <Input
              type="number"
              min={0}
              value={fighter.baseCost}
              onChange={(event) =>
                updateFighter(fighter.id, { baseCost: Number(event.target.value) || 0 })
              }
            />
          </Field>
          <Field label="Навыки через запятую">
            <Input
              placeholder="Inspiring, Iron Will"
              value={fighter.skills.join(', ')}
              onChange={(event) =>
                updateFighter(fighter.id, { skills: splitList(event.target.value) })
              }
            />
          </Field>
        </div>

        <div>
          <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Снаряжение
          </h5>
          <div className="space-y-2">
            {fighter.equipment.map((item, index) => (
              <GearRow
                key={`${fighter.id}-gear-${index}`}
                fighterId={fighter.id}
                index={index}
                item={item}
                catalog={catalog}
                hasFaction={Boolean(faction)}
                loading={catalogQuery.isLoading}
                onChange={updateGear}
                onRemove={removeGear}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!faction}
              title={faction ? undefined : 'Сначала выберите банду'}
              onClick={() => addGear(fighter.id)}
            >
              + предмет
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const id = copyFighter(fighter.id);
                if (!id) return;
                window.setTimeout(() => {
                  document.getElementById(`fighter-${id}`)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }, 0);
              }}
            >
              <Copy />
              Скопировать бойца
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => removeFighter(fighter.id)}
            >
              Удалить бойца
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GearRow({
  fighterId,
  index,
  item,
  catalog,
  hasFaction,
  loading,
  onChange,
  onRemove,
}: {
  fighterId: string;
  index: number;
  item: Equipment;
  catalog: FactionCatalog | undefined;
  hasFaction: boolean;
  loading: boolean;
  onChange: (fighterId: string, index: number, patch: Partial<Equipment>) => void;
  onRemove: (fighterId: string, index: number) => void;
}) {
  const groups = equipmentGroups(catalog);
  const names = catalog?.equipment.map((entry) => entry.name) ?? [];
  const hasList = names.length > 0;
  const extra = item.name && !names.includes(item.name) ? item.name : '';
  const def = findGear(catalog, item.name);
  const extras = item.extras ?? [];
  const profiles = visibleProfiles(def, extras);

  function applyName(name: string) {
    const next = findGear(catalog, name);
    onChange(fighterId, index, {
      name,
      cost: next?.cost ?? item.cost,
      slots: next?.slots ?? item.slots,
      extras: [],
    });
  }

  function toggleExtra(upgradeName: string, on: boolean) {
    const next = on
      ? [...extras, upgradeName]
      : extras.filter((entry) => entry !== upgradeName);
    onChange(fighterId, index, {
      extras: next,
      cost: def ? gearCost(def, next) : item.cost,
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_88px_72px_auto] gap-2">
        {hasList ? (
          <NativeSelect
            value={item.name}
            disabled={!hasFaction || loading}
            onChange={(event) => applyName(event.target.value)}
          >
            <option value="">
              {!hasFaction
                ? 'Сначала выберите банду'
                : loading
                  ? 'Загрузка списка…'
                  : '— выберите предмет —'}
            </option>
            {extra && <option value={extra}>{extra}</option>}
            {groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((entry) => (
                  <option key={`${group.label}-${entry.name}`} value={entry.name}>
                    {entry.name} · {entry.cost} cr
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        ) : (
          <Input
            placeholder={hasFaction ? 'Оружие или снаряжение' : 'Сначала выберите банду'}
            value={item.name}
            onChange={(event) => onChange(fighterId, index, { name: event.target.value })}
          />
        )}
        <Input
          type="number"
          min={0}
          step={5}
          title="Стоимость"
          value={item.cost}
          onChange={(event) =>
            onChange(fighterId, index, { cost: Number(event.target.value) || 0 })
          }
        />
        <Input
          type="number"
          min={0}
          max={2}
          title="Слоты оружия"
          value={item.slots}
          onChange={(event) =>
            onChange(fighterId, index, { slots: Number(event.target.value) || 0 })
          }
        />
        <Button type="button" variant="destructive" size="icon" onClick={() => onRemove(fighterId, index)}>
          ×
        </Button>
      </div>
      {def?.upgrades?.length ? (
        <div className="flex flex-wrap gap-1.5 pl-0.5">
          {def.upgrades.map((upgrade) => {
            const checked = extras.includes(upgrade.name);
            return (
              <label
                key={upgrade.name}
                className={cn(
                  'cursor-pointer rounded-md border px-2 py-1 text-xs font-medium',
                  checked
                    ? 'border-primary bg-primary/15 text-accent-foreground'
                    : 'border-input bg-background text-muted-foreground hover:border-primary',
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={(event) => toggleExtra(upgrade.name, event.target.checked)}
                />
                {upgrade.name} +{upgrade.cost} cr
              </label>
            );
          })}
        </div>
      ) : null}
      {profiles.length > 0 ? <WeaponProfileTable profiles={profiles} /> : null}
    </div>
  );
}
