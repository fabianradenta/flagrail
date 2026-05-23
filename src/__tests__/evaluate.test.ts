import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { getBucket, evaluateFlag } from "@/lib/evaluate";
import type { TargetingRule } from "@prisma/client";

// Minimal TargetingRule stub — only fields evaluateFlag uses
function rule(
  attribute: string,
  operator: string,
  value: string
): TargetingRule {
  return {
    id: "r1",
    attribute,
    operator,
    value,
    flagEnvironmentId: "fe1",
    createdAt: new Date(),
  };
}

// ─── getBucket ──────────────────────────────────────────────────────────────

describe("getBucket", () => {
  it("returns a value in the range 0–99", () => {
    for (const userId of ["u1", "u2", "u3", "user_999", "alice@example.com"]) {
      const b = getBucket("my_flag", userId);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(100);
    }
  });

  it("is deterministic — same inputs always produce the same bucket", () => {
    const a = getBucket("checkout_v2", "user_42");
    const b = getBucket("checkout_v2", "user_42");
    expect(a).toBe(b);
  });

  it("produces different buckets for different users", () => {
    const buckets = new Set(
      ["u1", "u2", "u3", "u4", "u5"].map((id) => getBucket("flag", id))
    );
    expect(buckets.size).toBeGreaterThan(1);
  });

  it("produces different buckets for different flag keys (same user)", () => {
    const b1 = getBucket("flag_a", "user_1");
    const b2 = getBucket("flag_b", "user_1");
    expect(b1).not.toBe(b2);
  });

  it("has known stable values (regression guard)", () => {
    expect(getBucket("new_checkout_flow", "user_123")).toBe(
      computeExpectedBucket("new_checkout_flow", "user_123")
    );
    expect(getBucket("dark_mode", "alice")).toBe(
      computeExpectedBucket("dark_mode", "alice")
    );
  });
});

function computeExpectedBucket(flagKey: string, userId: string): number {
  const hex = createHash("sha256").update(`${flagKey}:${userId}`).digest("hex");
  return parseInt(hex.slice(0, 8), 16) % 100;
}

// ─── evaluateFlag ────────────────────────────────────────────────────────────

describe("evaluateFlag", () => {
  const betaUser = { id: "user_1", role: "beta_tester", email: "u@example.com" };
  const noRules: TargetingRule[] = [];

  it("returns flag_disabled when the flag is off", () => {
    const result = evaluateFlag({
      flagKey: "my_flag",
      enabled: false,
      rolloutPercentage: 100,
      rules: noRules,
      user: betaUser,
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("flag_disabled");
  });

  it("returns excluded_by_targeting_rules when rules exist and none match", () => {
    const result = evaluateFlag({
      flagKey: "my_flag",
      enabled: true,
      rolloutPercentage: 100,
      rules: [rule("role", "equals", "admin")],
      user: { id: "u1", role: "regular_user" },
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("excluded_by_targeting_rules");
    expect(result.details?.audienceMatched).toBe(false);
    expect(result.details?.matchedRules).toHaveLength(0);
  });

  it("returns enabled_for_targeted_user when rule matches and rollout is 100%", () => {
    const result = evaluateFlag({
      flagKey: "my_flag",
      enabled: true,
      rolloutPercentage: 100,
      rules: [rule("role", "equals", "beta_tester")],
      user: betaUser,
    });
    expect(result.enabled).toBe(true);
    expect(result.reason).toBe("enabled_for_targeted_user");
    expect(result.details?.audienceMatched).toBe(true);
    expect(result.details?.matchedRules).toHaveLength(1);
  });

  it("returns enabled_for_all_users when no rules and rollout is 100%", () => {
    const result = evaluateFlag({
      flagKey: "my_flag",
      enabled: true,
      rolloutPercentage: 100,
      rules: noRules,
      user: { id: "anyone" },
    });
    expect(result.enabled).toBe(true);
    expect(result.reason).toBe("enabled_for_all_users");
    expect(result.details?.audienceMatched).toBe(true);
  });

  it("excludes audience-matched users when bucket is outside rollout", () => {
    // Rule matches, but rollout=0 means no one in the audience gets it
    const result = evaluateFlag({
      flagKey: "my_flag",
      enabled: true,
      rolloutPercentage: 0,
      rules: [rule("role", "equals", "beta_tester")],
      user: betaUser,
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("excluded_by_rollout");
    expect(result.details?.audienceMatched).toBe(true);
    expect(result.details?.isInRollout).toBe(false);
  });

  it("includes audience-matched users when bucket is inside partial rollout", () => {
    // Find a user that falls inside 50% rollout
    const flagKey = "partial_audience";
    let includedUserId = "";
    for (let i = 0; i < 200; i++) {
      const id = `user_${i}`;
      if (getBucket(flagKey, id) < 50) {
        includedUserId = id;
        break;
      }
    }
    expect(includedUserId).not.toBe("");

    const result = evaluateFlag({
      flagKey,
      enabled: true,
      rolloutPercentage: 50,
      rules: [rule("role", "equals", "beta_tester")],
      user: { id: includedUserId, role: "beta_tester" },
    });
    expect(result.enabled).toBe(true);
    expect(result.reason).toBe("enabled_by_rollout");
    expect(result.details?.audienceMatched).toBe(true);
    expect(result.details?.isInRollout).toBe(true);
  });

  it("returns excluded_by_rollout when no rules and user is outside rollout", () => {
    const flagKey = "low_rollout_flag";
    let excludedUserId = "";
    for (let i = 0; i < 200; i++) {
      const id = `user_${i}`;
      if (getBucket(flagKey, id) >= 10) {
        excludedUserId = id;
        break;
      }
    }
    expect(excludedUserId).not.toBe("");

    const result = evaluateFlag({
      flagKey,
      enabled: true,
      rolloutPercentage: 10,
      rules: noRules,
      user: { id: excludedUserId },
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("excluded_by_rollout");
    expect(result.details?.audienceMatched).toBe(true);
  });

  it("returns enabled_by_rollout for no-rules + partial rollout when bucket fits", () => {
    const flagKey = "half_rollout_flag";
    let includedUserId = "";
    for (let i = 0; i < 200; i++) {
      const id = `user_${i}`;
      if (getBucket(flagKey, id) < 50) {
        includedUserId = id;
        break;
      }
    }
    expect(includedUserId).not.toBe("");

    const result = evaluateFlag({
      flagKey,
      enabled: true,
      rolloutPercentage: 50,
      rules: noRules,
      user: { id: includedUserId },
    });
    expect(result.enabled).toBe(true);
    expect(result.reason).toBe("enabled_by_rollout");
  });

  it("0% rollout excludes every user (when no rules)", () => {
    for (const id of ["u1", "u2", "u3", "u4", "u5"]) {
      const result = evaluateFlag({
        flagKey: "zero_flag",
        enabled: true,
        rolloutPercentage: 0,
        rules: noRules,
        user: { id },
      });
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe("excluded_by_rollout");
    }
  });

  it("supports 'contains' operator for targeting rules", () => {
    const result = evaluateFlag({
      flagKey: "flag",
      enabled: true,
      rolloutPercentage: 100,
      rules: [rule("email", "contains", "@acme.com")],
      user: { id: "u1", email: "alice@acme.com" },
    });
    expect(result.enabled).toBe(true);
    expect(result.reason).toBe("enabled_for_targeted_user");
  });

  it("does not match when user attribute is missing", () => {
    const result = evaluateFlag({
      flagKey: "flag",
      enabled: true,
      rolloutPercentage: 100,
      rules: [rule("role", "equals", "admin")],
      user: { id: "u1" }, // no role attribute
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("excluded_by_targeting_rules");
  });

  it("details always include the computed bucket and rollout%", () => {
    const result = evaluateFlag({
      flagKey: "details_flag",
      enabled: true,
      rolloutPercentage: 42,
      rules: noRules,
      user: { id: "user_x" },
    });
    expect(result.details).toBeDefined();
    expect(result.details?.rolloutPercentage).toBe(42);
    expect(result.details?.userBucket).toBe(getBucket("details_flag", "user_x"));
  });
});

// ─── Rollout distribution sanity check ───────────────────────────────────────

describe("rollout distribution", () => {
  it("50% rollout includes roughly half of a large user sample", () => {
    const flagKey = "distribution_test";
    const total = 1000;
    const included = Array.from({ length: total }, (_, i) =>
      getBucket(flagKey, `user_${i}`)
    ).filter((b) => b < 50).length;

    expect(included).toBeGreaterThan(450);
    expect(included).toBeLessThan(550);
  });
});
