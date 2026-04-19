import { PrismaClient } from "@prisma/client";
import { decryptField, encryptField, isEncryptedField } from "./field-crypto";

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrisma };

type ExtendedPrisma = ReturnType<typeof createExtendedClient>;

function encryptUserWrite(data: { name?: string | null } | undefined) {
  if (!data || data.name === undefined || data.name === null) return;
  const n = String(data.name);
  if (!isEncryptedField(n)) data.name = encryptField(n);
}

function encryptCategoryWrite(data: { name?: string | null; isSystem?: boolean | null } | undefined) {
  if (!data || data.name === undefined || data.name === null) return;
  if (data.isSystem) return;
  const n = String(data.name);
  if (!isEncryptedField(n)) data.name = encryptField(n);
}

function encryptGoalWrite(data: { title?: string | null } | undefined) {
  if (!data || data.title === undefined || data.title === null) return;
  const t = String(data.title);
  if (!isEncryptedField(t)) data.title = encryptField(t);
}

function createExtendedClient() {
  const client = new PrismaClient();
  return client.$extends({
    query: {
      user: {
        async create({ args, query }) {
          encryptUserWrite(args.data as { name?: string });
          return query(args);
        },
        async update({ args, query }) {
          encryptUserWrite(args.data as { name?: string });
          return query(args);
        },
        async upsert({ args, query }) {
          encryptUserWrite(args.create as { name?: string });
          encryptUserWrite(args.update as { name?: string });
          return query(args);
        },
      },
      category: {
        async create({ args, query }) {
          encryptCategoryWrite(args.data as { name?: string });
          return query(args);
        },
        async update({ args, query }) {
          encryptCategoryWrite(args.data as { name?: string });
          return query(args);
        },
        async upsert({ args, query }) {
          encryptCategoryWrite(args.create as { name?: string });
          encryptCategoryWrite(args.update as { name?: string });
          return query(args);
        },
      },
      goal: {
        async create({ args, query }) {
          encryptGoalWrite(args.data as { title?: string });
          return query(args);
        },
        async update({ args, query }) {
          encryptGoalWrite(args.data as { title?: string });
          return query(args);
        },
        async upsert({ args, query }) {
          encryptGoalWrite(args.create as { title?: string });
          encryptGoalWrite(args.update as { title?: string });
          return query(args);
        },
      },
    },
    result: {
      user: {
        name: {
          needs: { name: true },
          compute(u: { name: string }) {
            return decryptField(u.name);
          },
        },
      },
      category: {
        name: {
          needs: { name: true, isSystem: true },
          compute(c: { name: string; isSystem: boolean }) {
            if (c.isSystem) return c.name;
            return decryptField(c.name);
          },
        },
      },
      goal: {
        title: {
          needs: { title: true },
          compute(g: { title: string }) {
            return decryptField(g.title);
          },
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createExtendedClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
