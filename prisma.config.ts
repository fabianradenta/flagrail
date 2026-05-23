import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // datasource.url is used by Prisma Migrate (prisma migrate dev, prisma db push, etc.)
  // The PrismaClient uses the adapter in src/lib/db.ts for runtime queries.
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
