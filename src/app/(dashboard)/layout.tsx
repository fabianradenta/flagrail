import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { Logo } from "@/components/Logo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-slate-50/80 to-slate-50">
      {/* Subtle top glow accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-gradient-to-b from-indigo-50/30 via-indigo-50/10 to-transparent pointer-events-none" />
      
      <header className="relative bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link
              href="/dashboard"
              aria-label="Flagrail home"
              className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Logo variant="full" size="sm" />
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden sm:block truncate max-w-50 text-slate-600">
                {session.email}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="relative flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
