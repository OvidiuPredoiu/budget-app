-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserPermissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dashboard" BOOLEAN NOT NULL DEFAULT true,
    "transactions" BOOLEAN NOT NULL DEFAULT true,
    "categories" BOOLEAN NOT NULL DEFAULT true,
    "budgets" BOOLEAN NOT NULL DEFAULT true,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "goals" BOOLEAN NOT NULL DEFAULT true,
    "investments" BOOLEAN NOT NULL DEFAULT true,
    "subscriptions" BOOLEAN NOT NULL DEFAULT true,
    "receipts" BOOLEAN NOT NULL DEFAULT true,
    "reports" BOOLEAN NOT NULL DEFAULT true,
    "insights" BOOLEAN NOT NULL DEFAULT true,
    "predictions" BOOLEAN NOT NULL DEFAULT true,
    "banking" BOOLEAN NOT NULL DEFAULT true,
    "sharedBudgets" BOOLEAN NOT NULL DEFAULT true,
    "analytics" BOOLEAN NOT NULL DEFAULT true,
    "tax" BOOLEAN NOT NULL DEFAULT true,
    "currency" BOOLEAN NOT NULL DEFAULT true,
    "developer" BOOLEAN NOT NULL DEFAULT true,
    "whiteLabel" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPermissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserPermissions" ("analytics", "banking", "budgets", "categories", "dashboard", "goals", "id", "insights", "investments", "predictions", "receipts", "recurring", "reports", "sharedBudgets", "subscriptions", "tax", "transactions", "updatedAt", "userId", "whiteLabel") SELECT "analytics", "banking", "budgets", "categories", "dashboard", "goals", "id", "insights", "investments", "predictions", "receipts", "recurring", "reports", "sharedBudgets", "subscriptions", "tax", "transactions", "updatedAt", "userId", "whiteLabel" FROM "UserPermissions";
DROP TABLE "UserPermissions";
ALTER TABLE "new_UserPermissions" RENAME TO "UserPermissions";
CREATE UNIQUE INDEX "UserPermissions_userId_key" ON "UserPermissions"("userId");
CREATE INDEX "UserPermissions_userId_idx" ON "UserPermissions"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
