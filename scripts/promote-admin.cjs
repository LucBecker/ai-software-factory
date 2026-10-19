require("dotenv/config");

const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();

  if (!email) {
    throw new Error(
      'Informe o e-mail da sua conta: node scripts/promote-admin.cjs "seu-email"',
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(
      "Conta não encontrada. Confira o e-mail usado no login.",
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { accessLevel: "ADMIN" },
    select: {
      id: true,
      name: true,
      accessLevel: true,
      emailVerified: true,
    },
  });

  console.log("Nível de acesso atualizado com sucesso:");
  console.log(updatedUser);
}

main()
  .catch((error) => {
    console.error("Erro ao atualizar o nível de acesso:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });