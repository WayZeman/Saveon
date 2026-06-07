/** Довжина коду для нових реєстрацій і зміни в налаштуваннях */
export const RECOVERY_CODE_LENGTH = 6;

export const recoveryCodeNewSchema = /^\d{6}$/;
/** Скидання пароля: підтримка старих 4-значних і нових 6-значних кодів */
export const recoveryCodeResetSchema = /^\d{4,6}$/;
