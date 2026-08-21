import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, Copy, GripVertical } from 'lucide-react';
import {
  allSkillNames,
  catalogArchetypes,
  equipmentGroups,
  findGear,
  findSkill,
  findSkillSet,
  findType,
  gearCost,
  isWeaponItem,
  orderedSkillSets,
  skillAccessFor,
  skillAccessLevel,
  skillOptionLabel,
  skillSetGroupLabel,
  splitNamedRule,
  visibleProfiles,
  type FactionCatalog,
  type SkillAccessLevel,
} from '@shared/catalog';
import { FighterStatsTable } from '@/components/roster/FighterStatsTable';
import { WeaponProfileTable } from '@/components/roster/WeaponProfileTable';
import { fighterCost, weaponSlotMax, weaponSlotOverMessage, weaponSlotsUsed, type Equipment, type Fighter } from '@shared/roster';
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

const SKILL_ACCESS_COLOR: Record<SkillAccessLevel, string> = {
  primary: '#f0954a',
  secondary: '#5b9dd9',
};

function skillAccessClass(level: SkillAccessLevel | undefined) {
  if (level === 'primary') return 'skill-access-p';
  if (level === 'secondary') return 'skill-access-s';
  return undefined;
}

function skillAccessStyle(level: SkillAccessLevel | undefined) {
  if (!level) return undefined;
  return {
    color: SKILL_ACCESS_COLOR[level],
    fontWeight: level === 'primary' ? 600 : undefined,
  };
}

export function FighterCard({
  fighter,
  open,
  onToggle,
  index = 0,
  count = 1,
  dragging = false,
  dropEdge = null,
  onMoveBy,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onDropOnCard,
}: {
  fighter: Fighter;
  open: boolean;
  onToggle: () => void;
  index?: number;
  count?: number;
  dragging?: boolean;
  dropEdge?: 'before' | 'after' | null;
  onMoveBy?: (delta: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOverCard?: (edge: 'before' | 'after') => void;
  onDropOnCard?: (edge: 'before' | 'after') => void;
}) {
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
  const archetypeNames = catalogArchetypes(catalog);

  const subtypeOptions = Array.from(
    new Set([...(catalog?.subtypes ?? []), ...archetypeNames, ...fighter.subtypes]),
  );

  function applyType(name: string) {
    const def = findType(catalog, name);
    const kept = fighter.subtypes.filter((subtype) => archetypeNames.includes(subtype));
    const base = def?.subtypes ?? [];
    updateFighter(fighter.id, {
      type: name,
      subtypes: [...base, ...kept.filter((subtype) => !base.includes(subtype))],
      baseCost: def?.baseCost ?? fighter.baseCost,
      xp: def?.xp ?? fighter.xp,
    });
  }

  function toggleSubtype(subtype: string, on: boolean) {
    let next = on
      ? [...fighter.subtypes, subtype]
      : fighter.subtypes.filter((item) => item !== subtype);
    if (on && archetypeNames.includes(subtype)) {
      next = next.filter((item) => item === subtype || !archetypeNames.includes(item));
    }
    updateFighter(fighter.id, { subtypes: next });
  }

  function setSkill(index: number, name: string) {
    const next = [...fighter.skills];
    next[index] = name;
    updateFighter(fighter.id, { skills: next });
  }

  function addSkill() {
    updateFighter(fighter.id, { skills: [...fighter.skills, ''] });
  }

  function removeSkill(index: number) {
    updateFighter(fighter.id, {
      skills: fighter.skills.filter((_, i) => i !== index),
    });
  }

  const catalogSkillNames = allSkillNames();
  const typeDef = findType(catalog, fighter.type);
  const stats = typeDef?.stats;
  const innateWeapons = typeDef?.weapons ?? [];
  const innateRules = typeDef?.rules ?? [];
  const skillAccess = skillAccessFor(typeDef, fighter.subtypes);
  const skillGroups = orderedSkillSets(skillAccess);
  const weaponUsed = weaponSlotsUsed(fighter);
  const weaponMax = weaponSlotMax(fighter, catalog);
  const overWeapons = weaponMax > 0 && weaponUsed > weaponMax;
  const canReorder = count > 1 && Boolean(onMoveBy);

  return (
    <Card
      id={`fighter-${fighter.id}`}
      className={cn(
        'mb-3 scroll-mt-36 border-l-[3px] border-l-primary',
        dragging && 'opacity-50',
        dropEdge === 'before' && 'border-t-2 border-t-primary',
        dropEdge === 'after' && 'border-b-2 border-b-primary',
      )}
      onDragOver={
        canReorder
          ? (event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              const rect = event.currentTarget.getBoundingClientRect();
              onDragOverCard?.(event.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
            }
          : undefined
      }
      onDrop={
        canReorder
          ? (event) => {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              onDropOnCard?.(event.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
            }
          : undefined
      }
    >
      <CardHeader className="p-0">
        <div className="flex items-stretch">
          {canReorder ? (
            <div className="flex shrink-0 items-center border-r border-border px-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 [&_svg]:size-3.5"
                disabled={index === 0}
                title="Выше"
                aria-label="Переместить выше"
                onClick={() => onMoveBy?.(-1)}
              >
                <ChevronUp />
              </Button>
              <button
                type="button"
                draggable
                title="Перетащить"
                aria-label="Перетащить бойца"
                className="flex h-6 w-5 cursor-grab items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground active:cursor-grabbing"
                onClick={(event) => event.preventDefault()}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', fighter.id);
                  onDragStart?.();
                }}
                onDragEnd={() => onDragEnd?.()}
              >
                <GripVertical className="size-3.5" />
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 [&_svg]:size-3.5"
                disabled={index === count - 1}
                title="Ниже"
                aria-label="Переместить ниже"
                onClick={() => onMoveBy?.(1)}
              >
                <ChevronDown />
              </Button>
            </div>
          ) : null}
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
            aria-expanded={open}
            onClick={onToggle}
          >
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              !open && '-rotate-90',
            )}
          />
          <span className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
              {fighter.name || 'Боец'}
            </h4>
            {!open ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[fighter.type, fighter.subtypes.join(', ')].filter(Boolean).join(' · ')
                  || 'Тип не выбран'}
              </p>
            ) : null}
          </span>
          <Badge variant="gold">{fighterCost(fighter)} кредитов</Badge>
          </button>
        </div>
      </CardHeader>
      {open ? (
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
        </div>
        <div className="flex flex-col gap-1.5">
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

        {stats ? (
          <div>
            <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Характеристики
            </h5>
            <FighterStatsTable stats={stats} />
          </div>
        ) : fighter.type ? (
          <p className="text-sm italic text-muted-foreground">
            Профиль характеристик для этого типа не найден в каталоге.
          </p>
        ) : null}

        {innateWeapons.length > 0 ? (
          <div>
            <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Встроенное оружие
            </h5>
            <WeaponProfileTable profiles={innateWeapons} />
          </div>
        ) : null}

        {innateRules.length > 0 ? (
          <div>
            <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Особые правила
            </h5>
            <dl className="space-y-2">
              {innateRules.map((rule) => {
                const { title, text } = splitNamedRule(rule);
                return (
                  <div key={rule}>
                    <dt className="text-sm font-medium">{title}</dt>
                    {text ? (
                      <dd className="text-xs leading-relaxed text-muted-foreground">{text}</dd>
                    ) : null}
                  </div>
                );
              })}
            </dl>
          </div>
        ) : null}

        <div>
          <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Навыки
          </h5>
          <div className="space-y-2">
            {fighter.skills.map((skill, index) => {
              const taken = new Set(
                fighter.skills.filter((name, i) => i !== index && name),
              );
              const extra = skill && !catalogSkillNames.includes(skill) ? skill : '';
              const def = findSkill(skill);
              const selectedLevel = skillAccessLevel(
                skillAccess,
                findSkillSet(skill)?.id ?? '',
              );
              return (
                <div key={`${fighter.id}-skill-${index}`} className="space-y-1.5">
                  <div className="flex gap-2">
                    <NativeSelect
                      value={skill}
                      className={skillAccessClass(selectedLevel)}
                      onChange={(event) => setSkill(index, event.target.value)}
                    >
                      <option value="">— выберите навык —</option>
                      {extra ? <option value={extra}>{extra}</option> : null}
                      {skillGroups.map((group) => {
                        const level = skillAccessLevel(skillAccess, group.id);
                        return (
                          <optgroup
                            key={group.id}
                            label={skillSetGroupLabel(group, level)}
                            className={skillAccessClass(level)}
                            style={skillAccessStyle(level)}
                          >
                            {group.skills
                              .filter((item) => item.name === skill || !taken.has(item.name))
                              .map((item) => (
                                <option
                                  key={item.name}
                                  value={item.name}
                                  className={skillAccessClass(level)}
                                  style={skillAccessStyle(level)}
                                >
                                  {skillOptionLabel(item, level)}
                                </option>
                              ))}
                          </optgroup>
                        );
                      })}
                    </NativeSelect>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeSkill(index)}
                    >
                      ×
                    </Button>
                  </div>
                  {def?.text ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">{def.text}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addSkill}>
            + навык
          </Button>
        </div>

        <div>
          <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Оружие
          </h5>
          <div className="space-y-2">
            {fighter.equipment.map((item, index) =>
              isWeaponItem(findGear(catalog, item.name), item) ? (
                <GearRow
                  key={`${fighter.id}-weapon-${index}`}
                  kind="weapon"
                  fighterId={fighter.id}
                  index={index}
                  item={item}
                  catalog={catalog}
                  hasFaction={Boolean(faction)}
                  loading={catalogQuery.isLoading}
                  onChange={updateGear}
                  onRemove={removeGear}
                />
              ) : null,
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={!faction}
            title={faction ? undefined : 'Сначала выберите банду'}
            onClick={() => addGear(fighter.id, 'weapon')}
          >
            + оружие
          </Button>
          {overWeapons ? (
            <p className="mt-3 rounded-r-lg border-l-[3px] border-destructive bg-destructive/15 px-3 py-2 text-sm text-red-200">
              {weaponSlotOverMessage(weaponUsed, weaponMax)}
            </p>
          ) : null}
        </div>

        <div>
          <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Снаряжение
          </h5>
          <div className="space-y-2">
            {fighter.equipment.map((item, index) =>
              isWeaponItem(findGear(catalog, item.name), item) ? null : (
                <GearRow
                  key={`${fighter.id}-wargear-${index}`}
                  kind="wargear"
                  fighterId={fighter.id}
                  index={index}
                  item={item}
                  catalog={catalog}
                  hasFaction={Boolean(faction)}
                  loading={catalogQuery.isLoading}
                  onChange={updateGear}
                  onRemove={removeGear}
                />
              ),
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={!faction}
            title={faction ? undefined : 'Сначала выберите банду'}
            onClick={() => addGear(fighter.id, 'wargear')}
          >
            + предмет
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
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
      </CardContent>
      ) : null}
    </Card>
  );
}

function GearRow({
  kind,
  fighterId,
  index,
  item,
  catalog,
  hasFaction,
  loading,
  onChange,
  onRemove,
}: {
  kind: 'weapon' | 'wargear';
  fighterId: string;
  index: number;
  item: Equipment;
  catalog: FactionCatalog | undefined;
  hasFaction: boolean;
  loading: boolean;
  onChange: (fighterId: string, index: number, patch: Partial<Equipment>) => void;
  onRemove: (fighterId: string, index: number) => void;
}) {
  const groups = equipmentGroups(catalog, kind);
  const names = catalog?.equipment.map((entry) => entry.name) ?? [];
  const hasList = names.length > 0;
  const extra = item.name && !names.includes(item.name) ? item.name : '';
  const def = findGear(catalog, item.name);
  const extras = item.extras ?? [];
  const profiles = visibleProfiles(def, extras);
  const weapon = kind === 'weapon';

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
      <div
        className={cn(
          'grid gap-2',
          weapon ? 'grid-cols-[1fr_88px_72px_auto]' : 'grid-cols-[1fr_88px_auto]',
        )}
      >
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
                  : weapon
                    ? '— выберите оружие —'
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
            placeholder={
              hasFaction
                ? weapon
                  ? 'Оружие'
                  : 'Снаряжение'
                : 'Сначала выберите банду'
            }
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
        {weapon ? (
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
        ) : null}
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
      {!weapon && def?.description ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{def.description}</p>
      ) : null}
    </div>
  );
}
