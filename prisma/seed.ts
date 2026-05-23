import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { generateApiKey } from "../src/lib/api-key";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  // ── Demo user ──────────────────────────────────────────────────
  const password = await hash("password123", 12);
  const user = await db.user.upsert({
    where: { email: "demo@flagrail.dev" },
    update: {},
    create: { email: "demo@flagrail.dev", name: "Demo User", password },
  });
  console.log(`✓ Demo user: ${user.email} (password: password123)`);

  // ── Demo project ───────────────────────────────────────────────
  const project = await db.project.upsert({
    where: { key: "flagrail-demo" },
    update: {},
    create: {
      name: "Flagrail Demo Shop",
      key: "flagrail-demo",
      description: "Demo project — new_checkout_flow flag experiment",
    },
  });

  await db.projectMember.upsert({
    where: { userId_projectId: { userId: user.id, projectId: project.id } },
    update: {},
    create: { userId: user.id, projectId: project.id, role: "owner" },
  });
  console.log(`✓ Demo project: flagrail-demo`);

  // ── Environments ───────────────────────────────────────────────
  const envDefs = [
    { name: "Development", slug: "development" },
    { name: "Staging", slug: "staging" },
    { name: "Production", slug: "production" },
  ];

  const envMap: Record<string, { id: string }> = {};
  for (const def of envDefs) {
    const env = await db.environment.upsert({
      where: { projectId_slug: { projectId: project.id, slug: def.slug } },
      update: {},
      create: { ...def, projectId: project.id },
    });
    envMap[def.slug] = env;
  }
  console.log(`✓ Environments: development, staging, production`);

  // ── Feature flag ───────────────────────────────────────────────
  const flag = await db.featureFlag.upsert({
    where: { projectId_key: { projectId: project.id, key: "new_checkout_flow" } },
    update: {},
    create: {
      name: "New Checkout Flow",
      key: "new_checkout_flow",
      description: "Replaces the 4-step checkout with a streamlined single-page experience",
      projectId: project.id,
    },
  });

  // ── Flag environments ──────────────────────────────────────────
  // prod: enabled, rollout=100% — every user in the matched audience gets it
  // dev/staging: disabled
  for (const def of envDefs) {
    const isProd = def.slug === "production";
    await db.flagEnvironment.upsert({
      where: { flagId_environmentId: { flagId: flag.id, environmentId: envMap[def.slug].id } },
      update: {
        enabled: isProd,
        rolloutPercentage: isProd ? 100 : 0,
      },
      create: {
        flagId: flag.id,
        environmentId: envMap[def.slug].id,
        enabled: isProd,
        rolloutPercentage: isProd ? 100 : 0,
      },
    });
  }

  // ── Targeting rules for prod (delete + recreate = idempotent) ─
  const prodFlagEnv = await db.flagEnvironment.findUniqueOrThrow({
    where: {
      flagId_environmentId: { flagId: flag.id, environmentId: envMap["production"].id },
    },
  });
  await db.targetingRule.deleteMany({ where: { flagEnvironmentId: prodFlagEnv.id } });
  await db.targetingRule.createMany({
    data: [
      { attribute: "role", operator: "equals", value: "beta_tester", flagEnvironmentId: prodFlagEnv.id },
      { attribute: "role", operator: "equals", value: "admin", flagEnvironmentId: prodFlagEnv.id },
    ],
  });
  console.log(`✓ Flag: new_checkout_flow (enabled in prod, rollout=100%, rules: beta_tester + admin)`);

  // ── Demo API key ───────────────────────────────────────────────
  // Raw keys are never stored — only the SHA-256 hash. If a seeded key
  // already exists we cannot recover its raw value, so we print a note
  // and leave it in place. To rotate, revoke it in the dashboard first.
  const DEMO_KEY_NAME = "Demo API key (seeded)";
  const existingDemoKey = await db.apiKey.findFirst({
    where: { projectId: project.id, name: DEMO_KEY_NAME },
  });
  if (existingDemoKey) {
    console.log(
      `✓ Demo API key already exists (prefix: ${existingDemoKey.keyPrefix}…) — raw key is not recoverable.`
    );
    console.log(
      `  Revoke it in the dashboard's API Keys section and re-run \`npm run db:seed\` to mint a new one.`
    );
  } else {
    const { raw, hash: keyHash, prefix } = generateApiKey();
    await db.apiKey.create({
      data: {
        name: DEMO_KEY_NAME,
        keyHash,
        keyPrefix: prefix,
        projectId: project.id,
      },
    });
    console.log(`✓ Demo API key minted (shown once — copy it now):`);
    console.log(`\n  ${raw}\n`);
  }

  console.log(`Demo ready at http://localhost:3000/demo-shop`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
