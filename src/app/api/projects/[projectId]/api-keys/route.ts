import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { generateApiKey } from "@/lib/api-key";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await ctx.params;

  const membership = await db.projectMember.findUnique({
    where: { userId_projectId: { userId: session.userId, projectId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "Default";

  const { raw, hash, prefix } = generateApiKey();

  const apiKey = await db.apiKey.create({
    data: { name, keyHash: hash, keyPrefix: prefix, projectId },
  });

  await createAuditLog({
    action: "api_key.created",
    entityType: "api_key",
    entityId: apiKey.id,
    projectId,
    userId: session.userId,
    payload: { name },
  });

  // Return the raw key once — it is never stored and cannot be recovered
  return NextResponse.json({ ...apiKey, rawKey: raw }, { status: 201 });
}
