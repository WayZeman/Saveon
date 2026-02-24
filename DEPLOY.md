# Запуск проєкту на хості

Проєкт: Next.js 14 (App Router), Prisma, SQLite (або PostgreSQL).

## Змінні середовища

Створіть на хості файл `.env` (або введіть змінні в панелі хостингу):

| Змінна | Опис | Приклад |
|--------|------|---------|
| `DATABASE_URL` | Підключення до БД | `file:./prisma/data.db` або `postgresql://user:pass@host:5432/db` |

Для SQLite на хості вкажіть **абсолютний шлях** до файлу БД у директорії, яка зберігається між перезапусками (наприклад volume/disc).

---

## Як деплоїти

### 1. Build і Start на будь-якому VPS / shared hosting (Node 18+)

На сервері:

```bash
# Клонування (або завантаження коду)
git clone <repo> && cd 2.0-Finance-family-20260221

# Змінні
cp .env.example .env
# Відредагуйте .env — вкажіть DATABASE_URL для продакшену

# Встановлення та збірка (postinstall вже викликає prisma generate)
npm ci
npm run build

# Міграції БД (один раз або після оновлення)
npx prisma migrate deploy

# Опційно: seed демо-даних (один раз)
npm run db:seed

# Запуск
npm run start
```

Додатково налаштуйте процес-менеджер (systemd, PM2) та зворотний проксі (nginx) на порт 3000.

---

### 2. Railway / Render / подібні (PaaS)

1. Підключіть репозиторій.
2. **Build Command:** `npm run build` (вже включає `prisma generate`).
3. **Start Command:** `npx prisma migrate deploy && npm run start`.
4. **Environment:** додайте `DATABASE_URL`.
   - На Railway можна додати SQLite Plugin або PostgreSQL.
   - На Render для SQLite вкажіть шлях у постійному диску (persistent disk), якщо сервіс це підтримує.

Якщо хост надає лише PostgreSQL — у `prisma/schema.prisma` змініть `provider = "postgresql"` і `url = env("DATABASE_URL")`, після чого створіть і застосуйте міграції для PostgreSQL.

---

### 3. Vercel (serverless)

Vercel не підтримує постійну файлову систему для SQLite. Варіанти:

- Використати **Vercel Postgres** або зовнішній **PostgreSQL** і вказати `DATABASE_URL` у налаштуваннях проєкту.
- Або деплоїти на **VPS / Railway / Render**, де можна використати SQLite або свій PostgreSQL.

Якщо оберете PostgreSQL: змініть у `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Потім:

```bash
npx prisma migrate dev --name init_pg
# і далі на хості: npx prisma migrate deploy
```

---

### 4. Standalone-збірка (опційно, для VPS)

Менший розмір артефакту та простіший запуск одним бинарником/папкою:

```bash
BUILD_STANDALONE=1 npm run build
```

Після збірки запуск (з кореня проєкту):

```bash
node .next/standalone/server.js
```

Переконайтесь, що поруч є `.next/static` і `public` (скопіюйте їх у папку з `server.js`, якщо потрібно — див. документацію Next.js output: 'standalone').

---

## Чеклист перед деплоєм

- [ ] У `.env` на хості вказано коректний `DATABASE_URL`.
- [ ] Виконано `npx prisma migrate deploy` після першого деплою або після змін у схемі.
- [ ] Порт 3000 відкритий або налаштований зворотний проксі (наприклад nginx) на цей порт.
- [ ] Для продакшену не використовуйте демо-паролі з seed; при потребі вимкніть seed або змініть паролі.
