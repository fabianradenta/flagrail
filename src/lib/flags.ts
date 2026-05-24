import { db } from "@/lib/db";
import { FLAG_KEY_REGEX } from "@/lib/constants";
import { createAuditLog } from "@/lib/audit";

// ─── Create ──────────────────────────────────────────────────────────────────

interface CreateFlagParams {
  name: string;
  key: string;
  description?: string;
  projectId: string;
  userId: string;
}

export async function createFlag(params: CreateFlagParams) {
  const { name, key, description, projectId, userId } = params;

  if (!name.trim()) throw new Error("Flag name is required");

  if (!FLAG_KEY_REGEX.test(key)) {
    throw new Error(
      "Key must contain only lowercase letters, numbers, and underscores"
    );
  }

  const existing = await db.featureFlag.findUnique({
    where: { projectId_key: { projectId, key } },
  });
  if (existing) throw new Error("A flag with this key already exists in the project");

  // All environments for this project get a FlagEnvironment record
  const environments = await db.environment.findMany({
    where: { projectId },
    select: { id: true },
  });

  if (environments.length === 0) {
    throw new Error("Project has no environments");
  }

  const flag = await db.$transaction(async (tx) => {
    const created = await tx.featureFlag.create({
      data: {
        name: name.trim(),
        key,
        description: description?.trim() || null,
        projectId,
        environments: {
          createMany: {
            data: environments.map((env) => ({
              environmentId: env.id,
              enabled: false,
              rolloutPercentage: 100,
            })),
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: "flag.created",
        entityType: "flag",
        entityId: created.id,
        projectId,
        userId,
        payload: { name: created.name, key: created.key },
      },
    });

    return created;
  });

  return flag;
}

// ─── Update ───────────────────────────────────────────────────────────────────

interface UpdateFlagEnvironmentParams {
  flagEnvId: string;
  projectId: string;
  userId: string;
  enabled?: boolean;
  rolloutPercentage?: number;
}

export async function updateFlagEnvironment(params: UpdateFlagEnvironmentParams) {
  const { flagEnvId, projectId, userId, enabled, rolloutPercentage } = params;

  if (rolloutPercentage !== undefined) {
    if (
      !Number.isInteger(rolloutPercentage) ||
      rolloutPercentage < 0 ||
      rolloutPercentage > 100
    ) {
      throw new Error("Rollout percentage must be an integer between 0 and 100");
    }
  }

  // Verify this flagEnv belongs to the project (authorization check)
  const flagEnv = await db.flagEnvironment.findFirst({
    where: { id: flagEnvId, flag: { projectId } },
    include: {
      flag: { select: { key: true, name: true } },
      environment: { select: { slug: true, name: true } },
    },
  });
  if (!flagEnv) throw new Error("Flag environment not found");

  const updateData: { enabled?: boolean; rolloutPercentage?: number } = {};
  if (enabled !== undefined) updateData.enabled = enabled;
  if (rolloutPercentage !== undefined) updateData.rolloutPercentage = rolloutPercentage;

  // Determine audit action
  let action: string;
  if (enabled !== undefined && rolloutPercentage !== undefined) {
    action = "flag.updated";
  } else if (enabled !== undefined) {
    action = "flag.toggled";
  } else {
    action = "flag.rollout_changed";
  }

  await db.$transaction(async (tx) => {
    await tx.flagEnvironment.update({
      where: { id: flagEnvId },
      data: updateData,
    });

    await tx.auditLog.create({
      data: {
        action,
        entityType: "flag",
        entityId: flagEnv.flagId,
        projectId,
        userId,
        payload: {
          flagKey: flagEnv.flag.key,
          environment: flagEnv.environment.slug,
          ...(enabled !== undefined && { enabled }),
          ...(rolloutPercentage !== undefined && { rolloutPercentage }),
        },
      },
    });
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

interface DeleteFlagParams {
  flagId: string;
  projectId: string;
  userId: string;
}

export async function deleteFlag(params: DeleteFlagParams): Promise<void> {
  const { flagId, projectId, userId } = params;

  const flag = await db.featureFlag.findFirst({
    where: { id: flagId, projectId },
    select: { id: true, name: true, key: true },
  });
  if (!flag) throw new Error("Flag not found");

  // FlagEnvironment and TargetingRule rows cascade via the Prisma schema
  // (onDelete: Cascade), so a single delete tears the whole subtree down.
  await db.featureFlag.delete({ where: { id: flag.id } });

  await createAuditLog({
    action: "flag.deleted",
    entityType: "flag",
    entityId: flag.id,
    projectId,
    userId,
    payload: { name: flag.name, key: flag.key },
  });
}
