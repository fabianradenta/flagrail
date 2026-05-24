import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { relativeTime } from "@/lib/utils";
import Link from "next/link";

const ENV_BADGE: Record<string, string> = {
  development: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  dev:         "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  staging:     "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  production:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  prod:        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

export default async function DashboardPage() {
  const session = await getSession();

  const projects = await db.project.findMany({
    where: { members: { some: { userId: session!.userId } } },
    include: {
      environments: { orderBy: { createdAt: "asc" } },
      flags: {
        select: {
          id: true,
          environments: { select: { enabled: true } },
        },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      _count: { select: { flags: true, apiKeys: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-slate-600">
            Control feature releases across applications and environments.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          + New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
            <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-950 mb-1">No projects yet</p>
          <p className="text-sm text-slate-600 mb-6 max-w-xs mx-auto">
            Create a project to start managing feature flags across environments.
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch auto-rows-fr">
          {projects.map((project) => {
            const initial = project.name[0]?.toUpperCase() ?? "P";
            const flagCount = project._count.flags;
            const activeFlagCount = project.flags.filter((f) =>
              f.environments.some((fe) => fe.enabled)
            ).length;
            const apiKeyCount = project._count.apiKeys;
            const lastActivity = project.auditLogs[0]?.createdAt ?? null;
            return (
              <li key={project.id} className="h-full">
                <Link
                  href={`/projects/${project.id}`}
                  className="group h-full flex flex-col bg-white rounded-2xl border border-l-4 border-slate-200 border-l-indigo-500 p-5 shadow-sm hover:shadow-md hover:shadow-indigo-100/80 hover:border-indigo-200 transition-all"
                >
                  {/* Card header: avatar + name + flag count */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 font-bold text-sm">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {project.name}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="rounded-full bg-indigo-50 ring-1 ring-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600 tabular-nums">
                            {flagCount} flag{flagCount !== 1 ? "s" : ""}
                          </span>
                          <svg
                            className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-150"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      <p className="mt-0.5 text-xs font-mono text-slate-600 truncate">
                        {project.key}
                      </p>
                    </div>
                  </div>

                  {project.description && (
                    <p className="mb-3 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Compact metadata row */}
                  {(flagCount > 0 || apiKeyCount > 0) && (
                    <div className="mb-3 flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      {flagCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              activeFlagCount > 0 ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                          <span className="tabular-nums">
                            <span className="font-medium text-slate-700">{activeFlagCount}</span> active
                          </span>
                        </span>
                      )}
                      {apiKeyCount > 0 && (
                        <span className="tabular-nums">
                          <span className="font-medium text-slate-700">{apiKeyCount}</span> API key{apiKeyCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {lastActivity && (
                        <span
                          className="tabular-nums"
                          title={lastActivity.toLocaleString()}
                          suppressHydrationWarning
                        >
                          Updated {relativeTime(lastActivity)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Environment badges */}
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                    {project.environments.map((env) => (
                      <span
                        key={env.id}
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ENV_BADGE[env.slug] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {env.name}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
