import {
  findGear,
  findType,
  uniqueTraits,
  visibleProfiles,
  type FactionCatalog,
  type WeaponProfile,
} from '@shared/catalog';
import { fighterCost, type Fighter, type Roster } from '@shared/roster';
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
  const allProfiles: WeaponProfile[] = [];
  const gearBlocks = gear.map((item) => {
    const def = findGear(catalog, item.name);
    const extras = item.extras ?? [];
    const profiles = visibleProfiles(def, extras);
    allProfiles.push(...profiles);
    return { item, def, extras, profiles };
  });
  const traits = uniqueTraits(allProfiles);
  const stats = type?.stats;

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
        <table className="print-stats">
          <thead>
            <tr>
              {stats.keys.map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {stats.values.map((value, index) => (
                <td key={`${stats.keys[index]}-${value}`}>{value}</td>
              ))}
            </tr>
          </tbody>
        </table>
      ) : fighter.type ? (
        <p className="print-empty">Профиль характеристик для этого типа не найден в каталоге.</p>
      ) : null}

      {fighter.skills.length > 0 && (
        <section className="print-section">
          <h3>Навыки</h3>
          <p className="print-skills">{fighter.skills.join(' · ')}</p>
        </section>
      )}

      {type?.rules?.length ? (
        <section className="print-section">
          <h3>Особые правила</h3>
          <ul className="print-rules">
            {type.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="print-section">
        <h3>Снаряжение</h3>
        {gearBlocks.length === 0 ? (
          <p className="print-empty">Снаряжение не указано.</p>
        ) : (
          <div className="print-gear-list">
            {gearBlocks.map(({ item, def, extras, profiles }, index) => (
              <div key={`${fighter.id}-gear-${index}`} className="print-gear">
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
                {def?.description ? <p className="print-desc">{def.description}</p> : null}
                {!def && !profiles.length ? (
                  <p className="print-empty">Нет описания в каталоге этой банды.</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

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
