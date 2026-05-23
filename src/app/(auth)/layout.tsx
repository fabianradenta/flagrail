import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50/20 via-slate-50 to-slate-50 px-4 py-12 relative">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-indigo-100/20 via-indigo-50/10 to-transparent pointer-events-none" />

      <div className="relative mb-8 flex flex-col items-center text-center">
        <Logo variant="iconOnly" size="lg" className="mb-3" />
        <h1 className="text-base font-semibold text-slate-950">Flagrail</h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 max-w-xs">
          Control feature releases with flags, rollout rules, and audit logs.
        </p>
      </div>

      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}
