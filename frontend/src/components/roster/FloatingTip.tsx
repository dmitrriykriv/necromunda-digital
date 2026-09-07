import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export function FloatingTip({
  open,
  anchorRef,
  placement = 'below',
  closeOnEscape = false,
  onClose,
  placementKey,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  placement?: 'below' | 'right';
  closeOnEscape?: boolean;
  onClose?: () => void;
  placementKey?: string;
  children?: ReactNode;
}) {
  const popRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = anchorRef.current;
    const pop = popRef.current;
    if (!trigger || !pop) return;

    const place = () => {
      const r = trigger.getBoundingClientRect();
      const pad = 8;
      const gap = 6;
      const w = pop.offsetWidth;
      const h = pop.offsetHeight;
      let left = placement === 'right' ? r.right + gap : r.left;
      let top = placement === 'right' ? r.top : r.bottom + gap;

      if (placement === 'right' && left + w > window.innerWidth - pad) {
        left = r.left - w - gap;
      }
      if (left + w > window.innerWidth - pad) left = window.innerWidth - w - pad;
      if (left < pad) left = pad;

      if (placement === 'below' && top + h > window.innerHeight - pad) {
        top = r.top - h - gap;
      }
      if (top + h > window.innerHeight - pad) top = window.innerHeight - h - pad;
      if (top < pad) top = pad;

      pop.style.left = `${Math.round(left)}px`;
      pop.style.top = `${Math.round(top)}px`;
    };

    const onKey = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') onClose?.();
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
  }, [open, anchorRef, placement, closeOnEscape, onClose, placementKey, children]);

  if (!open || !children) return null;

  return createPortal(
    <div
      ref={popRef}
      role="tooltip"
      className={cn(
        'pointer-events-none fixed z-[80] max-h-[min(16rem,calc(100vh-1rem))] max-w-[min(24rem,calc(100vw-1rem))] overflow-y-auto',
        'whitespace-pre-wrap rounded-md border border-[#2e3441] border-l-[3px] border-l-[#e8622a]',
        'bg-[#161922] px-2.5 py-2 text-[12px] leading-snug text-[#d7dae0]',
        'shadow-[0_8px_24px_rgba(0,0,0,0.45)]',
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
