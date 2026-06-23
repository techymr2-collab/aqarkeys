import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { InviteModal } from "@/features/invites/InviteModal";
import { useOrganization, useUpdateOrganization } from "@/data/organization";
import { useOrgMembers } from "@/data/organization";
import { useInvitations, useRevokeInvitation, inviteLink } from "@/data/invitations";
import { useLastAutomationRun, useRunAutomation, summariseRun } from "@/data/automation";
import { formatDate } from "@/lib/format";
import { copyToClipboard } from "@/lib/clipboard";
import { roleLabel } from "@/layouts/navConfig";
import { RefreshCwIcon } from "@/components/icons";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import type { Tone } from "@/lib/labels";
import type { UserRole } from "@/lib/database.types";

const roleTone: Record<UserRole, Tone> = {
  manager: "brand",
  owner: "blue",
  tenant: "slate",
};

export function ManagerOrgSettingsPage() {
  const org = useOrganization();
  const members = useOrgMembers();
  const { data: invitations = [], isLoading: invLoading } = useInvitations();
  const { data: lastRun } = useLastAutomationRun();
  const runAutomation = useRunAutomation();
  const updateOrg = useUpdateOrganization();
  const revokeInvitation = useRevokeInvitation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [trn, setTrn] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [inviting, setInviting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [orgIdCopied, setOrgIdCopied] = useState(false);
  const [tab, setTab] = useState<"general" | "automation" | "team">("general");

  useEffect(() => {
    if (!org.data) return;
    setName(org.data.name ?? "");
    setPhone(org.data.phone ?? "");
    setEmail(org.data.email ?? "");
    setWebsite(org.data.website ?? "");
    setAddress(org.data.address ?? "");
    setTrn(org.data.trn ?? "");
  }, [org.data]);

  if (org.isLoading) return <PageLoader label="Loading settings" />;
  if (org.isError || !org.data) return <ErrorState onRetry={() => void org.refetch()} />;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError("Organization name is required.");
      return;
    }
    try {
      await updateOrg.mutateAsync({
        id: org.data!.id,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        trn: trn.trim() || null,
      });
    } catch (err) {
      setFormError(friendlyError(err, "Could not save settings."));
    }
  }

  async function copyLink(inv: { id: string; token: string }) {
    const ok = await copyToClipboard(inviteLink(inv.token));
    if (ok) {
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 1500);
    } else {
      pushToast("Could not copy to clipboard.", "error");
    }
  }

  async function copyOrgId() {
    if (!org.data) return;
    const ok = await copyToClipboard(org.data.org_code);
    if (ok) {
      setOrgIdCopied(true);
      setTimeout(() => setOrgIdCopied(false), 1500);
    } else {
      pushToast("Could not copy to clipboard.", "error");
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this invitation?")) return;
    try {
      await revokeInvitation.mutateAsync(id);
      pushToast("Invitation revoked", "success");
    } catch (err) {
      pushToast(friendlyError(err, "Could not revoke invitation."), "error");
    }
  }

  const pendingInvites = invitations.filter((i) => i.status === "pending");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Organization Settings"
        subtitle="Configure your agency profile and manage team access."
      />

      <Tabs
        className="mb-6"
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        tabs={[
          { value: "general", label: "General" },
          { value: "automation", label: "Automation" },
          { value: "team", label: "Team" },
        ]}
      />

      {tab === "general" && (
      <div className="space-y-8">
      {/* ── Agency details ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Agency details"
          subtitle="Displayed on owner statements, invoices, and PDF exports."
        />

        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-slate-900/[0.03] px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Organization ID
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
              {org.data!.org_code}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyOrgId()}
            className="shrink-0 text-sm font-medium text-brand-600 hover:underline"
          >
            {orgIdCopied ? "Copied!" : "Copy"}
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Agency name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aqarkeys Real Estate"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+971 4 000 0000"
            />
            <Input
              label="Contact email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@agency.ae"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://agency.ae"
            />
            <Input
              label="TRN (Tax Registration Number)"
              value={trn}
              onChange={(e) => setTrn(e.target.value)}
              placeholder="100-123-456-7890-03"
            />
          </div>

          <Input
            label="Office address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Office 101, Business Bay, Dubai, UAE"
          />

          {formError && <p className="text-sm text-rose-600">{formError}</p>}

          <div className="flex justify-end">
            <Button type="submit" loading={updateOrg.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
      </div>
      )}

      {tab === "automation" && (
      <div className="space-y-8">
      {/* ── Automation ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Automation"
          subtitle="Daily housekeeping that runs on its own — no need to open a page."
          action={
            <Button
              size="sm"
              variant="secondary"
              loading={runAutomation.isPending}
              onClick={() => runAutomation.mutate()}
            >
              <RefreshCwIcon className="mr-1.5 h-4 w-4" />
              Run now
            </Button>
          }
        />

        <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <RefreshCwIcon className="h-4 w-4 shrink-0" />
          Runs automatically every day at 06:00 (GST)
        </div>

        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="text-brand-500">•</span>
            Generates rent invoices for active leases as each billing period comes due
          </li>
          <li className="flex gap-2">
            <span className="text-brand-500">•</span>
            Flags unpaid invoices as overdue once their due date passes
          </li>
          <li className="flex gap-2">
            <span className="text-brand-500">•</span>
            Activates upcoming leases on their start date and expires leases that have ended
          </li>
        </ul>

        <div className="mt-4 border-t border-slate-900/[0.06] pt-4 text-sm">
          {lastRun ? (
            <p className="text-slate-500">
              <span className="font-medium text-slate-700">
                Last run {formatDate(lastRun.ran_at.slice(0, 10))}
              </span>
              {lastRun.source === "manual" && " (manual)"} — {summariseRun(lastRun)}
            </p>
          ) : (
            <p className="text-slate-400">Hasn’t run yet.</p>
          )}
        </div>
      </Card>
      </div>
      )}

      {tab === "team" && (
      <div className="space-y-8">
      {/* ── Team members ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Team members"
          subtitle="Everyone with access to this workspace."
          action={
            <Button size="sm" onClick={() => setInviting(true)}>
              Invite manager
            </Button>
          }
        />
        {members.isLoading && <PageLoader label="Loading team" />}
        {members.isError && <ErrorState onRetry={() => void members.refetch()} />}
        {members.data && members.data.length === 0 && (
          <EmptyState
            title="No team members"
            description="Invite people and they will appear here after signing up."
          />
        )}
        {members.data && members.data.length > 0 && (
          <Table>
            <THead>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Role</TH>
              <TH>Joined</TH>
            </THead>
            <TBody>
              {members.data.map((m) => (
                <TR key={m.id}>
                  <TD className="font-medium text-slate-900">{m.full_name || "—"}</TD>
                  <TD className="text-slate-500">{m.email}</TD>
                  <TD>
                    <Badge tone={roleTone[m.role]}>{roleLabel[m.role]}</Badge>
                  </TD>
                  <TD className="text-slate-400">{formatDate(m.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* ── Pending invitations ───────────────────────────────────────────── */}
      {(invLoading || pendingInvites.length > 0) && (
        <Card>
          <CardHeader
            title="Pending invitations"
            subtitle="Invite links not yet accepted. Links expire after 7 days."
          />
          {invLoading ? (
            <PageLoader label="Loading invitations" />
          ) : (
            <Table>
              <THead>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Expires</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {pendingInvites.map((inv) => (
                  <TR key={inv.id}>
                    <TD className="font-medium text-slate-800">{inv.email}</TD>
                    <TD>
                      <Badge tone={roleTone[inv.role]}>{roleLabel[inv.role]}</Badge>
                    </TD>
                    <TD className="text-slate-400">{formatDate(inv.expires_at)}</TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => void copyLink(inv)}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          {copiedId === inv.id ? "Copied!" : "Copy link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void revoke(inv.id)}
                          className="text-xs font-medium text-slate-400 hover:text-rose-500 hover:underline"
                        >
                          Revoke
                        </button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}
      </div>
      )}

      {inviting && (
        <InviteModal
          open
          onClose={() => setInviting(false)}
          role="manager"
          subjectName="your colleague"
          defaultEmail=""
        />
      )}
    </div>
  );
}
