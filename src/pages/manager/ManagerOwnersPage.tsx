import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { TableSkeleton } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OwnerFormModal } from "@/features/owners/OwnerFormModal";
import { InviteModal } from "@/features/invites/InviteModal";
import { useOwners } from "@/data/owners";
import type { OwnerWithCount } from "@/data/owners";
import { useDeleteOwner } from "@/data/owners";
import { useInvitations } from "@/data/invitations";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import { cn } from "@/lib/cn";

function ownerInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ManagerOwnersPage() {
  const navigate = useNavigate();
  const owners = useOwners();
  const invitations = useInvitations();
  const deleteOwner = useDeleteOwner();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<OwnerWithCount | null>(null);
  const [inviting, setInviting] = useState<OwnerWithCount | null>(null);
  const [deleting, setDeleting] = useState<OwnerWithCount | null>(null);
  const [search, setSearch] = useState("");

  const pendingByOwner = useMemo(() => {
    const set = new Set<string>();
    for (const inv of invitations.data ?? []) {
      if (inv.status === "pending" && inv.owner_id) set.add(inv.owner_id);
    }
    return set;
  }, [invitations.data]);

  const { filtered, portalCount } = useMemo(() => {
    if (!owners.data) return { filtered: [], portalCount: 0 };
    const q = search.trim().toLowerCase();
    const filtered = q
      ? owners.data.filter((o) =>
          `${o.name} ${o.email ?? ""}`.toLowerCase().includes(q),
        )
      : owners.data;
    const portalCount = owners.data.filter((o) => !!o.profile_id).length;
    return { filtered, portalCount };
  }, [owners.data, search]);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteOwner.mutateAsync(deleting.id);
      pushToast("Owner deleted", "success");
      setDeleting(null);
    } catch (err) {
      pushToast(
        friendlyError(err, "This owner still has properties and cannot be deleted."),
        "error",
      );
    }
  }

  const hasData = !!owners.data && owners.data.length > 0;

  return (
    <div>
      <PageHeader
        title="Owners"
        subtitle="The people who own your properties. Invite them to a read only portal."
        action={<Button onClick={() => setAdding(true)}>Add owner</Button>}
      />

      {owners.isLoading && <TableSkeleton rows={3} cols={3} />}
      {owners.isError && <ErrorState onRetry={() => void owners.refetch()} />}

      {owners.data && owners.data.length === 0 && (
        <EmptyState
          title="No owners yet"
          description="Add an owner, then assign properties to them."
          action={<Button onClick={() => setAdding(true)}>Add owner</Button>}
        />
      )}

      {hasData && (
        <>
          {/* Summary bar */}
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-slate-600">
              <span className="font-semibold text-slate-900">{owners.data!.length}</span>{" "}
              {owners.data!.length === 1 ? "owner" : "owners"}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              <span className="font-semibold text-emerald-700">{portalCount}</span>{" "}
              with portal access
            </span>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, email" />
            <span className="ml-auto text-sm text-slate-500">
              {filtered.length} of {owners.data!.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No matches" description="Try a different search." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((o) => {
                const hasAccess = !!o.profile_id;
                const pending = pendingByOwner.has(o.id);
                const initials = ownerInitials(o.name);

                return (
                  <div
                    key={o.id}
                    onClick={() => navigate(`/manager/owners/${o.id}`)}
                    className="glass-card flex cursor-pointer flex-col p-5 transition-shadow hover:shadow-md"
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-700">
                        {initials || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-slate-900">{o.name}</p>
                        <p className="truncate text-sm text-slate-500">{o.email ?? "—"}</p>
                      </div>
                      {hasAccess ? (
                        <Badge tone="green">Has access</Badge>
                      ) : pending ? (
                        <Badge tone="blue">Invited</Badge>
                      ) : (
                        <Badge tone="slate">No access</Badge>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-900/[0.06] pt-4">
                      <div>
                        <p className="text-xs text-slate-400">Properties</p>
                        <p className="text-sm font-semibold text-slate-900">{o.property_count}</p>
                      </div>
                      {o.phone && (
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400">Phone</p>
                          <p className="truncate text-sm font-medium text-slate-700">{o.phone}</p>
                        </div>
                      )}
                      {!hasAccess && (
                        <div className="ml-auto">
                          <p className="text-xs text-slate-400">Portal</p>
                          <p className={cn("text-sm font-medium", pending ? "text-blue-600" : "text-slate-400")}>
                            {pending ? "Invite pending" : "Not invited"}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div
                      className="mt-4 flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!hasAccess && (
                        <Button variant="secondary" size="sm" onClick={() => setInviting(o)}>
                          {pending ? "Resend invite" : "Invite to portal"}
                        </Button>
                      )}
                      <div className="ml-auto flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(o)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(o)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <OwnerFormModal open={adding} onClose={() => setAdding(false)} />
      {editing && (
        <OwnerFormModal open={!!editing} onClose={() => setEditing(null)} owner={editing} />
      )}
      {inviting && (
        <InviteModal
          open={!!inviting}
          onClose={() => setInviting(null)}
          role="owner"
          subjectName={inviting.name}
          defaultEmail={inviting.email ?? ""}
          ownerId={inviting.id}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          title="Delete owner"
          message={`Delete ${deleting.name}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleteOwner.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
