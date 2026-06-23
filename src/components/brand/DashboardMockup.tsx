// Decorative product preview for the landing page hero. Hand-built with the
// app's real design tokens (not a screenshot) so it never goes stale and
// needs no image asset pipeline — it mirrors the actual manager dashboard's
// structure (KPI grid + monthly collections chart).

const KPIS = [
  { label: "Occupancy", value: "92%", tone: "text-brand-600" },
  { label: "Collected", value: "AED 1.2M", tone: "text-emerald-600" },
  { label: "Active leases", value: "24", tone: "text-slate-900" },
  { label: "Open tickets", value: "2", tone: "text-amber-600" },
];

export function DashboardMockup() {
  return (
    <div className="rounded-2xl border border-slate-900/[0.08] bg-white shadow-2xl shadow-brand-900/10">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 border-b border-slate-900/[0.06] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className="ml-3 text-[11px] font-medium text-slate-400">app.aqarkeys.ae/manager</span>
      </div>

      <div className="p-5">
        <p className="text-sm font-bold text-slate-900">Dashboard</p>
        <p className="text-xs text-slate-400">Your portfolio at a glance</p>

        {/* KPI grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {KPIS.map((k) => (
            <div key={k.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {k.label}
              </p>
              <p className={`mt-0.5 text-lg font-bold ${k.tone}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Mini chart */}
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Monthly collections
          </p>
          <svg viewBox="0 0 280 70" className="mt-1 h-16 w-full" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="mockup-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#324CE3" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#324CE3" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,52 L35,40 L70,46 L105,22 L140,30 L175,14 L210,24 L245,10 L280,18 L280,70 L0,70 Z"
              fill="url(#mockup-fill)"
            />
            <path
              d="M0,52 L35,40 L70,46 L105,22 L140,30 L175,14 L210,24 L245,10 L280,18"
              fill="none"
              stroke="#324CE3"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
