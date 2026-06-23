import { useAuth } from "@/auth/useAuth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { FileTextIcon, DownloadIcon, ClipboardCheckIcon, MailIcon } from "@/components/icons";
import { useTenantLeases, useTenantInvoices, type TenantLease } from "@/data/tenantPortal";
import { useOrganization } from "@/data/organization";
import { useDocuments, getSignedUrl } from "@/data/documents";
import { formatDate, formatMoney, daysUntil } from "@/lib/format";
import { frequencyLabel, leaseStatusLabel, leaseStatusTone } from "@/lib/labels";
import { pushToast } from "@/lib/toast";

function LeaseDocuments({ leaseId }: { leaseId: string }) {
  const { data: docs = [] } = useDocuments("lease", leaseId);
  if (docs.length === 0) return null;

  async function handleDownload(filePath: string, name: string) {
    try {
      const url = await getSignedUrl(filePath);
      window.open(url, "_blank", "noopener");
    } catch {
      pushToast(`Could not download ${name}.`, "error");
    }
  }

  return (
    <div className="mt-4 border-t border-slate-900/[0.08] pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</p>
      <div className="space-y-1.5">
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center gap-2">
            <FileTextIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{doc.name}</span>
            <button
              type="button"
              onClick={() => void handleDownload(doc.file_path, doc.name)}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function LeaseCard({ lease }: { lease: TenantLease }) {
  const days = daysUntil(lease.end_date);
  const expiringSoon = lease.status === "active" && days >= 0 && days <= 60;
  const prop = lease.unit?.property;
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {prop?.name ?? "Property"} · {lease.unit?.label ?? "Unit"}
          </h3>
          <p className="mt-0.5 text-sm text-slate-600">
            {prop ? `${prop.address ? prop.address + ", " : ""}${prop.city}, ${prop.country}` : ""}
          </p>
        </div>
        <Badge tone={leaseStatusTone[lease.status]}>{leaseStatusLabel[lease.status]}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-900/[0.08] pt-5 sm:grid-cols-3">
        <Detail label="Rent" value={`${formatMoney(lease.rent_amount, lease.currency)} ${frequencyLabel[lease.frequency].toLowerCase()}`} />
        <Detail label="Deposit" value={formatMoney(lease.deposit_amount, lease.currency)} />
        <Detail label="Home" value={`${lease.unit?.beds ?? 0} bd · ${lease.unit?.baths ?? 0} ba`} />
        <Detail label="Starts" value={formatDate(lease.start_date)} />
        <Detail label="Ends" value={formatDate(lease.end_date)} />
        <Detail label="Frequency" value={frequencyLabel[lease.frequency]} />
      </div>

      {expiringSoon && (
        <div className="mt-4">
          <Badge tone="amber">Your lease ends in {days} days</Badge>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-slate-900/[0.08] pt-4">
        <ClipboardCheckIcon
          className={`h-4 w-4 shrink-0 ${lease.ejari ? "text-emerald-500" : "text-slate-300"}`}
        />
        {lease.ejari ? (
          <p className="text-sm text-slate-600">
            EJARI registered ·{" "}
            <span className="font-medium text-slate-900">{lease.ejari.ejari_number}</span>
            {lease.ejari.expires_at && ` · valid until ${formatDate(lease.ejari.expires_at)}`}
          </p>
        ) : (
          <p className="text-sm text-slate-400">Not yet EJARI-registered</p>
        )}
      </div>

      <LeaseDocuments leaseId={lease.id} />
    </div>
  );
}

function DashboardSummary() {
  const { data: invoices = [] } = useTenantInvoices();

  const outstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  if (outstanding.length === 0) return null;

  const currency = outstanding[0]!.currency;
  const total = outstanding.reduce((sum, i) => sum + i.amount + i.vat_amount + i.late_fee, 0);
  const next = [...outstanding].sort((a, b) => a.due_date.localeCompare(b.due_date))[0]!;
  const hasOverdue = outstanding.some((i) => i.status === "overdue");

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      <div className="glass-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Outstanding balance
        </p>
        <p className={`mt-1 text-2xl font-bold ${hasOverdue ? "text-rose-600" : "text-slate-900"}`}>
          {formatMoney(total, currency)}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {outstanding.length} unpaid invoice{outstanding.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="glass-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Next payment due
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{formatDate(next.due_date)}</p>
        <p className="mt-0.5 text-xs text-slate-500">{formatMoney(next.amount + next.vat_amount + next.late_fee, next.currency)}</p>
      </div>
    </div>
  );
}

function AgencyContact() {
  const { data: org } = useOrganization();
  if (!org || (!org.phone && !org.email)) return null;

  return (
    <div className="glass-card mt-6 flex flex-wrap items-center gap-4 p-5">
      <p className="text-sm font-medium text-slate-700">Need help? Contact {org.name}</p>
      <div className="ml-auto flex flex-wrap gap-4 text-sm text-slate-500">
        {org.phone && <span>{org.phone}</span>}
        {org.email && (
          <span className="flex items-center gap-1.5">
            <MailIcon className="h-4 w-4 text-slate-400" />
            {org.email}
          </span>
        )}
      </div>
    </div>
  );
}

export function TenantHomePage() {
  const { profile } = useAuth();
  const { data, isLoading, isError, refetch } = useTenantLeases();

  if (isLoading) return <PageLoader label="Loading your home" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader title={`Hi, ${firstName}`} subtitle="Your home and lease details." />
      <DashboardSummary />
      {data.length === 0 ? (
        <EmptyState
          title="No lease yet"
          description="Once your manager sets up your lease, it shows up here."
        />
      ) : (
        <div className="space-y-4">
          {data.map((lease) => (
            <LeaseCard key={lease.id} lease={lease} />
          ))}
        </div>
      )}
      <AgencyContact />
    </div>
  );
}
