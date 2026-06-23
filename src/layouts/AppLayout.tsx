import { Fragment, Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/auth/useAuth";
import { useOrganization } from "@/data/organization";
import { Logo } from "@/components/brand/Logo";
import { UserMenu } from "@/components/layout/UserMenu";
import { cn } from "@/lib/cn";
import { navForRole } from "@/layouts/navConfig";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { GlobalSearch } from "@/features/search/GlobalSearch";
import { useManagerNotifications, useTenantNotifications } from "@/data/notifications";

// Thin per-role wrappers so each only calls the hook it actually needs —
// avoids firing the manager's org-wide queries for a tenant session (and
// vice versa) just to feed one shared, prop-driven NotificationCenter.
function ManagerNotificationCenter() {
  return <NotificationCenter notifications={useManagerNotifications()} />;
}
function TenantNotificationCenter() {
  return <NotificationCenter notifications={useTenantNotifications()} />;
}

export function AppLayout() {
  const { profile } = useAuth();
  const { data: org } = useOrganization();

  if (!profile) return null;

  const items = navForRole(profile.role);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-900/[0.07] bg-white/80 px-3 py-5 backdrop-blur-xl">
        <div className="relative px-3 pb-1">
          <Logo orgName={org?.name} subtitle={org?.org_code} />
        </div>

        <nav className="relative mt-6 flex flex-1 flex-col">
          {items.map((item, idx) => {
            const prevSection = idx > 0 ? items[idx - 1]?.section : undefined;
            const showSection =
              item.section !== undefined && item.section !== prevSection;

            return (
              <Fragment key={item.to}>
                {showSection && (
                  <p
                    className={cn(
                      "px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400",
                      idx === 0 ? "mb-1" : "mb-1 mt-5",
                    )}
                  >
                    {item.section}
                  </p>
                )}
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-500/[0.1] font-semibold text-brand-700"
                        : "text-slate-500 hover:bg-slate-900/[0.04] hover:text-slate-900",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive ? "text-brand-600" : "text-slate-400",
                        )}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              </Fragment>
            );
          })}
        </nav>

      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-20 flex shrink-0 items-center gap-4 border-b border-slate-900/[0.07] bg-white/80 px-8 py-4 backdrop-blur-xl">
          <div id="page-header-slot" className="min-w-0 flex-1" />
          {profile.role === "manager" && <GlobalSearch />}
          {profile.role === "manager" && <ManagerNotificationCenter />}
          {profile.role === "tenant" && <TenantNotificationCenter />}
          <UserMenu />
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <Suspense fallback={<PageLoader label="Loading" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
