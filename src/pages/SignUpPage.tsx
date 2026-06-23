import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { homePathForRole } from "@/routes/roles";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FullScreenLoader } from "@/components/ui/PageLoader";

export function SignUpPage() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (session && profile) {
      navigate(homePathForRole(profile.role), { replace: true });
    }
  }, [session, profile, navigate]);

  if (loading) return <FullScreenLoader label="Loading" />;
  if (session && profile) {
    return <Navigate to={homePathForRole(profile.role)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            org_name: orgName.trim(),
            role: "manager",
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setSubmitting(false);
        return;
      }
      // If the project requires email confirmation there is no session yet.
      if (!data.session) {
        setCheckEmail(true);
        setSubmitting(false);
      }
      // Otherwise the auth listener takes over and the effect redirects.
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-sm animate-fade-in text-center">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
          <div className="glass-panel p-7">
            <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
            <p className="mt-2 text-sm text-slate-600">
              We sent a confirmation link to {email}. Click it to activate your
              account, then sign in.
            </p>
            <Link to="/login" className="mt-6 inline-block">
              <Button variant="secondary">Back to sign in</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center px-6 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="glass-panel p-7">
          <h1 className="text-xl font-bold text-slate-900">Start your agency</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create your workspace and run your portfolio in minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Input
              label="Your name"
              autoComplete="name"
              placeholder="Maya Manager"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Agency name"
              placeholder="Aqarkeys Real Estate"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand-500"
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="font-medium text-brand-700 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank" className="font-medium text-brand-700 hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <Button type="submit" size="lg" loading={submitting} className="mt-1">
              Create workspace
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already with us?{" "}
          <Link to="/login" className="font-medium text-brand-700 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
