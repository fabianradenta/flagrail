type Variant = "default" | "success" | "warning" | "error" | "info" | "accent";

const VARIANTS: Record<Variant, string> = {
  default: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  error:   "bg-red-50 text-red-700 ring-1 ring-red-200",
  info:    "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  accent:  "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
};

interface BadgeProps {
  variant?: Variant;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const DOT_COLORS: Record<Variant, string> = {
  default: "bg-slate-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error:   "bg-red-500",
  info:    "bg-blue-500",
  accent:  "bg-indigo-500",
};

export function Badge({ variant = "default", dot, className, children }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT_COLORS[variant]}`} />
      )}
      {children}
    </span>
  );
}
