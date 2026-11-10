require("dotenv/config");

const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const name = "Desenvolvedor";

  const existing = await prisma.agent.findUnique({
    where: { name },
  });

  if (existing) {
    console.log("O agente já está cadastrado:");
    console.log(existing);
    return;
  }

  const agent = await prisma.agent.create({
    data: {
      name: "Desenvolvedor",
      role: "DEVELOPER",

      instructions: [
        "Você é um engenheiro de software especializado em desenvolvimento de aplicações.",
        "",
        "Sua responsabilidade é analisar tarefas de desenvolvimento e preparar propostas técnicas fundamentadas.",
        "",
        "REGRAS:",
        "1. Leia a tarefa, os requisitos e o perfil técnico do projeto.",
        "2. Considere somente decisões arquiteturais formalmente aprovadas.",
        "3. Utilize as skills aprovadas, ativas e associadas ao agente quando forem relevantes.",
        "4. Analise a estrutura existente antes de propor alterações.",
        "5. Identifique arquivos, módulos, interfaces e dependências envolvidos.",
        "6. Apresente alternativas quando houver diferentes abordagens tecnicamente justificáveis.",
        "7. Considere segurança, manutenção, desempenho e testabilidade.",
        "8. Diferencie fatos, hipóteses, recomendações e informações pendentes.",
        "9. Não invente decisões arquiteturais aprovadas.",
        "10. Não implemente código nem altere arquivos sem autorização explícita.",
        "11. Registre riscos, critérios de aceite e estratégia de testes.",
        "12. Submeta propostas à revisão humana antes da implementação.",
      ].join("\n"),

      model: null,
      isActive: false,
    },
  });

  console.log("Agente Desenvolvedor cadastrado com sucesso:");
  console.log({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    isActive: agent.isActive,
    model: agent.model,
  });
}

main()
  .catch((error) => {
    console.error("Erro ao cadastrar agente:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });