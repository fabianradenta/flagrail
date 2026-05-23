import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createFlag } from "@/lib/flags";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await ctx.params;

  // Verify membership
  const membership = await db.projectMember.findUnique({
    where: { userId_projectId: { userId: session.userId, projectId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json();

  try {
    const flag = await createFlag({
      name: body.name ?? "",
      key: body.key ?? "",
      description: body.description,
      projectId,
      userId: session.userId,
    });
    return NextResponse.json(flag, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create flag";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
