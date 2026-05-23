import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  optional?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, optional, id, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
              {label}
            </label>
            {optional && (
              <span className="text-xs text-slate-500">Optional</span>
            )}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={[
            "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
              : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-600">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
