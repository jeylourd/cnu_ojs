const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const journal = await prisma.journal.findFirst({
    where: { slug: "college-of-test-journal" },
    include: {
      issues: {
        where: { publishedAt: { not: null } },
        select: {
          id: true,
          volume: true,
          issueNumber: true,
          year: true,
          title: true,
          featuredImageUrl: true,
          publishedAt: true,
        },
        orderBy: [
          { publishedAt: "desc" },
          { year: "desc" },
          { volume: "desc" },
          { issueNumber: "desc" },
        ],
      },
    },
  });

  console.log(JSON.stringify(journal?.issues ?? [], null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
