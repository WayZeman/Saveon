import type { SessionUser } from "./auth";

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

/** Цілі: лише свої або спільні створені партнером (не всі isShared у системі). */
export function goalsVisibleWhere(session: SessionUser) {
  const partnerId = session.partnerId;
  return {
    OR: [{ createdBy: session.id }, ...(partnerId ? [{ isShared: true, createdBy: partnerId }] : [])],
  };
}
