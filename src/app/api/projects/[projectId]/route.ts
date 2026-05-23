import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await ctx.params;

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      members: { some: { userId: session.userId } },
    },
    include: {
      environments: { orderBy: { createdAt: "asc" } },
      flags: { orderBy: { createdAt: "desc" } },
      apiKeys: {
        select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}
