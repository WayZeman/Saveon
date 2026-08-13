export const transactionInclude = {
  category: { select: { id: true, name: true, isShared: true, kind: true } },
  sourceCategory: { select: { id: true, name: true, isShared: true, kind: true } },
} as const;
