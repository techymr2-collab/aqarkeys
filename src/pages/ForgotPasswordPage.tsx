import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Always show the same confirmation, whether or not the email exists —
      // don't let this form be used to probe for registered accounts.
      setSent(true);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="glass-panel p-7">
          {sent ? (
            <>
              <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
              <p className="mt-2 text-sm text-slate-600">
                If an account exists for {email.trim()}, we sent a link to reset the
                password. It expires in an hour.
              </p>
              <Link to="/login" className="mt-6 inline-block">
                <Button variant="secondary">Back to sign in</Button>
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900">Reset your password</h1>
              <p className="mt-1 text-sm text-slate-600">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {error && <p className="text-sm text-rose-400">{error}</p>}
                <Button type="submit" size="lg" loading={submitting} className="mt-1">
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/login" className="font-medium text-brand-700 hover:text-brand-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
