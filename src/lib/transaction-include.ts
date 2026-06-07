export const transactionInclude = {
  category: { select: { id: true, name: true, isShared: true } },
  sourceCategory: { select: { id: true, name: true, isShared: true } },
} as const;
