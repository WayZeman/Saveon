import { prisma } from "@/lib/prisma";

export const AUTO_SYNC_NOTE_PREFIX = "saveon:asset:";

let purged: Promise<number> | null = null;

/** Removes Cortex rows that today's transaction-sync wrote. Manual + adds are kept. */
export async function purgeAutoSyncedInvestments(): Promise<number> {
  if (!purged) {
    purged = prisma.investment
      .deleteMany({ where: { notes: { startsWith: AUTO_SYNC_NOTE_PREFIX } } })
      .then((result) => result.count)
      .catch((error) => {
        purged = null;
        throw error;
      });
  }
  return purged;
}
