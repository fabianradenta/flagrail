import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { deleteFlag } from "@/lib/flags";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ projectId: string; flagId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, flagId } = await ctx.params;

  const membership = await db.projectMember.findUnique({
    where: { userId_projectId: { userId: session.userId, projectId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    await deleteFlag({ flagId, projectId, userId: session.userId });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete flag";
    const status = message === "Flag not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
