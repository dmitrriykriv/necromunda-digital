import {
  findGear,
  findSkill,
  findType,
  isWeaponItem,
  skillLabel,
  splitNamedRule,
  uniqueTraits,
  visibleProfiles,
  type EquipmentDef,
  type FactionCatalog,
  type WeaponProfile,
} from '@shared/catalog';
import { fighterCost, type Equipment, type Fighter, type Roster } from '@shared/roster';
import { FighterStatsTable } from '@/components/roster/FighterStatsTable';
import { WeaponProfileTable } from '@/components/roster/WeaponProfileTable';

export function PrintFighterCard({
  fighter,
  roster,
  catalog,
  showTraitGlossary = true,
}: {
  fighter: Fighter;
  roster: Roster;
  catalog: FactionCatalog | undefined;
  showTraitGlossary?: boolean;
}) {
  const type = findType(catalog, fighter.type);
  const gear = fighter.equipment.filter((item) => item.name);
  const innate = type?.weapons ?? [];
  const allProfiles: WeaponProfile[] = [...innate];
  const gearBlocks = gear.map((item) => {
    const def = findGear(catalog, item.name);
    const extras = item.extras ?? [];
    const profiles = visibleProfiles(def, extras);
    allProfiles.push(...profiles);
    return { item, def, extras, profiles };
  });
  const traits = uniqueTraits(allProfiles);
  const stats = type?.stats;
  const weaponBlocks = gearBlocks.filter(({ def, item }) => isWeaponItem(def, item));
  const wargearBlocks = gearBlocks.filter(({ def, item }) => !isWeaponItem(def, item));

  return (
    <article className="print-card">
      <header className="print-card-head">
        <div className="min-w-0">
          <p className="print-kicker">
            {[roster.factionName, roster.name].filter(Boolean).join(' · ') || 'Necromunda'}
          </p>
          <h2 className="print-name">{fighter.name || 'Боец'}</h2>
          <p className="print-meta">
            {[fighter.type, fighter.subtypes.join(', ')].filter(Boolean).join(' · ')}
            {fighter.xp ? ` · XP ${fighter.xp}` : ''}
          </p>
        </div>
        <div className="print-cost">
          <strong>{fighterCost(fighter)}</strong>
          <span>кредитов</span>
        </div>
      </header>

      {stats ? (
        <FighterStatsTable stats={stats} variant="print" />
      ) : fighter.type ? (
        <p className="print-empty">Профиль характеристик для этого типа не найден в каталоге.</p>
      ) : null}

      {innate.length > 0 ? (
        <section className="print-section">
          <h3>Встроенное оружие</h3>
          <WeaponProfileTable profiles={innate} variant="print" />
        </section>
      ) : null}

      {fighter.skills.length > 0 && (
        <section className="print-section">
          <h3>Навыки</h3>
          <dl className="print-traits">
            {fighter.skills.filter(Boolean).map((name) => {
              const def = findSkill(name);
              return (
                <div key={name}>
                  <dt>{skillLabel(name)}</dt>
                  {def?.text ? <dd>{def.text}</dd> : null}
                </div>
              );
            })}
          </dl>
        </section>
      )}

      {type?.rules?.length ? (
        <section className="print-section">
          <h3>Особые правила</h3>
          <dl className="print-traits">
            {type.rules.map((rule) => {
              const { title, text } = splitNamedRule(rule);
              return (
                <div key={rule}>
                  <dt>{title}</dt>
                  {text ? <dd>{text}</dd> : null}
                </div>
              );
            })}
          </dl>
        </section>
      ) : null}

      {gearBlocks.length === 0 ? (
        <section className="print-section">
          <h3>Снаряжение</h3>
          <p className="print-empty">Снаряжение не указано.</p>
        </section>
      ) : (
        <>
          {weaponBlocks.length > 0 ? (
            <section className="print-section">
              <h3>Оружие</h3>
              <div className="print-gear-list">
                {weaponBlocks.map(({ item, def, extras, profiles }, index) => (
                  <PrintGearBlock
                    key={`${fighter.id}-weapon-${index}`}
                    item={item}
                    def={def}
                    extras={extras}
                    profiles={profiles}
                    showDescription={false}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {wargearBlocks.length > 0 ? (
            <section className="print-section">
              <h3>Снаряжение</h3>
              <div className="print-gear-list">
                {wargearBlocks.map(({ item, def, extras, profiles }, index) => (
                  <PrintGearBlock
                    key={`${fighter.id}-wargear-${index}`}
                    item={item}
                    def={def}
                    extras={extras}
                    profiles={profiles}
                    showDescription
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      {showTraitGlossary && traits.some((trait) => trait.text) && (
        <section className="print-section print-trait-glossary">
          <h3>Свойства оружия</h3>
          <dl className="print-traits">
            {traits
              .filter((trait) => trait.text)
              .map((trait) => (
                <div key={trait.name}>
                  <dt>{trait.name}</dt>
                  <dd>{trait.text}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}
    </article>
  );
}

function PrintGearBlock({
  item,
  def,
  extras,
  profiles,
  showDescription,
}: {
  item: Equipment;
  def: EquipmentDef | undefined;
  extras: string[];
  profiles: WeaponProfile[];
  showDescription: boolean;
}) {
  return (
    <div className="print-gear">
      <div className="print-gear-title">
        <span>
          {item.name}
          {extras.length ? ` + ${extras.join(', ')}` : ''}
        </span>
        <span className="print-gear-cost">{item.cost} cr</span>
      </div>
      {profiles.length > 0 && (
        <WeaponProfileTable profiles={profiles} variant="print" />
      )}
      {showDescription && def?.description ? (
        <p className="print-desc">{def.description}</p>
      ) : null}
      {showDescription && !def && !profiles.length ? (
        <p className="print-empty">Нет описания в каталоге этой банды.</p>
      ) : null}
    </div>
  );
}
