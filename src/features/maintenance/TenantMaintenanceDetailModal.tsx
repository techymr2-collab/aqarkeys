import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { CheckIcon } from "@/components/icons";
import { formatDate } from "@/lib/format";
import {
  maintenanceCategoryLabel,
  maintenancePriorityLabel,
  maintenancePriorityTone,
} from "@/lib/labels";
import type { MaintenanceWithRelations } from "@/data/maintenance";
import type { MaintenanceStatus } from "@/lib/database.types";
import { cn } from "@/lib/cn";

const STEPS = ["Received", "In progress", "Resolved"] as const;

function activeStep(status: MaintenanceStatus): number {
  if (status === "resolved" || status === "cancelled") return 2;
  if (status === "in_progress" || status === "on_hold") return 1;
  return 0;
}

const STATUS_MSG: Record<MaintenanceStatus, string> = {
  submitted: "We've received your request and will be in touch soon.",
  in_progress: "Someone from our team is actively working on this.",
  on_hold: "This is temporarily on hold — we'll update you as soon as possible.",
  resolved: "This issue has been resolved. Contact your manager if anything else needs attention.",
  cancelled: "This request has been closed.",
};

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  request: MaintenanceWithRelations;
}

export function TenantMaintenanceDetailModal({ open, onClose, request }: Props) {
  const step = activeStep(request.status);
  const cancelled = request.status === "cancelled";
  const resolved = request.status === "resolved";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={request.title}
      description={`${request.unit?.property?.name ?? ""} · ${request.unit?.label ?? ""}`}
      size="lg"
    >
      {/* Status stepper */}
      <div className="mb-5 px-1">
        <div className="flex items-start">
          {STEPS.map((label, i) => {
            const done = !cancelled && i < step;
            const active = !cancelled && i === step;
            return (
              <div key={label} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  {i > 0 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 transition-colors",
                        done || active ? "bg-brand-400" : "bg-slate-200",
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                      cancelled
                        ? "bg-slate-100 text-slate-400"
                        : done
                          ? "bg-brand-500 text-white"
                          : active
                            ? "bg-brand-50 text-brand-700 ring-2 ring-brand-400/60"
                            : "bg-slate-100 text-slate-400",
                    )}
                  >
                    {done ? <CheckIcon className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 transition-colors",
                        done ? "bg-brand-400" : "bg-slate-200",
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-center text-[11px] font-medium",
                    cancelled
                      ? "text-slate-400"
                      : active
                        ? "text-brand-700"
                        : done
                          ? "text-slate-700"
                          : "text-slate-400",
                  )}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status message */}
      <p
        className={cn(
          "mb-5 rounded-xl px-4 py-3 text-sm",
          cancelled
            ? "bg-slate-100/60 text-slate-500"
            : resolved
              ? "bg-emerald-50 text-emerald-800"
              : "bg-brand-50/60 text-brand-800",
        )}
      >
        {STATUS_MSG[request.status]}
      </p>

      {/* Original message */}
      {request.description && (
        <div className="mb-5 rounded-xl bg-slate-900/[0.03] p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Your message
          </p>
          <p className="text-sm text-slate-700">{request.description}</p>
        </div>
      )}

      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <Detail label="Category">
          <p className="text-slate-900">{maintenanceCategoryLabel[request.category]}</p>
        </Detail>
        <Detail label="Urgency">
          <Badge tone={maintenancePriorityTone[request.priority]}>
            {maintenancePriorityLabel[request.priority]}
          </Badge>
        </Detail>
        <Detail label="Reported">
          <p className="text-slate-900">{formatDate(request.created_at.slice(0, 10))}</p>
        </Detail>
        {request.assignee && (
          <Detail label="Assigned to">
            <p className="text-slate-900">{request.assignee}</p>
          </Detail>
        )}
        {request.resolved_at && (
          <Detail label="Resolved on">
            <p className="text-slate-900">{formatDate(request.resolved_at.slice(0, 10))}</p>
          </Detail>
        )}
      </div>
    </Modal>
  );
}
