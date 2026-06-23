import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateInvitation, inviteLink } from "@/data/invitations";
import { copyToClipboard } from "@/lib/clipboard";
import type { UserRole } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  role: UserRole;
  subjectName: string;
  defaultEmail: string;
  ownerId?: string;
  tenantId?: string;
}

export function InviteModal({
  open,
  onClose,
  role,
  subjectName,
  defaultEmail,
  ownerId,
  tenantId,
}: Props) {
  const createInvitation = useCreateInvitation();
  const [email, setEmail] = useState(defaultEmail);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter an email to invite.");
      return;
    }
    try {
      const invite = await createInvitation.mutateAsync({
        email: email.trim(),
        role,
        owner_id: ownerId ?? null,
        tenant_id: tenantId ?? null,
      });
      setLink(inviteLink(invite.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function copy() {
    if (!link) return;
    const ok = await copyToClipboard(link);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      setCopied(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invite ${subjectName}`}
      description={`Give ${subjectName} ${role} access to your workspace.`}
    >
      {link ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            Share this link with {subjectName}. They set a password and get
            {" "}
            {role} access linked to this record.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-slate-900/10 bg-white p-2">
            <input
              readOnly
              value={link}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-800 focus:outline-none"
            />
            <Button size="sm" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="person@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createInvitation.isPending}>
              Create invite link
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
