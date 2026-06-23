import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { LogOutIcon } from "@/components/icons";
import { roleLabel } from "@/layouts/navConfig";

export function UserMenu() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!profile) return null;

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-slate-900/[0.04]"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-700">
          {initials || "?"}
        </span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="hidden h-3 w-3 text-slate-400 sm:block"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-900/[0.07] bg-white shadow-glass-lg animate-fade-in">
          <div className="px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {profile.full_name || "Account"}
            </p>
            <p className="text-xs text-slate-500">{roleLabel[profile.role]}</p>
          </div>
          <div className="border-t border-slate-900/[0.06]" />
          <NavLink
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-900/[0.04]"
          >
            Profile
          </NavLink>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOutIcon className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
