import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { FloatingTip } from '@/components/roster/FloatingTip';
import { cn } from '@/lib/utils';

export type DescribedOption = {
  value: string;
  label: string;
  description?: string;
  className?: string;
};

export type DescribedGroup = {
  label: string;
  className?: string;
  options: DescribedOption[];
};

export function DescribedSelect({
  value,
  onChange,
  placeholder,
  groups,
  extra,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  groups: DescribedGroup[];
  extra?: DescribedOption | null;
  disabled?: boolean;
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(value);
  const [query, setQuery] = useState('');

  function openList() {
    setQuery('');
    setHighlighted(value);
    setOpen(true);
  }

  const allOptions = useMemo(() => {
    const list: DescribedOption[] = [];
    if (extra?.value) list.push(extra);
    for (const group of groups) list.push(...group.options);
    return list;
  }, [extra, groups]);

  const emptyOption = useMemo<DescribedOption>(
    () => ({ value: '', label: placeholder }),
    [placeholder],
  );
  const selected = allOptions.find((item) => item.value === value);
  const needle = query.trim().toLowerCase();
  const matches = (item: DescribedOption) =>
    !needle || item.label.toLowerCase().includes(needle) || item.value.toLowerCase().includes(needle);
  const filteredGroups = useMemo(() => {
    const q = needle;
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter(
          (item) =>
            !q || item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, needle]);
  const extraVisible = extra && matches(extra) ? extra : null;
  const visibleOptions = useMemo(() => {
    const list: DescribedOption[] = [];
    if (!needle) list.push(emptyOption);
    if (extraVisible) list.push(extraVisible);
    for (const group of filteredGroups) list.push(...group.options);
    return list;
  }, [emptyOption, extraVisible, filteredGroups, needle]);
  const highlightedOption =
    visibleOptions.find((item) => item.value === highlighted) ?? visibleOptions[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = highlightRef.current;
    const list = panelRef.current?.querySelector('[role="listbox"]');
    if (!el || !(list instanceof HTMLElement)) return;
    const elRect = el.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    if (elRect.top < listRect.top) list.scrollTop -= listRect.top - elRect.top;
    else if (elRect.bottom > listRect.bottom) list.scrollTop += elRect.bottom - listRect.bottom;
  }, [open, highlighted]);

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const place = () => {
      const r = trigger.getBoundingClientRect();
      const pad = 8;
      const gap = 4;
      const width = Math.max(r.width, Math.min(28 * 16, window.innerWidth - pad * 2));
      panel.style.minWidth = `${Math.round(r.width)}px`;
      panel.style.width = `${Math.round(Math.min(width, window.innerWidth - pad * 2))}px`;
      let left = r.left;
      if (left + panel.offsetWidth > window.innerWidth - pad) {
        left = window.innerWidth - panel.offsetWidth - pad;
      }
      if (left < pad) left = pad;
      const below = r.bottom + gap;
      const maxH = Math.min(20 * 16, window.innerHeight - pad * 2);
      panel.style.maxHeight = `${maxH}px`;
      let top = below;
      if (below + panel.offsetHeight > window.innerHeight - pad) {
        top = Math.max(pad, r.top - gap - panel.offsetHeight);
      }
      panel.style.left = `${Math.round(left)}px`;
      panel.style.top = `${Math.round(top)}px`;
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, query, filteredGroups.length]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveHighlight(delta: number) {
    if (!visibleOptions.length) return;
    const current = highlightedOption?.value;
    const index = Math.max(0, visibleOptions.findIndex((item) => item.value === current));
    const next = visibleOptions[(index + delta + visibleOptions.length) % visibleOptions.length];
    setHighlighted(next.value);
  }

  return (
    <div ref={rootRef} className="relative min-w-0 w-full flex-1">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openList();
          }
        }}
      >
        <span className={cn('truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-60" />
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[70] flex flex-col overflow-hidden rounded-md border border-input bg-background shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
            >
              <div className="border-b border-border p-1.5">
                <input
                  type="search"
                  autoFocus
                  value={query}
                  placeholder="Найти…"
                  className="h-8 w-full rounded-md border border-input bg-secondary/40 px-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setHighlighted('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      moveHighlight(1);
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      moveHighlight(-1);
                    } else if (event.key === 'Enter') {
                      event.preventDefault();
                      if (highlightedOption) choose(highlightedOption.value);
                    } else if (event.key === 'Home') {
                      event.preventDefault();
                      setHighlighted(visibleOptions[0]?.value ?? '');
                    } else if (event.key === 'End') {
                      event.preventDefault();
                      setHighlighted(visibleOptions[visibleOptions.length - 1]?.value ?? '');
                    }
                  }}
                />
              </div>
              <div
                id={listId}
                role="listbox"
                className="min-h-0 flex-1 overflow-y-auto py-1"
              >
                {!needle ? (
                  <OptionButton
                    option={emptyOption}
                    active={!value}
                    highlighted={highlightedOption?.value === ''}
                    highlightRef={highlightRef}
                    onHighlight={setHighlighted}
                    onChoose={choose}
                  />
                ) : null}
                {extraVisible ? (
                  <OptionButton
                    option={extraVisible}
                    active={value === extraVisible.value}
                    highlighted={highlightedOption?.value === extraVisible.value}
                    highlightRef={highlightRef}
                    onHighlight={setHighlighted}
                    onChoose={choose}
                  />
                ) : null}
                {filteredGroups.map((group) => (
                  <div key={group.label} className="pt-1">
                    <div
                      className={cn(
                        'px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground',
                        group.className,
                      )}
                    >
                      {group.label}
                    </div>
                    {group.options.map((option) => (
                      <OptionButton
                        key={option.value}
                        option={option}
                        active={value === option.value}
                        highlighted={highlightedOption?.value === option.value}
                        highlightRef={highlightRef}
                        onHighlight={setHighlighted}
                        onChoose={choose}
                      />
                    ))}
                  </div>
                ))}
                {visibleOptions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Ничего не найдено</p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
      <FloatingTip
        open={open && Boolean(highlightedOption?.description)}
        anchorRef={highlightRef}
        placement="right"
        placementKey={highlightedOption?.value}
      >
        {highlightedOption?.description}
      </FloatingTip>
    </div>
  );
}

function OptionButton({
  option,
  active,
  highlighted,
  highlightRef,
  onHighlight,
  onChoose,
}: {
  option: DescribedOption;
  active: boolean;
  highlighted: boolean;
  highlightRef: { current: HTMLButtonElement | null };
  onHighlight: (value: string) => void;
  onChoose: (value: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      ref={(node) => {
        if (highlighted) highlightRef.current = node;
      }}
      className={cn(
        'flex w-full px-3 py-1.5 text-left text-sm',
        highlighted ? 'bg-accent' : 'hover:bg-muted/60',
        option.className,
      )}
      onPointerEnter={(event) => {
        onHighlight(option.value);
        highlightRef.current = event.currentTarget;
      }}
      onClick={() => onChoose(option.value)}
    >
      {option.label}
    </button>
  );
}
