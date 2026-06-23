import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { homePathForRole } from "@/routes/roles";
import { Logo } from "@/components/brand/Logo";
import { DashboardMockup } from "@/components/brand/DashboardMockup";
import { Button } from "@/components/ui/Button";
import { FullScreenLoader } from "@/components/ui/PageLoader";
import {
  RefreshCwIcon,
  FunnelIcon,
  ToolboxIcon,
  UsersIcon,
  HomeIcon,
  UploadIcon,
  ReceiptIcon,
  ChequeIcon,
} from "@/components/icons";

const trust = [
  { stat: "AED native", label: "Rent, invoices, and statements in Dirhams" },
  { stat: "Owner + tenant portals", label: "Both log in and see their own world" },
  { stat: "Runs on autopilot", label: "Invoicing and overdue flags, every day" },
  { stat: "Import in minutes", label: "Bring an existing portfolio from a CSV" },
];

const features = [
  {
    icon: RefreshCwIcon,
    title: "Automation that runs itself",
    body: "Rent invoices generate on schedule, overdue gets flagged automatically, and leases activate and expire on their own — every day, with nobody watching.",
  },
  {
    icon: FunnelIcon,
    title: "A real leasing pipeline",
    body: "Track every enquiry from first viewing to signed lease, so vacant units get filled before they cost real money.",
  },
  {
    icon: UploadIcon,
    title: "Bring your portfolio in minutes",
    body: "Already managing properties elsewhere? Import owners, properties, units, tenants, and leases straight from a spreadsheet — no manual re-entry.",
  },
  {
    icon: ToolboxIcon,
    title: "A directory of who fixes what",
    body: "Keep your plumbers, electricians, and AC techs on file and assign them straight from a maintenance work order.",
  },
  {
    icon: UsersIcon,
    title: "An owner portal that answers itself",
    body: "Investors log in and see their properties, rent collected, and monthly NOI statements in AED — without calling you.",
  },
  {
    icon: HomeIcon,
    title: "A portal tenants actually use",
    body: "Tenants see their lease, invoices, post-dated cheque status, and EJARI registration, and report maintenance issues themselves.",
  },
  {
    icon: ReceiptIcon,
    title: "VAT handled correctly",
    body: "Commercial and residential VAT applied the right way, with proper tax invoices and payment receipts generated as PDFs.",
  },
  {
    icon: ChequeIcon,
    title: "PDC and EJARI, tracked properly",
    body: "Schedule every post-dated cheque against the lease and keep EJARI registration on record — visible to your team and your tenants.",
  },
];

const reasons = [
  {
    title: "PDC cheques slip through the cracks",
    body: "Aqarkeys schedules every cheque date against the lease and alerts you before it bounces — not after.",
  },
  {
    title: "Owners ask the same questions every month",
    body: "Give every owner a login. They see their properties, rent, and statements in AED — without calling you.",
  },
  {
    title: "Vacant units in Dubai lose AED fast",
    body: "Vacancy tracking shows exactly which units are empty and for how long, so you can act before the owner notices.",
  },
  {
    title: "Switching tools means starting from scratch",
    body: "Not here. Import your existing properties, units, tenants, and leases from a spreadsheet in minutes, not weeks of data entry.",
  },
];

export function LandingPage() {
  const { session, profile, loading } = useAuth();

  if (loading) return <FullScreenLoader label="Loading" />;
  if (session && profile) {
    return <Navigate to={homePathForRole(profile.role)} replace />;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <Link to="/login">
          <Button variant="secondary" size="sm">
            Sign in
          </Button>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {/* Hero: text + product mockup */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Built for Dubai · Abu Dhabi · Sharjah
            </span>

            <h1 className="mt-6 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-900">
              Your UAE portfolio,
              <span className="text-brand-600"> running on autopilot.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Aqarkeys invoices rent, chases overdue cheques, fills vacancies, and answers
              owners and tenants — automatically, in AED, built around how the UAE actually
              leases property.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg">Start managing for free</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="lg">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>

          {/* Product mockup with a soft glow behind it */}
          <div className="relative animate-fade-in" style={{ animationDelay: "120ms" }}>
            <div
              className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-brand-500/20 blur-3xl"
              aria-hidden
            />
            <DashboardMockup />
          </div>
        </section>

        {/* Trust strip */}
        <section className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {trust.map((t, i) => (
            <div
              key={t.stat}
              className="glass-card animate-fade-in p-4"
              style={{ animationDelay: `${160 + i * 60}ms` }}
            >
              <p className="text-sm font-bold text-brand-700">{t.stat}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.label}</p>
            </div>
          ))}
        </section>

        {/* Feature list — lightweight rows, not heavy cards */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Everything a UAE agency needs, in one login
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Not just rent tracking — the full operating system for a property management
            business.
          </p>

          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="flex animate-fade-in gap-4"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-700">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why switch */}
        <section className="mt-16 glass-card animate-fade-in p-8" style={{ animationDelay: "440ms" }}>
          <h2 className="text-lg font-bold text-slate-900">
            Why UAE managers switch from spreadsheets
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {reasons.map((r) => (
              <div key={r.title}>
                <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                <p className="mt-1 text-sm text-slate-500">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA band */}
        <section className="mt-16 overflow-hidden rounded-2xl bg-brand-600 px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Run your portfolio the way the UAE actually leases.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Free to start. No credit card. Bring your existing portfolio in with a CSV
            import.
          </p>
          <Link
            to="/signup"
            className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-50"
          >
            Start managing for free
          </Link>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            Aqarkeys · Built for the UAE rental market
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <span>Dubai · Abu Dhabi · Sharjah · Across the Emirates</span>
            <Link to="/terms" className="hover:text-slate-600 hover:underline">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-slate-600 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
