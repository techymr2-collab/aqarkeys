import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { homePathForRole } from "@/routes/roles";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FullScreenLoader } from "@/components/ui/PageLoader";

export function LoginPage() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Once authenticated and the profile is known, route to the role home.
  useEffect(() => {
    if (session && profile) {
      navigate(homePathForRole(profile.role), { replace: true });
    }
  }, [session, profile, navigate]);

  if (loading) {
    return <FullScreenLoader label="Loading" />;
  }

  // Already signed in: bounce to the role home (profile resolves via effect).
  if (session && profile) {
    return <Navigate to={homePathForRole(profile.role)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("That email and password did not match. Try again.");
        setSubmitting(false);
      }
      // On success the auth listener takes over and the effect redirects.
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
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
          <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in to run your portfolio.
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
            <div>
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Link
                to="/forgot-password"
                className="mt-1.5 inline-block text-xs font-medium text-brand-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <Button type="submit" size="lg" loading={submitting} className="mt-1">
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          New here?{" "}
          <Link to="/signup" className="font-medium text-brand-700 hover:text-brand-700">
            Start your agency
          </Link>
        </p>
      </div>
    </div>
  );
}
