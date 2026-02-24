-- DropTable
DROP TABLE "Admin";

-- DropTable
DROP TABLE "BroadcastNotification";

-- RedefineTables (SQLite does not support ALTER TABLE DROP COLUMN, so we recreate)
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "partnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_User" ("id", "name", "email", "password", "role", "partnerId", "createdAt") SELECT "id", "name", "email", "password", "role", "partnerId", "createdAt" FROM "User";

DROP TABLE "User";

ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
