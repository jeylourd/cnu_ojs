import "dotenv/config";
import { defineConfig } from "prisma/config";

const prismaDatabaseUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: prismaDatabaseUrl,
  },
});
