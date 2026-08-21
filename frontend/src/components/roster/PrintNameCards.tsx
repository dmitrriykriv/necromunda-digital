import type { Fighter } from '@shared/roster';

const MINI_CARD_COLUMNS = 3;
const MINI_CARDS_PER_SHEET = 9;

function chunksOf<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function PrintNameCards({ fighters }: { fighters: Fighter[] }) {
  if (fighters.length === 0) return null;

  return (
    <section className="print-minis">
      <div className="print-minis-intro">
        <h2>Карточки 63×88 мм</h2>
        <p>
          Отдельный лист для нарезки: имя и тип каждого бойца. На страницу
          помещается {MINI_CARDS_PER_SHEET} карточек, следующие идут на новый лист.
        </p>
      </div>
      {chunksOf(fighters, MINI_CARDS_PER_SHEET).map((sheet) => (
        <table
          key={sheet.map((fighter) => fighter.id).join('-')}
          className="print-minis-table"
        >
          <tbody>
            {chunksOf(sheet, MINI_CARD_COLUMNS).map((row) => (
              <tr key={row.map((fighter) => fighter.id).join('-')}>
                {row.map((fighter) => (
                  <td key={fighter.id}>
                    <article className="print-mini-card">
                      <h3 className="print-mini-name">{fighter.name || 'Боец'}</h3>
                      <p className="print-mini-type">{fighter.type || 'Тип не выбран'}</p>
                    </article>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </section>
  );
}

