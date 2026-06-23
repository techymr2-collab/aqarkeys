import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="glass-card grid place-items-center px-6 py-16 text-center">
      <div className="max-w-sm">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
