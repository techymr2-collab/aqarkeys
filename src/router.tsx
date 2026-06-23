import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { AcceptInvitePage } from "@/pages/AcceptInvitePage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { TermsOfServicePage } from "@/pages/TermsOfServicePage";
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicyPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { RouteError } from "@/components/RouteError";
import { lazy } from "react";

// In-app pages are code-split so the marketing/auth shell and heavy deps
// (Recharts) load on demand. A Suspense boundary lives in AppLayout.
const ManagerDashboardPage = lazy(() =>
  import("@/pages/manager/ManagerDashboardPage").then((m) => ({ default: m.ManagerDashboardPage })),
);
const ManagerPropertiesPage = lazy(() =>
  import("@/pages/manager/ManagerPropertiesPage").then((m) => ({ default: m.ManagerPropertiesPage })),
);
const ManagerPropertyDetailPage = lazy(() =>
  import("@/pages/manager/ManagerPropertyDetailPage").then((m) => ({
    default: m.ManagerPropertyDetailPage,
  })),
);
const ManagerOwnersPage = lazy(() =>
  import("@/pages/manager/ManagerOwnersPage").then((m) => ({ default: m.ManagerOwnersPage })),
);
const ManagerOwnerDetailPage = lazy(() =>
  import("@/pages/manager/ManagerOwnerDetailPage").then((m) => ({
    default: m.ManagerOwnerDetailPage,
  })),
);
const ManagerTenantsPage = lazy(() =>
  import("@/pages/manager/ManagerTenantsPage").then((m) => ({ default: m.ManagerTenantsPage })),
);
const ManagerTenantDetailPage = lazy(() =>
  import("@/pages/manager/ManagerTenantDetailPage").then((m) => ({
    default: m.ManagerTenantDetailPage,
  })),
);
const ManagerLeasesPage = lazy(() =>
  import("@/pages/manager/ManagerLeasesPage").then((m) => ({ default: m.ManagerLeasesPage })),
);
const ManagerLeaseDetailPage = lazy(() =>
  import("@/pages/manager/ManagerLeaseDetailPage").then((m) => ({
    default: m.ManagerLeaseDetailPage,
  })),
);
const ManagerInvoicesPage = lazy(() =>
  import("@/pages/manager/ManagerInvoicesPage").then((m) => ({ default: m.ManagerInvoicesPage })),
);
const ManagerInvoiceDetailPage = lazy(() =>
  import("@/pages/manager/ManagerInvoiceDetailPage").then((m) => ({
    default: m.ManagerInvoiceDetailPage,
  })),
);
const ManagerMaintenancePage = lazy(() =>
  import("@/pages/manager/ManagerMaintenancePage").then((m) => ({
    default: m.ManagerMaintenancePage,
  })),
);
const ManagerPayoutsPage = lazy(() =>
  import("@/pages/manager/ManagerPayoutsPage").then((m) => ({ default: m.ManagerPayoutsPage })),
);
const ManagerAnalyticsPage = lazy(() =>
  import("@/pages/manager/ManagerAnalyticsPage").then((m) => ({
    default: m.ManagerAnalyticsPage,
  })),
);
const ManagerRentRollPage = lazy(() =>
  import("@/pages/manager/ManagerRentRollPage").then((m) => ({
    default: m.ManagerRentRollPage,
  })),
);
const ManagerVacanciesPage = lazy(() =>
  import("@/pages/manager/ManagerVacanciesPage").then((m) => ({
    default: m.ManagerVacanciesPage,
  })),
);
const ManagerChequesPage = lazy(() =>
  import("@/pages/manager/ManagerChequesPage").then((m) => ({
    default: m.ManagerChequesPage,
  })),
);
const ManagerEjariPage = lazy(() =>
  import("@/pages/manager/ManagerEjariPage").then((m) => ({
    default: m.ManagerEjariPage,
  })),
);
const ManagerRenewalsPage = lazy(() =>
  import("@/pages/manager/ManagerRenewalsPage").then((m) => ({
    default: m.ManagerRenewalsPage,
  })),
);
const ManagerOrgSettingsPage = lazy(() =>
  import("@/pages/manager/ManagerOrgSettingsPage").then((m) => ({
    default: m.ManagerOrgSettingsPage,
  })),
);
const ManagerVendorsPage = lazy(() =>
  import("@/pages/manager/ManagerVendorsPage").then((m) => ({
    default: m.ManagerVendorsPage,
  })),
);
const ManagerVendorDetailPage = lazy(() =>
  import("@/pages/manager/ManagerVendorDetailPage").then((m) => ({
    default: m.ManagerVendorDetailPage,
  })),
);
const ManagerLeadsPage = lazy(() =>
  import("@/pages/manager/ManagerLeadsPage").then((m) => ({
    default: m.ManagerLeadsPage,
  })),
);
const ManagerImportPage = lazy(() =>
  import("@/pages/manager/ManagerImportPage").then((m) => ({
    default: m.ManagerImportPage,
  })),
);
const ProfilePage = lazy(() =>
  import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const OwnerOverviewPage = lazy(() =>
  import("@/pages/owner/OwnerOverviewPage").then((m) => ({ default: m.OwnerOverviewPage })),
);
const OwnerPropertiesPage = lazy(() =>
  import("@/pages/owner/OwnerPropertiesPage").then((m) => ({ default: m.OwnerPropertiesPage })),
);
const OwnerStatementsPage = lazy(() =>
  import("@/pages/owner/OwnerStatementsPage").then((m) => ({ default: m.OwnerStatementsPage })),
);
const OwnerMaintenancePage = lazy(() =>
  import("@/pages/owner/OwnerMaintenancePage").then((m) => ({ default: m.OwnerMaintenancePage })),
);
const OwnerPayoutsPage = lazy(() =>
  import("@/pages/owner/OwnerPayoutsPage").then((m) => ({ default: m.OwnerPayoutsPage })),
);
const OwnerChequesPage = lazy(() =>
  import("@/pages/owner/OwnerChequesPage").then((m) => ({ default: m.OwnerChequesPage })),
);
const OwnerEjariPage = lazy(() =>
  import("@/pages/owner/OwnerEjariPage").then((m) => ({ default: m.OwnerEjariPage })),
);
const TenantHomePage = lazy(() =>
  import("@/pages/tenant/TenantHomePage").then((m) => ({ default: m.TenantHomePage })),
);
const TenantInvoicesPage = lazy(() =>
  import("@/pages/tenant/TenantInvoicesPage").then((m) => ({ default: m.TenantInvoicesPage })),
);
const TenantChequesPage = lazy(() =>
  import("@/pages/tenant/TenantChequesPage").then((m) => ({ default: m.TenantChequesPage })),
);
const TenantMaintenancePage = lazy(() =>
  import("@/pages/tenant/TenantMaintenancePage").then((m) => ({ default: m.TenantMaintenancePage })),
);

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignUpPage /> },
  { path: "/accept-invite", element: <AcceptInvitePage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/terms", element: <TermsOfServicePage /> },
  { path: "/privacy", element: <PrivacyPolicyPage /> },

  {
    element: <ProtectedRoute allow={["manager"]} />,
    children: [
      {
        path: "/manager",
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <ManagerDashboardPage /> },
          { path: "properties", element: <ManagerPropertiesPage /> },
          { path: "properties/:propertyId", element: <ManagerPropertyDetailPage /> },
          { path: "vacancies", element: <ManagerVacanciesPage /> },
          { path: "leasing", element: <ManagerLeadsPage /> },
          { path: "owners", element: <ManagerOwnersPage /> },
          { path: "owners/:ownerId", element: <ManagerOwnerDetailPage /> },
          { path: "tenants", element: <ManagerTenantsPage /> },
          { path: "tenants/:tenantId", element: <ManagerTenantDetailPage /> },
          { path: "leases", element: <ManagerLeasesPage /> },
          { path: "leases/:leaseId", element: <ManagerLeaseDetailPage /> },
          { path: "renewals", element: <ManagerRenewalsPage /> },
          { path: "invoices", element: <ManagerInvoicesPage /> },
          { path: "invoices/:invoiceId", element: <ManagerInvoiceDetailPage /> },
          { path: "payouts", element: <ManagerPayoutsPage /> },
          { path: "maintenance", element: <ManagerMaintenancePage /> },
          { path: "vendors", element: <ManagerVendorsPage /> },
          { path: "vendors/:vendorId", element: <ManagerVendorDetailPage /> },
          { path: "analytics", element: <ManagerAnalyticsPage /> },
          { path: "rent-roll", element: <ManagerRentRollPage /> },
          { path: "cheques", element: <ManagerChequesPage /> },
          { path: "ejari", element: <ManagerEjariPage /> },
          { path: "import", element: <ManagerImportPage /> },
          { path: "settings", element: <ManagerOrgSettingsPage /> },
        ],
      },
    ],
  },

  {
    element: <ProtectedRoute allow={["owner"]} />,
    children: [
      {
        path: "/owner",
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <OwnerOverviewPage /> },
          { path: "properties", element: <OwnerPropertiesPage /> },
          { path: "statements", element: <OwnerStatementsPage /> },
          { path: "payouts", element: <OwnerPayoutsPage /> },
          { path: "cheques", element: <OwnerChequesPage /> },
          { path: "ejari", element: <OwnerEjariPage /> },
          { path: "maintenance", element: <OwnerMaintenancePage /> },
        ],
      },
    ],
  },

  {
    element: <ProtectedRoute allow={["tenant"]} />,
    children: [
      {
        path: "/tenant",
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <TenantHomePage /> },
          { path: "invoices", element: <TenantInvoicesPage /> },
          { path: "cheques", element: <TenantChequesPage /> },
          { path: "maintenance", element: <TenantMaintenancePage /> },
        ],
      },
    ],
  },

  {
    element: <ProtectedRoute allow={["manager", "owner", "tenant"]} />,
    children: [
      {
        path: "/profile",
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [{ index: true, element: <ProfilePage /> }],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});
