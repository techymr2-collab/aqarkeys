import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Back to home
          </Link>
        </div>

        <div className="glass-panel p-8 sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">Last updated {updated}</p>

          <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
