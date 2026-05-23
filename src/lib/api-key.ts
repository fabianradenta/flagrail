import { createHash, randomBytes } from "crypto";

const PREFIX = "fr_live_";

/**
 * Generates a new API key. Returns both the raw key (shown once to the user)
 * and its SHA-256 hash (stored in the database).
 */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = PREFIX + randomBytes(24).toString("hex");
  const hash = hashApiKey(raw);
  // Store first 16 chars for display ("fr_live_" + 8 random hex) so keys are distinguishable
  const prefix = raw.slice(0, 16);
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
