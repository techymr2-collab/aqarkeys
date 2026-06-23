import { type ReactNode, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ActionIcon } from "@/components/ui/ActionIcon";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { UnitFormModal } from "@/features/units/UnitFormModal";
import { ExpenseFormModal } from "@/features/expenses/ExpenseFormModal";
import { PropertyFormModal } from "@/features/properties/PropertyFormModal";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import {
  UserIcon,
  BuildingIcon,
  BanknoteIcon,
  ChartIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/icons";
import { useProperty, useDeleteProperty } from "@/data/properties";
import { useUnits, useDeleteUnit } from "@/data/units";
import { useExpenses, useDeleteExpense } from "@/data/expenses";
import { formatDate, formatMoney } from "@/lib/format";
import { unitStatusLabel, unitStatusTone } from "@/lib/labels";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import type { Expense, Unit } from "@/lib/database.types";
import type { Tone } from "@/lib/labels";

// ── Small helper rendered only on this page ──────────────────────────────────

function InfoCard({
  icon,
  iconClass,
  label,
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            iconClass,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Expense category → badge tone ────────────────────────────────────────────

const EXPENSE_TONE: Record<string, Tone> = {
  Maintenance: "amber",
  Repairs: "amber",
  "Service charge": "brand",
  Cleaning: "green",
  Utilities: "green",
  Insurance: "blue",
  "Management fee": "brand",
  Other: "slate",
};

function expenseTone(category: string): Tone {
  return EXPENSE_TONE[category] ?? "slate";
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ManagerPropertyDetailPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const property = useProperty(propertyId);
  const units = useUnits(propertyId);
  const expenses = useExpenses(propertyId);
  const deleteExpense = useDeleteExpense();
  const deleteProperty = useDeleteProperty();
  const deleteUnit = useDeleteUnit();
  const [adding, setAdding] = useState(false);
  const [editingProperty, setEditingProperty] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [addingExpense, setAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  async function handleDeleteProperty() {
    if (!propertyId) return;
    try {
      await deleteProperty.mutateAsync(propertyId);
      pushToast("Property deleted", "success");
      navigate("/manager/properties");
    } catch (err) {
      pushToast(friendlyError(err, "This property still has leases and cannot be deleted."), "error");
      setDeletingProperty(false);
    }
  }

  async function handleDeleteUnit() {
    if (!deletingUnit || !propertyId) return;
    try {
      await deleteUnit.mutateAsync({ id: deletingUnit.id, propertyId });
      pushToast("Unit deleted", "success");
      setDeletingUnit(null);
    } catch (err) {
      pushToast(friendlyError(err, "This unit has a lease and cannot be deleted."), "error");
    }
  }

  async function handleDeleteExpense() {
    if (!deletingExpense || !propertyId) return;
    try {
      await deleteExpense.mutateAsync({ id: deletingExpense.id, propertyId });
      pushToast("Expense deleted", "success");
      setDeletingExpense(null);
    } catch (err) {
      pushToast(friendlyError(err, "Could not delete the expense."), "error");
    }
  }

  if (property.isLoading) return <PageLoader label="Loading property" />;
  if (property.isError || !property.data) {
    return <ErrorState onRetry={() => void property.refetch()} />;
  }

  const p = property.data;
  const occupancy = p.unit_count
    ? Math.round((p.occupied_count / p.unit_count) * 100)
    : 0;

  // Per-status counts (only available once the units query resolves)
  const statusCounts = units.data
    ? {
        occupied: units.data.filter((u) => u.status === "occupied").length,
        vacant: units.data.filter((u) => u.status === "vacant").length,
        reserved: units.data.filter((u) => u.status === "reserved").length,
        under_maintenance: units.data.filter((u) => u.status === "under_maintenance").length,
      }
    : null;

  // Average market rent across all units
  const avgRent =
    units.data && units.data.length > 0
      ? Math.round(units.data.reduce((s, u) => s + u.market_rent, 0) / units.data.length)
      : null;

  // Total expenses
  const expenseTotal = expenses.data?.reduce((s, e) => s + e.amount, 0) ?? 0;

  return (
    <div>
      <PageHeader
        back={{ label: "Properties", to: "/manager/properties" }}
        title={p.name}
        subtitle={`${p.address || "No address"} · ${p.city}, ${p.country}`}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditingProperty(true)}>
              Edit
            </Button>
            <Button variant="ghost" onClick={() => setDeletingProperty(true)}>
              Delete
            </Button>
            <Button onClick={() => setAdding(true)}>Add unit</Button>
          </div>
        }
      />

      {/* ── Property stats ───────────────────────────────────────────── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          icon={<UserIcon className="h-5 w-5" />}
          iconClass="bg-slate-100 text-slate-600"
          label="Owner"
        >
          <p className="mt-1 truncate text-lg font-semibold text-slate-900">
            {p.owner?.name ?? "—"}
          </p>
        </InfoCard>

        <InfoCard
          icon={<BuildingIcon className="h-5 w-5" />}
          iconClass="bg-brand-50 text-brand-600"
          label="Occupancy"
        >
          <p className="mt-1 text-lg font-semibold text-slate-900">{occupancy}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${occupancy}%` }}
              role="progressbar"
              aria-valuenow={occupancy}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {p.occupied_count} of {p.unit_count} units
          </p>
        </InfoCard>

        <InfoCard
          icon={<BanknoteIcon className="h-5 w-5" />}
          iconClass="bg-emerald-50 text-emerald-600"
          label="Avg market rent"
        >
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {avgRent !== null ? formatMoney(avgRent, p.currency) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">per unit · {p.unit_count} units</p>
        </InfoCard>

        <InfoCard
          icon={<ChartIcon className="h-5 w-5" />}
          iconClass="bg-amber-50 text-amber-600"
          label="Management fee"
        >
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {p.management_fee_percent}%
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{p.currency} · {p.city}</p>
        </InfoCard>
      </div>

      {/* ── Units ────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Units</h2>
          {statusCounts && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {statusCounts.occupied > 0 && (
                <Badge tone="green">{statusCounts.occupied} Occupied</Badge>
              )}
              {statusCounts.vacant > 0 && (
                <Badge tone="slate">{statusCounts.vacant} Vacant</Badge>
              )}
              {statusCounts.reserved > 0 && (
                <Badge tone="blue">{statusCounts.reserved} Reserved</Badge>
              )}
              {statusCounts.under_maintenance > 0 && (
                <Badge tone="amber">{statusCounts.under_maintenance} Under maintenance</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {units.isLoading && <PageLoader label="Loading units" />}
      {units.isError && <ErrorState onRetry={() => void units.refetch()} />}

      {units.data && units.data.length === 0 && (
        <EmptyState
          title="No units here yet"
          description="Add the apartments or rooms inside this property."
          action={<Button onClick={() => setAdding(true)}>Add unit</Button>}
        />
      )}

      {units.data && units.data.length > 0 && (
        <Table>
          <THead>
            <TH>Unit</TH>
            <TH>Beds / Baths</TH>
            <TH>Status</TH>
            <TH className="text-right">Market rent</TH>
            <TH className="text-right">Actions</TH>
          </THead>
          <TBody>
            {units.data.map((u) => (
              <TR key={u.id}>
                <TD className="font-medium text-slate-900">{u.label}</TD>
                <TD>
                  {u.beds} bd · {u.baths} ba
                </TD>
                <TD>
                  <Badge tone={unitStatusTone[u.status]}>{unitStatusLabel[u.status]}</Badge>
                </TD>
                <TD className="text-right tabular-nums">{formatMoney(u.market_rent, p.currency)}</TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <ActionIcon label="Edit" onClick={() => setEditingUnit(u)}>
                      <PencilIcon className="h-4 w-4" />
                    </ActionIcon>
                    <ActionIcon label="Delete" danger onClick={() => setDeletingUnit(u)}>
                      <TrashIcon className="h-4 w-4" />
                    </ActionIcon>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* ── Expenses ─────────────────────────────────────────────────── */}
      <div className="mt-10 mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Expenses</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {expenses.data && expenses.data.length > 0
              ? `${expenses.data.length} expense${expenses.data.length === 1 ? "" : "s"} · Total ${formatMoney(expenseTotal, p.currency)}`
              : "These flow into this property's owner statement."}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setAddingExpense(true)}>
          Add expense
        </Button>
      </div>

      {expenses.isLoading && <PageLoader label="Loading expenses" />}
      {expenses.isError && <ErrorState onRetry={() => void expenses.refetch()} />}

      {expenses.data && expenses.data.length === 0 && (
        <EmptyState
          title="No expenses logged"
          description="Add maintenance, service charges, and other costs for this property."
          action={
            <Button variant="secondary" onClick={() => setAddingExpense(true)}>
              Add expense
            </Button>
          }
        />
      )}

      {expenses.data && expenses.data.length > 0 && (
        <Table>
          <THead>
            <TH>Date</TH>
            <TH>Category</TH>
            <TH>Note</TH>
            <TH className="text-right">Amount</TH>
            <TH className="text-right">Actions</TH>
          </THead>
          <TBody>
            {expenses.data.map((ex) => (
              <TR key={ex.id}>
                <TD className="tabular-nums">{formatDate(ex.date)}</TD>
                <TD>
                  <Badge tone={expenseTone(ex.category)}>{ex.category}</Badge>
                </TD>
                <TD className="text-slate-600">{ex.note ?? "—"}</TD>
                <TD className="text-right tabular-nums">
                  {formatMoney(ex.amount, p.currency)}
                </TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <ActionIcon label="Edit" onClick={() => setEditingExpense(ex)}>
                      <PencilIcon className="h-4 w-4" />
                    </ActionIcon>
                    <ActionIcon label="Delete" danger onClick={() => setDeletingExpense(ex)}>
                      <TrashIcon className="h-4 w-4" />
                    </ActionIcon>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* ── Documents ────────────────────────────────────────────────── */}
      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
        <p className="mt-0.5 text-sm text-slate-600">
          Lease agreements, inspection reports, photos and property files.
        </p>
      </div>
      {propertyId && <DocumentsPanel entityType="property" entityId={propertyId} orgId={p.org_id} />}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {adding && propertyId && (
        <UnitFormModal open={adding} onClose={() => setAdding(false)} propertyId={propertyId} />
      )}
      {editingUnit && propertyId && (
        <UnitFormModal
          open={!!editingUnit}
          onClose={() => setEditingUnit(null)}
          propertyId={propertyId}
          unit={editingUnit}
        />
      )}
      {addingExpense && propertyId && (
        <ExpenseFormModal
          open={addingExpense}
          onClose={() => setAddingExpense(false)}
          propertyId={propertyId}
          currency={p.currency}
        />
      )}
      {editingExpense && propertyId && (
        <ExpenseFormModal
          open={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          propertyId={propertyId}
          currency={p.currency}
          expense={editingExpense}
        />
      )}
      {editingProperty && (
        <PropertyFormModal
          open={editingProperty}
          onClose={() => setEditingProperty(false)}
          property={p}
        />
      )}
      {deletingProperty && (
        <ConfirmDialog
          open={deletingProperty}
          title="Delete property"
          message={`Delete ${p.name} and all its units? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleteProperty.isPending}
          onConfirm={() => void handleDeleteProperty()}
          onClose={() => setDeletingProperty(false)}
        />
      )}
      {deletingUnit && (
        <ConfirmDialog
          open={!!deletingUnit}
          title="Delete unit"
          message={`Delete ${deletingUnit.label}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleteUnit.isPending}
          onConfirm={() => void handleDeleteUnit()}
          onClose={() => setDeletingUnit(null)}
        />
      )}
      {deletingExpense && (
        <ConfirmDialog
          open={!!deletingExpense}
          title="Delete expense"
          message={`Delete this ${deletingExpense.category} expense?`}
          confirmLabel="Delete"
          destructive
          loading={deleteExpense.isPending}
          onConfirm={() => void handleDeleteExpense()}
          onClose={() => setDeletingExpense(null)}
        />
      )}
    </div>
  );
}
