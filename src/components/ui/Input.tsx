import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 rounded-xl border border-slate-900/10 bg-white px-3.5 text-sm text-slate-900",
            "placeholder:text-slate-500",
            "focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500/40",
            "transition-colors",
            error && "border-rose-500/60 focus:ring-rose-500/40",
            className,
          )}
          {...props}
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
