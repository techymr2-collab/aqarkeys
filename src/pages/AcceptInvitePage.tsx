import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useInvitationByToken } from "@/data/invitations";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageLoader } from "@/components/ui/PageLoader";

const roleLabel: Record<string, string> = {
  manager: "manager",
  owner: "owner",
  tenant: "tenant",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-6 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="glass-panel p-7">{children}</div>
      </div>
    </div>
  );
}

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { data, isLoading, isError } = useInvitationByToken(token);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-slate-900">Invalid link</h1>
        <p className="mt-2 text-sm text-slate-600">This invite link is missing its token.</p>
      </Shell>
    );
  }

  if (isLoading) return <PageLoader label="Checking your invite" />;

  if (isError || !data || !data.valid) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-slate-900">Invite not valid</h1>
        <p className="mt-2 text-sm text-slate-600">
          This invite has expired or has already been used. Ask your manager for a
          fresh link.
        </p>
        <Link to="/login" className="mt-6 inline-block">
          <Button variant="secondary">Go to sign in</Button>
        </Link>
      </Shell>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setSubmitting(true);
    // org_id and role are assigned server side from the invitation, so we do
    // not pass them here (full_name is cosmetic). The email must match.
    const { error: signUpError } = await supabase.auth.signUp({
      email: data!.email,
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }
    setDone(true);
    setSubmitting(false);
  }

  if (done) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-slate-900">Almost there</h1>
        <p className="mt-2 text-sm text-slate-600">
          We sent a confirmation link to {data.email}. Click it to activate your
          account, then sign in.
        </p>
        <Link to="/login" className="mt-6 inline-block">
          <Button variant="secondary">Go to sign in</Button>
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-bold text-slate-900">Join {data.org_name}</h1>
      <p className="mt-1 text-sm text-slate-600">
        You are invited as {roleLabel[data.role] ?? data.role}. Set a password to
        get started.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input label="Email" type="email" value={data.email} readOnly disabled />
        <Input
          label="Your name"
          autoComplete="name"
          placeholder="Your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <Button type="submit" size="lg" loading={submitting} className="mt-1">
          Accept invite
        </Button>
      </form>
    </Shell>
  );
}
