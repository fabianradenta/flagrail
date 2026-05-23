"use server";

import { evaluateFlagForProject } from "@/lib/evaluation-service";
import type { EvaluationResult, UserContext } from "@/lib/evaluate";

export async function evaluateDemoFlag(input: {
  environmentSlug: string;
  user: { id: string; email?: string; role?: string };
}): Promise<EvaluationResult> {
  const user: UserContext = {
    id: input.user.id,
    ...(input.user.email ? { email: input.user.email } : {}),
    ...(input.user.role ? { role: input.user.role } : {}),
  };
  return evaluateFlagForProject({
    projectKey: "flagrail-demo",
    environmentSlug: input.environmentSlug,
    flagKey: "new_checkout_flow",
    user,
  });
}
