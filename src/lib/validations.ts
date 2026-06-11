import { z } from "zod";
import { RECOVERY_CODE_LENGTH } from "./recovery-code";

export const loginSchema = z.object({
  email: z.string().email("Невірний формат email"),
  password: z.string().min(1, "Пароль обов'язковий"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Вкажіть ваше ім'я").max(50),
  email: z.string().email("Невірний формат email"),
  password: z.string().min(6, "Пароль має містити мінімум 6 символів"),
  recoveryCode: z
    .string()
    .length(RECOVERY_CODE_LENGTH, `Код має містити ${RECOVERY_CODE_LENGTH} цифр`)
    .regex(/^\d{6}$/, "Тільки цифри"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Невірний формат email"),
  recoveryCode: z
    .string()
    .min(4, "Код має містити від 4 до 6 цифр")
    .max(6, "Код має містити від 4 до 6 цифр")
    .regex(/^\d{4,6}$/, "Тільки цифри"),
  newPassword: z.string().min(6, "Пароль має містити мінімум 6 символів"),
});

export const changeRecoveryCodeSchema = z
  .object({
    password: z.string().min(1, "Введіть пароль"),
    recoveryCode: z
      .string()
      .length(RECOVERY_CODE_LENGTH, `Код має містити ${RECOVERY_CODE_LENGTH} цифр`)
      .regex(/^\d{6}$/, "Тільки цифри"),
    confirmRecoveryCode: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.recoveryCode !== data.confirmRecoveryCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Коди не співпадають",
        path: ["confirmRecoveryCode"],
      });
    }
  });

export const addPartnerSchema = z.object({
  email: z.string().email("Невірний формат email"),
  role: z.enum(["husband", "wife", "friend"], { errorMap: () => ({ message: "Оберіть тип партнера" }) }),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  isShared: z.boolean().optional().default(false),
  tier: z.enum(["primary", "secondary"]).optional().default("primary"),
});

export const categoryPatchSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    isShared: z.boolean().optional(),
    tier: z.enum(["primary", "secondary"]).optional(),
  })
  .refine((data) => data.name !== undefined || data.isShared !== undefined || data.tier !== undefined, {
    message: "Nothing to update",
  });

export const transactionSchema = z
  .object({
    amount: z.number().positive(),
    type: z.enum(["income", "expense"]),
    categoryId: z.string().min(1),
    sourceCategoryId: z.string().min(1).optional(),
    goalId: z.string().optional(),
    currency: z.enum(["UAH", "USD", "EUR"]).optional().default("UAH"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "expense" && !data.sourceCategoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Для витрати вкажіть категорію, з якої знімаються кошти",
        path: ["sourceCategoryId"],
      });
    }
  });

const goalDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Некоректна дата")
  .optional()
  .nullable();

export const goalSchema = z.object({
  title: z.string().min(1).max(200),
  targetAmount: z.number().positive(),
  description: z.string().max(2000).optional(),
  deadline: goalDateString,
  isShared: z.boolean().optional().default(true),
  sourceCategoryIds: z.array(z.string().min(1)).min(1, "Оберіть хоча б одну категорію"),
});

export const goalPatchSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    targetAmount: z.number().positive().optional(),
    description: z.string().max(2000).optional().nullable(),
    deadline: goalDateString,
    isShared: z.boolean().optional(),
    sourceCategoryIds: z.array(z.string().min(1)).min(1).optional(),
    realize: z.boolean().optional(),
    sourceCategoryId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.realize === true && !data.sourceCategoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Для реалізації цілі вкажіть категорію, з якої знімаються кошти",
        path: ["sourceCategoryId"],
      });
    }
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
