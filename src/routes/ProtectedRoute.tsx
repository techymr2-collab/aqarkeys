import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { FullScreenLoader } from "@/components/ui/PageLoader";
import { homePathForRole } from "@/routes/roles";
import type { UserRole } from "@/lib/database.types";

interface ProtectedRouteProps {
  allow: UserRole[];
}

export function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenLoader label="Checking your access" />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Signed in but profile row not yet available.
  if (!profile) {
    return <FullScreenLoader label="Loading your account" />;
  }

  if (!allow.includes(profile.role)) {
    return <Navigate to={homePathForRole(profile.role)} replace />;
  }

  return <Outlet />;
}
