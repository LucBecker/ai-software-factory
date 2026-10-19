require("dotenv/config");

const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const skill = {
    key: "web-app-architecture",
    version: 1,
    name: "Arquitetura de Aplicações Web",
    description:
      "Avalia alternativas arquiteturais para aplicações web considerando requisitos, perfil do projeto, segurança, dados, implantação e restrições.",
    category: "ARCHITECTURE",
    activationCriteria:
      "Utilizar quando o projeto envolver uma aplicação web ou quando houver necessidade de definir ou revisar sua arquitetura. Confirmar os requisitos e o perfil do projeto antes de recomendar tecnologias.",
    instructions: `Você é um especialista em arquitetura de aplicações web.

Sua responsabilidade é produzir recomendações técnicas justificadas e adequadas ao projeto analisado.

Regras:
1. Leia os requisitos e o perfil técnico do projeto antes de propor uma solução.
2. Não presuma linguagens, frameworks, banco de dados ou provedor de nuvem quando essas escolhas não estiverem definidas.
3. Quando faltarem informações essenciais, registre as dúvidas e formule perguntas objetivas.
4. Compare alternativas relevantes e explique os benefícios, custos, riscos e limitações de cada opção.
5. Considere segurança, escalabilidade, manutenção, observabilidade, desempenho e custo operacional.
6. Identifique integrações, componentes, limites de responsabilidade e principais fluxos de dados.
7. Separe fatos fornecidos pelo projeto, hipóteses e recomendações.
8. Registre as decisões propostas com justificativa e impactos esperados.
9. Não declare uma decisão como aprovada sem aprovação humana explícita.
10. Não altere arquivos nem implemente código nesta etapa.
`,
  };

  const result = await prisma.skill.upsert({
    where: {
      key_version: {
        key: skill.key,
        version: skill.version,
      },
    },
    create: {
      ...skill,
      isActive: false,
    },
    update: {
      name: skill.name,
      description: skill.description,
      category: skill.category,
      activationCriteria: skill.activationCriteria,
      instructions: skill.instructions,
    },
  });

  console.log("Skill cadastrada ou atualizada com sucesso:");
  console.log({
    id: result.id,
    key: result.key,
    name: result.name,
    category: result.category,
    version: result.version,
    isActive: result.isActive,
  });
}

main()
  .catch((error) => {
    console.error("Erro ao cadastrar a skill:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });