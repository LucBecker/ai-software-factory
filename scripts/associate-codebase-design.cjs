require("dotenv/config");

const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const agent = await prisma.agent.findUnique({
    where: {
      name: "Arquiteto de Software",
    },
  });

  if (!agent) {
    throw new Error("Agente Arquiteto de Software não encontrado.");
  }

  const skill = await prisma.skill.findUnique({
    where: {
      key_version: {
        key: "mattpocock-codebase-design",
        version: 1,
      },
    },
  });

  if (!skill) {
    throw new Error("Skill Codebase Design não encontrada.");
  }

  if (skill.reviewStatus !== "APPROVED" || !skill.approvedAt) {
    throw new Error("A skill precisa estar aprovada antes da associação.");
  }

  const association = await prisma.agentSkill.upsert({
    where: {
      agentId_skillId: {
        agentId: agent.id,
        skillId: skill.id,
      },
    },
    create: {
      agentId: agent.id,
      skillId: skill.id,
      priority: 20,
      isRequired: false,
    },
    update: {
      priority: 20,
      isRequired: false,
    },
  });

  console.log("Skill associada ao agente com sucesso:");

  console.log({
    agent: agent.name,
    agentActive: agent.isActive,
    skill: skill.name,
    skillVersion: skill.version,
    reviewStatus: skill.reviewStatus,
    skillActive: skill.isActive,
    priority: association.priority,
    isRequired: association.isRequired,
  });
}

main()
  .catch((error) => {
    console.error("Erro ao associar skill:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });