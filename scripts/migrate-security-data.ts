/**
 * Одноразова міграція після оновлення безпеки:
 * — createdBy для категорій з userId
 * — isSystem для службових назв «Готівка» / «Цілі»
 * — повторний запис полів щоб застосувати AES для існуючих даних
 *
 * Запуск: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-security-data.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const cats = await prisma.category.findMany({
    where: { userId: { not: null }, createdBy: null },
  });
  for (const c of cats) {
    if (!c.userId) continue;
    await prisma.category.update({
      where: { id: c.id },
      data: { createdBy: c.userId },
    });
  }

  const allCats = await prisma.category.findMany();
  for (const c of allCats) {
    const plain = c.name;
    const isTpl = plain === "Готівка" || plain === "Цілі";
    if (isTpl && !c.isSystem) {
      await prisma.category.update({
        where: { id: c.id },
        data: { isSystem: true },
      });
    }
  }

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: { name: u.name },
    });
  }

  const catsEnc = await prisma.category.findMany({ select: { id: true, name: true, isSystem: true } });
  for (const c of catsEnc) {
    if (c.isSystem) continue;
    await prisma.category.update({
      where: { id: c.id },
      data: { name: c.name },
    });
  }

  const goals = await prisma.goal.findMany({ select: { id: true, title: true } });
  for (const g of goals) {
    await prisma.goal.update({
      where: { id: g.id },
      data: { title: g.title },
    });
  }

  console.log("migrate-security-data: OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
