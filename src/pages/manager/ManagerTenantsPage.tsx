import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ActionIcon } from "@/components/ui/ActionIcon";
import { MailIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Table, THead, TH, TBody, TR, TD, TableSkeleton } from "@/components/ui/Table";
import { TenantFormModal } from "@/features/tenants/TenantFormModal";
import { InviteModal } from "@/features/invites/InviteModal";
import { useTenants, useDeleteTenant } from "@/data/tenants";
import { useInvitations } from "@/data/invitations";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import type { Tenant } from "@/lib/database.types";

const PAGE_SIZE = 20;

export function ManagerTenantsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useTenants();
  const invitations = useInvitations();
  const deleteTenant = useDeleteTenant();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [inviting, setInviting] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState<Tenant | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search]);

  const pendingByTenant = useMemo(() => {
    const set = new Set<string>();
    for (const inv of invitations.data ?? []) {
      if (inv.status === "pending" && inv.tenant_id) set.add(inv.tenant_id);
    }
    return set;
  }, [invitations.data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((t) =>
      `${t.name} ${t.email ?? ""} ${t.phone ?? ""}`.toLowerCase().includes(q),
    );
  }, [data, search]);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteTenant.mutateAsync(deleting.id);
      pushToast("Tenant deleted", "success");
      setDeleting(null);
    } catch (err) {
      pushToast(
        friendlyError(err, "This tenant has a lease and cannot be deleted."),
        "error",
      );
    }
  }

  const hasData = !!data && data.length > 0;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Tenants"
        subtitle="The people renting your units."
        action={<Button onClick={() => setAdding(true)}>Add tenant</Button>}
      />

      {isLoading && <TableSkeleton rows={8} cols={4} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No tenants yet"
          description="Add a tenant, then assign them to a unit with a lease."
          action={<Button onClick={() => setAdding(true)}>Add tenant</Button>}
        />
      )}

      {hasData && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Filters */}
          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, phone" />
            <span className="ml-auto text-sm text-slate-500">
              {filtered.length} of {data.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No matches" description="Try a different search." />
          ) : (
            <Table
              className="h-full"
              footer={
                <Pagination
                  page={page}
                  pageCount={Math.ceil(filtered.length / PAGE_SIZE)}
                  total={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPage={setPage}
                />
              }
            >
              <THead>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Phone</TH>
                <TH>Portal access</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {paginate(filtered, page, PAGE_SIZE).map((t) => {
                  const hasAccess = !!t.profile_id;
                  const pending = pendingByTenant.has(t.id);
                  return (
                    <TR key={t.id} onClick={() => navigate(`/manager/tenants/${t.id}`)}>
                      <TD className="font-medium text-slate-900">{t.name}</TD>
                      <TD>{t.email ?? "—"}</TD>
                      <TD>{t.phone ?? "—"}</TD>
                      <TD>
                        {hasAccess ? (
                          <Badge tone="green">Has access</Badge>
                        ) : pending ? (
                          <Badge tone="blue">Invited</Badge>
                        ) : (
                          <Badge tone="slate">No access</Badge>
                        )}
                      </TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {!hasAccess && (
                            <ActionIcon
                              label={pending ? "Resend invite" : "Invite to portal"}
                              onClick={(e) => { e.stopPropagation(); setInviting(t); }}
                            >
                              <MailIcon className="h-4 w-4" />
                            </ActionIcon>
                          )}
                          <ActionIcon label="Edit" onClick={(e) => { e.stopPropagation(); setEditing(t); }}>
                            <PencilIcon className="h-4 w-4" />
                          </ActionIcon>
                          <ActionIcon label="Delete" danger onClick={(e) => { e.stopPropagation(); setDeleting(t); }}>
                            <TrashIcon className="h-4 w-4" />
                          </ActionIcon>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      )}

      <TenantFormModal open={adding} onClose={() => setAdding(false)} />
      {editing && (
        <TenantFormModal open={!!editing} onClose={() => setEditing(null)} tenant={editing} />
      )}
      {inviting && (
        <InviteModal
          open={!!inviting}
          onClose={() => setInviting(null)}
          role="tenant"
          subjectName={inviting.name}
          defaultEmail={inviting.email ?? ""}
          tenantId={inviting.id}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          title="Delete tenant"
          message={`Delete ${deleting.name}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleteTenant.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
