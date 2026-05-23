import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

const VALID_ATTRIBUTES = ["role", "email"] as const;
const VALID_OPERATORS = ["equals", "not_equals", "contains"] as const;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string; flagEnvId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, flagEnvId } = await ctx.params;

  const membership = await db.projectMember.findUnique({
    where: { userId_projectId: { userId: session.userId, projectId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Verify flagEnv belongs to this project
  const flagEnv = await db.flagEnvironment.findFirst({
    where: { id: flagEnvId, flag: { projectId } },
    include: {
      flag: { select: { key: true } },
      environment: { select: { slug: true } },
    },
  });
  if (!flagEnv) {
    return NextResponse.json({ error: "Flag environment not found" }, { status: 404 });
  }

  const body = await req.json();
  const { attribute, operator, value } = body;

  if (!VALID_ATTRIBUTES.includes(attribute)) {
    return NextResponse.json(
      { error: `attribute must be one of: ${VALID_ATTRIBUTES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!VALID_OPERATORS.includes(operator)) {
    return NextResponse.json(
      { error: `operator must be one of: ${VALID_OPERATORS.join(", ")}` },
      { status: 400 }
    );
  }
  if (typeof value !== "string" || !value.trim()) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }

  const rule = await db.targetingRule.create({
    data: { attribute, operator, value: value.trim(), flagEnvironmentId: flagEnvId },
  });

  await createAuditLog({
    action: "rule.created",
    entityType: "rule",
    entityId: rule.id,
    projectId,
    userId: session.userId,
    payload: {
      flagKey: flagEnv.flag.key,
      environment: flagEnv.environment.slug,
      attribute: rule.attribute,
      operator: rule.operator,
      value: rule.value,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
