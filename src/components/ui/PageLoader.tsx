export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent"
          aria-hidden
        />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center">
      <PageLoader label={label} />
    </div>
  );
}
