import { cn } from "@/lib/cn";
import aqarkeysLogo from "@/assets/aqarkeys-logo.svg";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  /**
   * Workspace name to show instead of the product wordmark, once the
   * signed-in user's organization is known (e.g. inside the app shell).
   * The icon always stays the static product mark.
   */
  orgName?: string | null;
  /**
   * Small line shown under the name (e.g. the Organization ID). Rendered
   * in the same flex row as the icon so the icon vertically centers
   * against the full two-line stack, not just the name.
   */
  subtitle?: string | null;
}

export function Logo({ className, showWordmark = true, orgName, subtitle }: LogoProps) {
  // No organization context (marketing/auth pages): the Aqarkeys logotype
  // stands alone, the same way the brand provides it.
  if (showWordmark && !orgName) {
    return (
      <div className={cn("flex min-w-0 items-center", className)}>
        <img src={aqarkeysLogo} alt="Aqarkeys" className="h-7 w-auto shrink-0" />
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500 shadow-brand-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" aria-hidden>
          <path
            d="M5 20V9l7-5 7 5v11h-5v-5h-4v5z"
            fill="currentColor"
            fillOpacity="0.95"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold leading-tight tracking-tight text-slate-900">
            {orgName}
          </span>
          {subtitle && (
            <span className="truncate font-mono text-[11px] leading-tight text-slate-400">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
