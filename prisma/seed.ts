import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("demo123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@family.fin" },
    update: {},
    create: {
      email: "demo@family.fin",
      password,
      role: "user",
    },
  });

  let cashCategory = await prisma.category.findFirst({
    where: { name: "Готівка", isShared: true },
  });
  if (!cashCategory) {
    cashCategory = await prisma.category.create({
      data: { name: "Готівка", userId: null, isShared: true },
    });
  }

  console.log("Seed OK:", { user: user.email, cashCategory: cashCategory.name });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
