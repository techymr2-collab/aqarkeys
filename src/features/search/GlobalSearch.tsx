import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchInput } from "@/components/ui/SearchInput";
import { useProperties } from "@/data/properties";
import { useOwners } from "@/data/owners";
import { useTenants } from "@/data/tenants";
import { useVendors } from "@/data/vendors";
import { useLeases } from "@/data/leases";

interface Result {
  key: string;
  type: string;
  label: string;
  sublabel?: string;
  to: string;
}

const MAX_RESULTS = 8;

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const properties = useProperties();
  const owners = useOwners();
  const tenants = useTenants();
  const vendors = useVendors();
  const leases = useLeases();

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];

    for (const p of properties.data ?? []) {
      if (`${p.name} ${p.city}`.toLowerCase().includes(q)) {
        out.push({ key: `p-${p.id}`, type: "Property", label: p.name, sublabel: p.city, to: `/manager/properties/${p.id}` });
      }
    }
    for (const o of owners.data ?? []) {
      if (`${o.name} ${o.email ?? ""}`.toLowerCase().includes(q)) {
        out.push({ key: `o-${o.id}`, type: "Owner", label: o.name, sublabel: o.email ?? undefined, to: `/manager/owners/${o.id}` });
      }
    }
    for (const t of tenants.data ?? []) {
      if (`${t.name} ${t.email ?? ""}`.toLowerCase().includes(q)) {
        out.push({ key: `t-${t.id}`, type: "Tenant", label: t.name, sublabel: t.email ?? undefined, to: `/manager/tenants/${t.id}` });
      }
    }
    for (const v of vendors.data ?? []) {
      if (`${v.name} ${v.company ?? ""}`.toLowerCase().includes(q)) {
        out.push({ key: `v-${v.id}`, type: "Vendor", label: v.name, sublabel: v.company ?? undefined, to: `/manager/vendors/${v.id}` });
      }
    }
    for (const l of leases.data ?? []) {
      const hay = `${l.tenant?.name ?? ""} ${l.unit?.label ?? ""} ${l.unit?.property?.name ?? ""}`;
      if (hay.toLowerCase().includes(q)) {
        out.push({
          key: `l-${l.id}`,
          type: "Lease",
          label: l.tenant?.name ?? "Lease",
          sublabel: [l.unit?.label, l.unit?.property?.name].filter(Boolean).join(" · "),
          to: `/manager/leases/${l.id}`,
        });
      }
    }

    return out.slice(0, MAX_RESULTS);
  }, [query, properties.data, owners.data, tenants.data, vendors.data, leases.data]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  function go(r: Result) {
    navigate(r.to);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <SearchInput
        value={query}
        onChange={(v) => {
          setQuery(v);
          setOpen(true);
        }}
        placeholder="Search properties, owners, tenants…"
      />

      {open && query.trim() && (
        <div className="absolute left-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-900/[0.07] bg-white shadow-glass-lg animate-fade-in">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">No matches</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={r.key}>
                  <button
                    type="button"
                    onClick={() => go(r)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-900/[0.04]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{r.label}</span>
                      {r.sublabel && (
                        <span className="block truncate text-xs text-slate-500">{r.sublabel}</span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {r.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
