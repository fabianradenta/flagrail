import { createHash } from "crypto";
import type { TargetingRule } from "@prisma/client";

export interface UserContext {
  id: string;
  email?: string;
  role?: string;
  [key: string]: string | undefined;
}

export type EvaluationReason =
  | "flag_disabled"                 // master switch is off
  | "excluded_by_targeting_rules"   // rules exist but user matches none
  | "excluded_by_rollout"           // user is in the audience but outside the rollout bucket
  | "enabled_by_rollout"            // audience matched and bucket fell within rollout < 100
  | "enabled_for_targeted_user"     // rules matched and rollout is 100% (everyone in audience)
  | "enabled_for_all_users"         // no rules and rollout is 100% (every user)
  | "flag_not_found"                // flag key doesn't exist in the project
  | "environment_not_found";        // environment slug doesn't exist in the project

export type AudienceMode = "everyone" | "roles";

export interface EvaluationDetails {
  audienceMode: AudienceMode;
  audienceMatched: boolean;
  matchedRules: TargetingRule[];
  rolloutPercentage: number;
  userBucket: number;
  isInRollout: boolean;
}

export interface EvaluationResult {
  enabled: boolean;
  reason: EvaluationReason;
  details?: EvaluationDetails;
}

/**
 * Deterministic bucketing: SHA-256(flagKey + ":" + userId) % 100.
 *
 * Using the first 8 hex chars (32 bits) gives plenty of precision while
 * keeping the modulo fast. Same user + flagKey always produce the same
 * bucket, so rollout is stable across requests and deployments.
 */
export function getBucket(flagKey: string, userId: string): number {
  const hex = createHash("sha256")
    .update(`${flagKey}:${userId}`)
    .digest("hex");
  return parseInt(hex.slice(0, 8), 16) % 100;
}

function matchesRule(rule: TargetingRule, user: UserContext): boolean {
  const userValue = user[rule.attribute];
  if (userValue === undefined) return false;
  switch (rule.operator) {
    case "equals":
      return userValue === rule.value;
    case "not_equals":
      return userValue !== rule.value;
    case "contains":
      return userValue.includes(rule.value);
    default:
      return false;
  }
}

/**
 * Pure evaluation function — no I/O.
 *
 * Evaluation model (audience → rollout):
 *   1. Master switch off                       → flag_disabled
 *   2. Targeting rules define the eligible audience.
 *      If rules exist and none match the user  → excluded_by_targeting_rules
 *      If no rules exist                       → all users are eligible
 *   3. Rollout percentage applies to the eligible audience.
 *      bucket >= rolloutPercentage             → excluded_by_rollout
 *      bucket <  rolloutPercentage             → enabled_by_rollout
 *                                                (or enabled_for_targeted_user /
 *                                                 enabled_for_all_users at 100%)
 */
export function evaluateFlag(params: {
  flagKey: string;
  enabled: boolean;
  rolloutPercentage: number;
  rules: TargetingRule[];
  user: UserContext;
}): EvaluationResult {
  const { flagKey, enabled, rolloutPercentage, rules, user } = params;
  const userBucket = getBucket(flagKey, user.id);

  const audienceMode: AudienceMode = rules.length > 0 ? "roles" : "everyone";

  if (!enabled) {
    return {
      enabled: false,
      reason: "flag_disabled",
      details: {
        audienceMode,
        audienceMatched: false,
        matchedRules: [],
        rolloutPercentage,
        userBucket,
        isInRollout: false,
      },
    };
  }

  const hasRules = rules.length > 0;
  const matchedRules = rules.filter((r) => matchesRule(r, user));
  const audienceMatched = hasRules ? matchedRules.length > 0 : true;
  const isInRollout = userBucket < rolloutPercentage;

  const details: EvaluationDetails = {
    audienceMode,
    audienceMatched,
    matchedRules,
    rolloutPercentage,
    userBucket,
    isInRollout,
  };

  if (hasRules && !audienceMatched) {
    return { enabled: false, reason: "excluded_by_targeting_rules", details };
  }

  if (!isInRollout) {
    return { enabled: false, reason: "excluded_by_rollout", details };
  }

  if (rolloutPercentage === 100) {
    return {
      enabled: true,
      reason: hasRules ? "enabled_for_targeted_user" : "enabled_for_all_users",
      details,
    };
  }
  return { enabled: true, reason: "enabled_by_rollout", details };
}
