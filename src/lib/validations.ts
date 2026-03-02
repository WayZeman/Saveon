import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Невірний формат email"),
  password: z.string().min(1, "Пароль обов'язковий"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Вкажіть ваше ім'я").max(50),
  email: z.string().email("Невірний формат email"),
  password: z.string().min(6, "Пароль має містити мінімум 6 символів"),
  recoveryCode: z.string().length(4, "Код має містити 4 цифри").regex(/^\d{4}$/, "Тільки цифри"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Невірний формат email"),
  recoveryCode: z.string().length(4, "Код має містити 4 цифри").regex(/^\d{4}$/, "Тільки цифри"),
  newPassword: z.string().min(6, "Пароль має містити мінімум 6 символів"),
});

export const addPartnerSchema = z.object({
  email: z.string().email("Невірний формат email"),
  role: z.enum(["husband", "wife", "friend"], { errorMap: () => ({ message: "Оберіть тип партнера" }) }),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  isShared: z.boolean().optional().default(false),
});

export const transactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().min(1),
  goalId: z.string().optional(),
  currency: z.enum(["UAH", "USD", "EUR"]).optional().default("UAH"),
});

export const goalSchema = z.object({
  title: z.string().min(1).max(200),
  targetAmount: z.number().positive(),
  isShared: z.boolean().optional().default(true),
});

export const goalPatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  targetAmount: z.number().positive().optional(),
  isShared: z.boolean().optional(),
  realize: z.boolean().optional(),
});

export const goalContributeSchema = z.object({
  goalId: z.string().min(1),
  amount: z.number().positive(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type GoalContributeInput = z.infer<typeof goalContributeSchema>;
