import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ projectId: string; apiKeyId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, apiKeyId } = await ctx.params;

  const membership = await db.projectMember.findUnique({
    where: { userId_projectId: { userId: session.userId, projectId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const apiKey = await db.apiKey.findFirst({
    where: { id: apiKeyId, projectId },
  });
  if (!apiKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  await db.apiKey.delete({ where: { id: apiKeyId } });

  await createAuditLog({
    action: "api_key.deleted",
    entityType: "api_key",
    entityId: apiKeyId,
    projectId,
    userId: session.userId,
    payload: { name: apiKey.name },
  });

  return NextResponse.json({ success: true });
}
