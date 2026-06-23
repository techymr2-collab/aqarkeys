import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// Lightweight inline stroke icons (24x24, currentColor). No icon dependency.
function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Base>
  );
}

export function FunnelIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z" />
    </Base>
  );
}

export function ToolboxIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" />
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 12h18" />
      <path d="M9 12v2h6v-2" />
    </Base>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 21h16" />
      <path d="M6 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16" />
      <path d="M14 10h4a1 1 0 0 1 1 1v10" />
      <path d="M9 8h2M9 12h2M9 16h2" />
    </Base>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 0 1 10 0v1" />
      <path d="M16 5.5a3 3 0 0 1 0 5" />
      <path d="M21 20v-1a4.5 4.5 0 0 0-3-4.2" />
    </Base>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20v-1a7 7 0 0 1 14 0v1" />
    </Base>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M14 3v5h5" />
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8z" />
      <path d="M9 13h6M9 17h4" />
    </Base>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 3v18l2-1.2L10 21l2-1.2L14 21l2-1.2L18 21V3l-2 1.2L14 3l-2 1.2L10 3 8 4.2z" />
      <path d="M9 8h6M9 12h6" />
    </Base>
  );
}

export function BanknoteIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v5M18 9.5v5" />
    </Base>
  );
}

export function WrenchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15.5 7.5a3.5 3.5 0 0 1-4.6 4.6l-5.1 5.1a1.6 1.6 0 0 0 2.3 2.3l5.1-5.1a3.5 3.5 0 0 1 4.6-4.6l-2.3 2.3-2-2z" />
    </Base>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" />
    </Base>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 4v16h16" />
      <path d="M8 16v-4M12 16V9M16 16v-6" />
    </Base>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </Base>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Base>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </Base>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </Base>
  );
}

export function RefreshCwIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </Base>
  );
}

export function XCircleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </Base>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polyline points="20 6 9 17 4 12" />
    </Base>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </Base>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Base>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </Base>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Base>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Base>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Base>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Base>
  );
}

export function PrinterIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5" />
      <rect x="3" y="9" width="18" height="10" rx="2" />
      <path d="M6 14h12M6 18h8" />
    </Base>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="m21 2-9.6 9.6M15.4 6.6l2 2" />
    </Base>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m15 18-6-6 6-6" />
    </Base>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m9 18 6-6-6-6" />
    </Base>
  );
}

export function ChequeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M6 11h4M6 15h2" />
      <path d="M14 11h4M14 15h3" />
    </Base>
  );
}

export function PercentIcon(props: IconProps) {
  return (
    <Base {...props}>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </Base>
  );
}

export function ClipboardCheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </Base>
  );
}
