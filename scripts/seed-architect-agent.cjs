require("dotenv/config");

const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const agent = await prisma.agent.upsert({
    where: {
      name: "Arquiteto de Software",
    },
    create: {
      name: "Arquiteto de Software",
      role: "ARCHITECTURE",
      instructions:
        "Avaliar requisitos, perfil do projeto e alternativas arquiteturais. " +
        "Documentar recomendações, riscos e decisões propostas. " +
        "Não implementar código nem aprovar decisões automaticamente.",
      model: null,
      isActive: false,
    },
    update: {
      role: "ARCHITECTURE",
      instructions:
        "Avaliar requisitos, perfil do projeto e alternativas arquiteturais. " +
        "Documentar recomendações, riscos e decisões propostas. " +
        "Não implementar código nem aprovar decisões automaticamente.",
      model: null,
      isActive: false,
    },
  });

  const skill = await prisma.skill.findUnique({
    where: {
      key_version: {
        key: "web-app-architecture",
        version: 1,
      },
    },
  });

  if (!skill) {
    throw new Error(
      "A skill web-app-architecture versão 1 não foi encontrada.",
    );
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
      priority: 10,
      isRequired: false,
    },
    update: {
      priority: 10,
      isRequired: false,
    },
  });

  console.log("Agente e associação configurados com sucesso:");
  console.log({
    agentName: agent.name,
    agentRole: agent.role,
    agentActive: agent.isActive,
    skillName: skill.name,
    skillVersion: skill.version,
    skillActive: skill.isActive,
    priority: association.priority,
    isRequired: association.isRequired,
  });
}

main()
  .catch((error) => {
    console.error("Erro ao configurar agente e skill:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });