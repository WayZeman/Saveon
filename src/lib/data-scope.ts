import type { SessionUser } from "./auth";

type CategoryAccess = {
  userId: string | null;
  createdBy: string | null;
  isShared: boolean;
};

export function canUseCategory(session: SessionUser, category: CategoryAccess): boolean {
  const partnerId = session.partnerId;
  const isLegacyGlobal = category.isShared && category.userId === null && category.createdBy === null;
  return (
    category.userId === session.id ||
    category.createdBy === session.id ||
    (!!partnerId && category.isShared && category.createdBy === partnerId) ||
    isLegacyGlobal
  );
}

/** Категорії: власні, спільні з партнером, глобальні шаблони з сиду (createdBy=null). */
export function categoriesVisibleWhere(session: SessionUser) {
  const partnerId = session.partnerId;
  return {
    OR: [
      { userId: session.id },
      { createdBy: session.id },
      ...(partnerId ? [{ isShared: true, createdBy: partnerId }] : []),
      { isShared: true, userId: null, createdBy: null },
    ],
  };
}

/** Категорії для сторінки керування та форм (без службових «Цілі» та авто-категорій цілей). */
export function categoriesManageWhere(session: SessionUser) {
  return {
    AND: [
      { OR: categoriesVisibleWhere(session).OR },
      { goalId: null },
      { NOT: { AND: [{ isSystem: true }, { name: "Цілі" }] } },
    ],
  };
}

/** Цілі: лише свої або спільні створені партнером (не всі isShared у системі). */
export function goalsVisibleWhere(session: SessionUser) {
  const partnerId = session.partnerId;
  return {
    OR: [{ createdBy: session.id }, ...(partnerId ? [{ isShared: true, createdBy: partnerId }] : [])],
  };
}

/** Транзакції: свої та партнера (як на дашборді). */
export function transactionUserIds(session: SessionUser): string[] {
  return session.partnerId ? [session.id, session.partnerId] : [session.id];
}
