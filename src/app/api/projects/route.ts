import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { members: { some: { userId: session.userId } } },
    include: {
      environments: { orderBy: { createdAt: "asc" } },
      _count: { select: { flags: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : null;
  const key = typeof body.key === "string" && body.key.trim() ? body.key.trim() : slugify(name);

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  if (!/^[a-z0-9-]+$/.test(key)) {
    return NextResponse.json(
      { error: "Key must contain only lowercase letters, numbers, and hyphens" },
      { status: 400 }
    );
  }

  const existing = await db.project.findUnique({ where: { key } });
  if (existing) {
    return NextResponse.json({ error: "Project key already taken" }, { status: 409 });
  }

  // Create project, owner membership, environments, and audit log in one transaction
  const project = await db.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name,
        key,
        description: description || null,
        members: {
          create: { userId: session.userId, role: "owner" },
        },
        environments: {
          createMany: {
            data: [
              { name: "Development", slug: "development" },
              { name: "Staging", slug: "staging" },
              { name: "Production", slug: "production" },
            ],
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: "project.created",
        entityType: "project",
        entityId: created.id,
        projectId: created.id,
        userId: session.userId,
        payload: { name: created.name, key: created.key },
      },
    });

    return created;
  });

  return NextResponse.json(project, { status: 201 });
}
