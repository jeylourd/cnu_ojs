import { hash } from "bcryptjs";

import { prisma } from "../lib/prisma";

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@cnu.edu").toLowerCase();
  const name = process.env.SEED_ADMIN_NAME ?? "CNU Admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

  const passwordHash = await hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: "ADMIN",
      passwordHash,
    },
    create: {
      email,
      name,
      role: "ADMIN",
      passwordHash,
    },
  });

  console.log(`Seeded admin user: ${email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
