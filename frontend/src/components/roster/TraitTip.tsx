import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export function TraitTip({
  name,
  text,
  className,
}: {
  name: string;
  text?: string;
  className?: string;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const pop = popRef.current;
    if (!trigger || !pop) return;

    const place = () => {
      const r = trigger.getBoundingClientRect();
      const pad = 8;
      const gap = 6;
      const w = pop.offsetWidth;
      const h = pop.offsetHeight;
      let left = r.left;
      if (left + w > window.innerWidth - pad) left = window.innerWidth - w - pad;
      if (left < pad) left = pad;
      let top = r.bottom + gap;
      if (top + h > window.innerHeight - pad) top = r.top - h - gap;
      if (top < pad) top = pad;
      pop.style.left = `${Math.round(left)}px`;
      pop.style.top = `${Math.round(top)}px`;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, text]);

  if (!text) return <span>{name}</span>;

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        className={cn(
          'cursor-help border-b border-dotted border-muted-foreground text-foreground hover:border-accent-foreground hover:text-accent-foreground focus:border-accent-foreground focus:text-accent-foreground focus:outline-none',
          className,
        )}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {name}
      </span>
      {open
        ? createPortal(
            <div
              ref={popRef}
              role="tooltip"
              className={cn(
                'pointer-events-none fixed z-[80] max-w-[min(22rem,calc(100vw-1rem))]',
                'rounded-md border border-[#2e3441] border-l-[3px] border-l-[#e8622a]',
                'bg-[#161922] px-2.5 py-2 text-[12px] leading-snug text-[#d7dae0]',
                'shadow-[0_8px_24px_rgba(0,0,0,0.45)]',
              )}
            >
              {text}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
