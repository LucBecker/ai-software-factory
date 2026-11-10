require("dotenv/config");

const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const agents = await prisma.agent.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      skillAssignments: {
        select: {
          priority: true,
          isRequired: true,
          skill: {
            select: {
              name: true,
              version: true,
              isActive: true,
              reviewStatus: true,
            },
          },
        },
      },
    },
  });

  console.dir(agents, { depth: null });
}

main()
  .catch((error) => {
    console.error("Erro ao consultar agentes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });