import { useMemo, useState } from "react";
import { BellIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { NotificationPanel } from "@/features/notifications/NotificationPanel";
import { getStoredReadIds, persistReadIds, type AppNotification } from "@/data/notifications";

interface Props {
  notifications: AppNotification[];
}

export function NotificationCenter({ notifications }: Props) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(getStoredReadIds);

  const unread = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds],
  );

  function handleOpen() {
    setOpen(true);
    // Mark all current notifications as read once the panel animates in
    const ids = notifications.map((n) => n.id);
    setTimeout(() => {
      setReadIds((prev) => {
        const next = new Set([...prev, ...ids]);
        persistReadIds(next);
        return next;
      });
    }, 400);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          "text-slate-500 hover:bg-slate-900/[0.04] hover:text-slate-900",
        )}
      >
        <BellIcon
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            unread > 0 ? "text-brand-500" : "text-slate-400",
          )}
        />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : String(unread)}
          </span>
        )}
      </button>

      <NotificationPanel
        open={open}
        notifications={notifications}
        readIds={readIds}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
