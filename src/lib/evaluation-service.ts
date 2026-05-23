import { db } from "@/lib/db";
import { evaluateFlag } from "@/lib/evaluate";
import type { UserContext, EvaluationResult } from "@/lib/evaluate";

/**
 * Full evaluation pipeline: resolves project → environment → flag from the DB,
 * then delegates to the pure evaluateFlag() function.
 *
 * Keeps DB queries out of the pure evaluation logic so that logic stays testable.
 */
export async function evaluateFlagForProject(params: {
  projectKey: string;
  environmentSlug: string;
  flagKey: string;
  user: UserContext;
}): Promise<EvaluationResult> {
  const { projectKey, environmentSlug, flagKey, user } = params;

  // Check environment first so we can return a precise error reason
  const env = await db.environment.findFirst({
    where: {
      slug: environmentSlug,
      project: { key: projectKey },
    },
    select: { id: true },
  });
  if (!env) return { enabled: false, reason: "environment_not_found" };

  const flagEnv = await db.flagEnvironment.findFirst({
    where: {
      environmentId: env.id,
      flag: {
        key: flagKey,
        project: { key: projectKey },
      },
    },
    include: { rules: true },
  });
  if (!flagEnv) return { enabled: false, reason: "flag_not_found" };

  return evaluateFlag({
    flagKey,
    enabled: flagEnv.enabled,
    rolloutPercentage: flagEnv.rolloutPercentage,
    rules: flagEnv.rules,
    user,
  });
}
