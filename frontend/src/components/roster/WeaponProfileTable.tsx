import { type WeaponProfile } from '@shared/catalog';
import { cn } from '@/lib/utils';

const COLS = ['Оружие', 'SR', 'LR', 'S', 'AP', 'L', 'Свойства'] as const;

export function WeaponProfileTable({
  profiles,
  variant = 'screen',
}: {
  profiles: WeaponProfile[];
  variant?: 'screen' | 'print';
}) {
  if (!profiles.length) return null;

  const print = variant === 'print';

  return (
    <div className={print ? undefined : 'overflow-x-auto'}>
      <table className={print ? 'print-weapon' : 'mt-1 w-full min-w-[28rem] border-collapse text-[11px]'}>
        <thead>
          <tr>
            {COLS.map((col) => (
              <th
                key={col}
                className={
                  print
                    ? undefined
                    : 'border-b border-border px-1.5 py-1 text-left font-semibold uppercase tracking-wider text-muted-foreground'
                }
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr key={`${profile.name}-${profile.sr}-${profile.str}-${profile.l}`}>
              <td className={print ? 'print-wname' : 'whitespace-nowrap px-1.5 py-1 font-medium'}>
                {profile.name}
              </td>
              <td className={cell(print)}>{profile.sr}</td>
              <td className={cell(print)}>{profile.lr}</td>
              <td className={cell(print)}>{profile.str}</td>
              <td className={cell(print)}>{profile.ap}</td>
              <td className={cell(print)}>{profile.l}</td>
              <td className={cn(cell(print), print ? undefined : 'text-muted-foreground')}>
                {profile.traits.map((trait) => trait.name).join(', ') || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function cell(print: boolean) {
  return print ? undefined : 'border-b border-border px-1.5 py-1 tabular-nums';
}
