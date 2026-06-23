import { useToasts, dismissToast, type ToastTone } from "@/lib/toast";
import { cn } from "@/lib/cn";

const toneStyles: Record<ToastTone, string> = {
  success: "border-emerald-600/20 bg-emerald-50 text-emerald-800",
  error: "border-rose-600/20 bg-rose-50 text-rose-800",
  info: "border-slate-900/10 bg-white text-slate-800",
};

export function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={cn(
            "animate-fade-in rounded-xl border px-4 py-3 text-left text-sm shadow-glass backdrop-blur-xl",
            toneStyles[t.tone],
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
