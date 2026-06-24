import { useEffect, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { UploadIcon, TrashIcon } from "@/components/icons";
import {
  maintenanceCategoryOptions,
  maintenancePriorityOptions,
  maintenanceStatusOptions,
} from "@/lib/options";
import { maintenanceCategoryLabel } from "@/lib/labels";
import {
  useUpdateMaintenance,
  useApproveQuote,
  useRejectQuote,
  isOverdue,
  type MaintenanceWithRelations,
} from "@/data/maintenance";
import { useVendorOptions } from "@/data/vendors";
import {
  useMaintenancePhotos,
  useUploadMaintenancePhoto,
  useDeleteMaintenancePhoto,
  getMaintenancePhotoUrl,
} from "@/data/maintenancePhotos";
import { useAuth } from "@/auth/useAuth";
import { formatDate, formatMoney } from "@/lib/format";
import { maintenanceApprovalStatusLabel, maintenanceApprovalStatusTone } from "@/lib/labels";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import type {
  MaintenanceCategory,
  MaintenancePhoto,
  MaintenancePriority,
  MaintenanceStatus,
} from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  request: MaintenanceWithRelations;
}

function PhotoThumbnail({
  photo,
  canDelete,
  onDelete,
}: {
  photo: MaintenancePhoto;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMaintenancePhotoUrl(photo.file_path)
      .then((u) => active && setUrl(u))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [photo.file_path]);

  return (
    <div className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt="Issue photo" className="h-20 w-20 object-cover" />
        </a>
      ) : (
        <div className="h-20 w-20 animate-pulse bg-slate-200" />
      )}
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete photo"
          className="absolute right-1 top-1 hidden rounded-full bg-slate-900/70 p-1 text-white group-hover:block"
        >
          <TrashIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function MaintenanceDetailModal({ open, onClose, request }: Props) {
  const update = useUpdateMaintenance();
  const approveQuote = useApproveQuote();
  const rejectQuote = useRejectQuote();
  const { profile } = useAuth();
  const { data: vendors = [] } = useVendorOptions();
  const photos = useMaintenancePhotos(request.id);
  const uploadPhoto = useUploadMaintenancePhoto(request.id, request.org_id);
  const deletePhoto = useDeleteMaintenancePhoto(request.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currency = request.unit?.property?.currency ?? "AED";

  const [status, setStatus] = useState<MaintenanceStatus>(request.status);
  const [priority, setPriority] = useState<MaintenancePriority>(request.priority);
  const [category, setCategory] = useState<MaintenanceCategory>(request.category);
  const [vendorId, setVendorId] = useState(request.vendor_id ?? "");
  const [assignee, setAssignee] = useState(request.assignee ?? "");
  const [dueDate, setDueDate] = useState(request.due_date ?? "");
  const [quotedCost, setQuotedCost] = useState(request.quoted_cost != null ? String(request.quoted_cost) : "");
  const [cost, setCost] = useState(request.cost != null ? String(request.cost) : "");
  const [vendorRating, setVendorRating] = useState(request.vendor_rating ?? 0);
  const [error, setError] = useState<string | null>(null);

  const vendorOptions = [
    { value: "", label: "— No vendor —" },
    ...vendors.map((v) => ({
      value: v.id,
      label: `${v.name} · ${maintenanceCategoryLabel[v.trade]}`,
    })),
  ];

  function chooseVendor(id: string) {
    setVendorId(id);
    const vendor = vendors.find((v) => v.id === id);
    if (vendor) setAssignee(vendor.name);
  }

  const willLogExpense = status === "resolved" && Number(cost) > 0 && !request.expense_id;
  const overdue = isOverdue(request);
  const showVendorRating = status === "resolved" && !!vendorId;

  async function handleApprove() {
    try {
      await approveQuote.mutateAsync(request.id);
    } catch (err) {
      pushToast(friendlyError(err, "Could not approve the quote."), "error");
    }
  }

  async function handleReject() {
    try {
      await rejectQuote.mutateAsync(request.id);
    } catch (err) {
      pushToast(friendlyError(err, "Could not reject the quote."), "error");
    }
  }

  async function handleUploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const results = await Promise.allSettled([...files].map((f) => uploadPhoto.mutateAsync(f)));
    if (results.some((r) => r.status === "rejected")) {
      pushToast("One or more photos failed to upload.", "error");
    }
  }

  async function handleDeletePhoto(photo: MaintenancePhoto) {
    try {
      await deletePhoto.mutateAsync({ id: photo.id, filePath: photo.file_path });
    } catch (err) {
      pushToast(friendlyError(err, "Could not delete the photo."), "error");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({
        id: request.id,
        input: {
          status,
          priority,
          category,
          vendor_id: vendorId || null,
          assignee: assignee.trim() || null,
          due_date: dueDate || null,
          quoted_cost: quotedCost === "" ? null : Number(quotedCost),
          cost: cost === "" ? null : Number(cost),
          vendor_rating: showVendorRating && vendorRating > 0 ? vendorRating : request.vendor_rating,
        },
      });
      pushToast(
        willLogExpense ? "Resolved. Cost logged to the owner statement." : "Work order updated",
        "success",
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={request.title} description={`${request.unit?.property?.name ?? ""} · ${request.unit?.label ?? ""}`} size="lg">
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span>Category {maintenanceCategoryLabel[request.category]}</span>
          <span>·</span>
          <span>Reported {formatDate(request.created_at.slice(0, 10))}</span>
          {request.reporter?.full_name && (
            <>
              <span>·</span>
              <span>by {request.reporter.full_name}</span>
            </>
          )}
          {request.due_date && (
            <>
              <span>·</span>
              <span className={overdue ? "font-semibold text-rose-600" : ""}>
                {overdue ? "Overdue since" : "Due"} {formatDate(request.due_date)}
              </span>
            </>
          )}
        </div>
        {request.description && (
          <p className="rounded-xl bg-slate-900/[0.03] p-3 text-sm text-slate-700">
            {request.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {request.expense_id && <Badge tone="green">Cost logged to owner statement</Badge>}
          {request.cost_approval_status !== "not_required" && (
            <Badge tone={maintenanceApprovalStatusTone[request.cost_approval_status]}>
              Quote {maintenanceApprovalStatusLabel[request.cost_approval_status]}
            </Badge>
          )}
        </div>

        {/* ── Photos ───────────────────────────────────────────────── */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Photos</p>
          <div className="flex flex-wrap gap-2">
            {(photos.data ?? []).map((p) => (
              <PhotoThumbnail
                key={p.id}
                photo={p}
                canDelete={!!profile && profile.role === "manager"}
                onDelete={() => void handleDeletePhoto(p)}
              />
            ))}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleUploadPhotos(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-900/15 text-slate-400 hover:border-brand-400/60 hover:text-brand-600"
            >
              <UploadIcon className="h-4 w-4" />
              <span className="text-[10px] font-medium">Add</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Status"
            options={maintenanceStatusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
          />
          <Select
            label="Priority"
            options={maintenancePriorityOptions}
            value={priority}
            onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
          />
          <Select
            label="Category"
            options={maintenanceCategoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
          />
          <Select
            label="Vendor"
            options={vendorOptions}
            placeholder="— No vendor —"
            value={vendorId}
            onChange={(e) => chooseVendor(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Assigned to"
            placeholder="Contractor or staff name"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          />
          <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        {/* ── Quote / cost approval ────────────────────────────────── */}
        <div className="rounded-xl border border-slate-900/10 p-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={`Quoted cost (${currency})`}
              type="number"
              min={0}
              placeholder="Estimate before work starts"
              value={quotedCost}
              onChange={(e) => setQuotedCost(e.target.value)}
            />
            <Input
              label={`Final cost (${currency})`}
              type="number"
              min={0}
              placeholder="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          {request.cost_approval_status === "pending" && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2">
              <p className="text-sm text-amber-800">
                {formatMoney(request.quoted_cost ?? 0, currency)} quote awaiting approval.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => void handleReject()} loading={rejectQuote.isPending}>
                  Reject
                </Button>
                <Button size="sm" onClick={() => void handleApprove()} loading={approveQuote.isPending}>
                  Approve
                </Button>
              </div>
            </div>
          )}
          {request.cost_approval_status === "approved" && request.approved_at && (
            <p className="mt-2 text-xs text-emerald-700">
              Quote approved {formatDate(request.approved_at.slice(0, 10))}.
            </p>
          )}
        </div>

        {showVendorRating && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Rate this vendor's work</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setVendorRating(n)}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  className={`text-2xl leading-none ${n <= vendorRating ? "text-amber-500" : "text-slate-300"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        )}

        {willLogExpense && (
          <p className="text-sm text-emerald-700">
            Resolving with a cost of {formatMoney(Number(cost), currency)} will add a Maintenance
            expense to this property.
          </p>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" loading={update.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
