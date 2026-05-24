import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { FlagsSection } from "@/components/FlagsSection";
import { ApiKeysSection } from "@/components/ApiKeysSection";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ProjectSettings } from "@/components/ProjectSettings";

const ENV_BADGE: Record<string, string> = {
  development: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  dev:         "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  staging:     "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  production:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  prod:        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-slate-50">
        <h2 className="text-sm font-semibold text-slate-950 tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      members: { some: { userId: session.userId } },
    },
    include: {
      environments: {
        orderBy: { createdAt: "asc" },
        include: {
          flags: {
            orderBy: { flag: { createdAt: "desc" } },
            include: {
              flag: {
                select: { id: true, name: true, key: true, description: true },
              },
              rules: { orderBy: { createdAt: "asc" } },
            },
          },
        },
      },
      apiKeys: {
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          createdAt: true,
          lastUsedAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  if (!project) notFound();

  const environmentsForSection = project.environments.map((env) => ({
    id: env.id,
    name: env.name,
    slug: env.slug,
    flagEnvironments: env.flags.map((fe) => ({
      id: fe.id,
      enabled: fe.enabled,
      rolloutPercentage: fe.rolloutPercentage,
      rules: fe.rules.map((r) => ({
        id: r.id,
        attribute: r.attribute,
        operator: r.operator,
        value: r.value,
      })),
      flag: fe.flag,
    })),
  }));

  const flagCount = project.environments[0]?.flags.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Projects
        </Link>
        <div className="mt-3">
          <h1 className="text-2xl font-bold text-slate-950 tracking-tight">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage flags, rollout rules, API access, and release activity.
          </p>
          {project.description && (
            <p className="mt-1 text-sm text-slate-500">{project.description}</p>
          )}
          <div className="mt-2 flex items-center flex-wrap gap-2">
            <code className="inline-block text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-2 py-1 font-mono">
              {project.key}
            </code>
            {project.environments.map((env) => (
              <span
                key={env.id}
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ENV_BADGE[env.slug] ?? "bg-slate-100 text-slate-600"}`}
              >
                {env.name}
              </span>
            ))}
          </div>
          {/* Compact stat row */}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
            <span><span className="font-semibold text-slate-800">{flagCount}</span> flag{flagCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <SectionCard
        title="Feature Flags"
        action={
          <Link
            href={`/projects/${project.id}/flags/new`}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            + New flag
          </Link>
        }
      >
        <FlagsSection
          projectId={project.id}
          environments={environmentsForSection}
        />
      </SectionCard>

      {/* API Keys */}
      <SectionCard title="API Keys">
        <ApiKeysSection projectId={project.id} apiKeys={project.apiKeys} />
      </SectionCard>

      {/* Audit Log */}
      <SectionCard title="Activity">
        <ActivityFeed
          logs={project.auditLogs.map((log) => ({
            id: log.id,
            action: log.action,
            createdAt: log.createdAt.toISOString(),
            user: log.user
              ? { name: log.user.name, email: log.user.email }
              : null,
          }))}
        />
      </SectionCard>

      {/* Danger zone */}
      <ProjectSettings
        projectId={project.id}
        projectName={project.name}
        projectKey={project.key}
      />
    </div>
  );
}
