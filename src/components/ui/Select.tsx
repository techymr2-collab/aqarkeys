import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  value: string;
  // Kept event-shaped so existing `onChange={(e) => set(e.target.value)}`
  // call sites work unchanged after replacing the native <select>.
  onChange: (e: { target: { value: string } }) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

interface MenuPos {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

export function Select({
  label,
  error,
  options,
  placeholder,
  value,
  onChange,
  disabled,
  className,
  id,
}: SelectProps) {
  const reactId = useId();
  const selectId = id ?? reactId;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      120,
      Math.min(264, (openUp ? spaceAbove : spaceBelow) - 12),
    );
    setPos(
      openUp
        ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 6, maxHeight }
        : { left: r.left, width: r.width, top: r.bottom + 6, maxHeight },
    );
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  // Keep the menu glued to the trigger while open.
  useEffect(() => {
    if (!open) return;
    const onMove = () => reposition();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, reposition]);

  // Close on outside click (menu lives in a portal, so check both refs).
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // When opening, focus the current selection.
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const el = menuRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function choose(opt: SelectOption) {
    onChange({ target: { value: opt.value } });
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ": {
        e.preventDefault();
        const opt = options[activeIndex];
        if (opt) choose(opt);
        break;
      }
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-11 items-center justify-between gap-2 rounded-xl border bg-white px-3.5 text-left text-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/40",
          open ? "border-brand-400/60 ring-2 ring-brand-500/40" : "border-slate-900/10",
          error && "border-rose-500/60",
          disabled && "cursor-not-allowed opacity-50",
          selected ? "text-slate-900" : "text-slate-400",
          className,
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder ?? "Select"}</span>
        <svg
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
        >
          <path
            d="m6 8 4 4 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: pos.maxHeight,
            }}
            className="z-[70] overflow-auto rounded-xl border border-slate-900/10 bg-white/95 p-1 shadow-glass-lg backdrop-blur-xl animate-fade-in"
          >
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">No options</li>
            )}
            {options.map((o, i) => {
              const isSelected = o.value === value;
              const isActive = i === activeIndex;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(o)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
                    isActive ? "bg-brand-500/10 text-slate-900" : "text-slate-700",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && (
                    <svg className="h-4 w-4 shrink-0 text-brand-600" viewBox="0 0 20 20" fill="none" aria-hidden>
                      <path d="m5 10 3.5 3.5L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
