import { type FighterStats } from '@shared/catalog';

export function FighterStatsTable({
  stats,
  variant = 'screen',
}: {
  stats: FighterStats;
  variant?: 'screen' | 'print';
}) {
  const print = variant === 'print';

  return (
    <div className={print ? undefined : 'overflow-x-auto'}>
      <table
        className={
          print
            ? 'print-stats'
            : 'w-full min-w-[36rem] table-fixed border-collapse text-center'
        }
      >
        <thead>
          <tr>
            {stats.keys.map((key) => (
              <th
                key={key}
                className={
                  print
                    ? undefined
                    : 'border border-border bg-muted/40 px-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground'
                }
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {stats.values.map((value, index) => (
              <td
                key={`${stats.keys[index]}-${value}`}
                className={
                  print
                    ? undefined
                    : 'border border-border px-1 py-1.5 text-sm font-semibold tabular-nums'
                }
              >
                {value}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
