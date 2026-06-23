import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="glass-card grid place-items-center px-6 py-12 text-center">
      <div className="max-w-sm">
        <h3 className="text-base font-semibold text-slate-900">We could not load this</h3>
        <p className="mt-2 text-sm text-slate-600">
          {message ?? "Something went wrong. Try again in a moment."}
        </p>
        {onRetry && (
          <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
