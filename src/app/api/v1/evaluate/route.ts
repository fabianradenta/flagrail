import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashApiKey } from "@/lib/api-key";
import { evaluateFlagForProject } from "@/lib/evaluation-service";

export async function POST(req: NextRequest) {
  // ── API key auth ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const rawKey = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!rawKey) {
    return NextResponse.json(
      { error: "Missing or malformed Authorization header. Expected: Bearer <api-key>" },
      { status: 401 }
    );
  }

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash: hashApiKey(rawKey) },
    include: { project: { select: { key: true } } },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const { projectKey, environment, flagKey, user } = body as Record<string, unknown>;

  // Validate required string fields are non-empty
  const stringFields: [string, unknown][] = [
    ["projectKey", projectKey],
    ["environment", environment],
    ["flagKey", flagKey],
  ];
  for (const [name, val] of stringFields) {
    if (typeof val !== "string" || val.trim() === "") {
      return NextResponse.json(
        { error: `"${name}" must be a non-empty string` },
        { status: 400 }
      );
    }
  }

  // Validate user object
  if (typeof user !== "object" || user === null) {
    return NextResponse.json(
      { error: '"user" must be an object' },
      { status: 400 }
    );
  }
  const userId = (user as Record<string, unknown>).id;
  if (typeof userId !== "string" || userId.trim() === "") {
    return NextResponse.json(
      { error: '"user.id" must be a non-empty string' },
      { status: 400 }
    );
  }

  // Coerce user fields to strings; discard anything that isn't a string
  const userContext: { id: string; [key: string]: string } = { id: userId.trim() };
  for (const [k, v] of Object.entries(user as Record<string, unknown>)) {
    if (k !== "id" && typeof v === "string" && v.trim()) {
      userContext[k] = v.trim();
    }
  }

  // ── Project ownership check ───────────────────────────────────────────────
  // The API key must belong to the project being queried
  if (apiKey.project.key !== (projectKey as string).trim()) {
    return NextResponse.json(
      { error: "API key does not belong to this project" },
      { status: 403 }
    );
  }

  // ── Evaluate ──────────────────────────────────────────────────────────────
  const result = await evaluateFlagForProject({
    projectKey: (projectKey as string).trim(),
    environmentSlug: (environment as string).trim(),
    flagKey: (flagKey as string).trim(),
    user: userContext,
  });

  // Track usage without blocking the response
  db.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return NextResponse.json(result);
}
