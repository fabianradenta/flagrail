import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateFlagEnvironment } from "@/lib/flags";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string; flagEnvId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, flagEnvId } = await ctx.params;

  // Verify membership
  const membership = await db.projectMember.findUnique({
    where: { userId_projectId: { userId: session.userId, projectId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json();
  const { enabled, rolloutPercentage } = body;

  if (enabled === undefined && rolloutPercentage === undefined) {
    return NextResponse.json(
      { error: "Provide at least one of: enabled, rolloutPercentage" },
      { status: 400 }
    );
  }

  try {
    await updateFlagEnvironment({
      flagEnvId,
      projectId,
      userId: session.userId,
      ...(enabled !== undefined && { enabled: Boolean(enabled) }),
      ...(rolloutPercentage !== undefined && {
        rolloutPercentage: Number(rolloutPercentage),
      }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
