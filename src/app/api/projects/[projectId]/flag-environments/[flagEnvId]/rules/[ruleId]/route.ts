import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ projectId: string; flagEnvId: string; ruleId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, ruleId } = await ctx.params;

  const membership = await db.projectMember.findUnique({
    where: { userId_projectId: { userId: session.userId, projectId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Verify the rule belongs to a flag in this project
  const rule = await db.targetingRule.findFirst({
    where: {
      id: ruleId,
      flagEnvironment: { flag: { projectId } },
    },
    include: {
      flagEnvironment: {
        include: {
          flag: { select: { key: true } },
          environment: { select: { slug: true } },
        },
      },
    },
  });
  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  await db.targetingRule.delete({ where: { id: ruleId } });

  await createAuditLog({
    action: "rule.deleted",
    entityType: "rule",
    entityId: rule.id,
    projectId,
    userId: session.userId,
    payload: {
      flagKey: rule.flagEnvironment.flag.key,
      environment: rule.flagEnvironment.environment.slug,
      attribute: rule.attribute,
      operator: rule.operator,
      value: rule.value,
    },
  });

  return NextResponse.json({ success: true });
}
