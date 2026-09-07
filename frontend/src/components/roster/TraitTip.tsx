import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { FloatingTip } from '@/components/roster/FloatingTip';

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
  const [open, setOpen] = useState(false);

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
      <FloatingTip
        open={open}
        anchorRef={triggerRef}
        closeOnEscape
        onClose={() => setOpen(false)}
      >
        {text}
      </FloatingTip>
    </>
  );
}
