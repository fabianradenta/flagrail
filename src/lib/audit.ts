import { db } from "@/lib/db";

type AuditAction =
  | "project.created"
  | "environment.created"
  | "flag.created"
  | "flag.updated"
  | "flag.toggled"
  | "flag.rollout_changed"
  | "rule.created"
  | "rule.deleted"
  | "api_key.created"
  | "api_key.deleted";

type EntityType = "project" | "environment" | "flag" | "rule" | "api_key";

interface AuditParams {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  projectId: string;
  userId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  await db.auditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      projectId: params.projectId,
      userId: params.userId ?? null,
      payload: params.payload ?? undefined,
    },
  });
}
