import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageLoader } from "@/components/ui/PageLoader";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="glass-panel p-7">{children}</div>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The recovery link's tokens are consumed automatically by the Supabase
    // client (detectSessionInUrl: true) before this effect runs. We just
    // need to confirm that left us with a usable session.
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setValidLink(true);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setValidLink(true);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }
    await supabase.auth.signOut();
    setDone(true);
    setSubmitting(false);
  }

  if (!ready) return <PageLoader label="Checking your link" />;

  if (done) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-slate-900">Password updated</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with your new password.
        </p>
        <Link to="/login" className="mt-6 inline-block">
          <Button variant="secondary">Go to sign in</Button>
        </Link>
      </Shell>
    );
  }

  if (!validLink) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-slate-900">Link expired</h1>
        <p className="mt-2 text-sm text-slate-600">
          This reset link is invalid or has already been used. Request a fresh one.
        </p>
        <Link to="/forgot-password" className="mt-6 inline-block">
          <Button variant="secondary">Request a new link</Button>
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-bold text-slate-900">Set a new password</h1>
      <p className="mt-1 text-sm text-slate-600">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Type it again"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <Button type="submit" size="lg" loading={submitting} className="mt-1">
          Update password
        </Button>
      </form>
    </Shell>
  );
}
