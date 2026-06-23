import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/useAuth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { useUpdateProfile, useUpdatePassword } from "@/data/profile";
import { useOrganization } from "@/data/organization";
import { roleLabel } from "@/layouts/navConfig";
import { pushToast } from "@/lib/toast";
import { formatDate, formatDateTime } from "@/lib/format";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const org = useOrganization();
  const updateProfile = useUpdateProfile();
  const updatePassword = useUpdatePassword();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  if (!profile) return <PageLoader label="Loading your profile" />;

  async function saveDetails(e: FormEvent) {
    e.preventDefault();
    setDetailsError(null);
    if (!fullName.trim()) {
      setDetailsError("Your name cannot be empty.");
      return;
    }
    try {
      await updateProfile.mutateAsync({
        id: profile!.id,
        input: { full_name: fullName.trim(), phone: phone.trim() || null },
      });
      await refreshProfile();
      pushToast("Profile updated", "success");
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (password.length < 8) {
      setPwError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setPwError("Those passwords do not match.");
      return;
    }
    try {
      await updatePassword.mutateAsync(password);
      setPassword("");
      setConfirm("");
      pushToast("Password changed", "success");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div>
      <PageHeader title="Your profile" subtitle="Manage your account details." />

      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-500/15 text-lg font-bold text-brand-700">
            {initialsOf(profile.full_name) || "?"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-lg font-semibold text-slate-900">
                {profile.full_name || "Account"}
              </p>
              <Badge tone="brand">{roleLabel[profile.role]}</Badge>
            </div>
            <p className="mt-0.5 truncate text-sm text-slate-500">{profile.email}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-900/[0.06] pt-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Member since
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-700">
              {formatDate(profile.created_at.slice(0, 10))}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Last signed in
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-700">
              {formatDateTime(user?.last_sign_in_at ?? null)}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <form onSubmit={saveDetails} className="flex flex-col gap-4">
            <h3 className="text-base font-semibold text-slate-900">Details</h3>
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="flex h-11 items-center rounded-xl border border-slate-900/10 bg-slate-50 px-3.5 text-sm text-slate-500">
                {profile.email}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Organization</label>
              <div className="flex h-11 items-center rounded-xl border border-slate-900/10 bg-slate-50 px-3.5 text-sm text-slate-500">
                {org.data?.name ?? "—"}
              </div>
            </div>
            {detailsError && <p className="text-sm text-rose-600">{detailsError}</p>}
            <div className="flex justify-end">
              <Button type="submit" loading={updateProfile.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <form onSubmit={changePassword} className="flex flex-col gap-4">
            <h3 className="text-base font-semibold text-slate-900">Password</h3>
            <p className="text-sm text-slate-600">
              Set a new password. You stay signed in on this device.
            </p>
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {pwError && <p className="text-sm text-rose-600">{pwError}</p>}
            <div className="flex justify-end">
              <Button type="submit" loading={updatePassword.isPending}>
                Change password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
