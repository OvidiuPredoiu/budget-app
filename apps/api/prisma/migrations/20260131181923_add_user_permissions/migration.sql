-- CreateTable
CREATE TABLE "UserPermissions" (
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
    "whiteLabel" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPermissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPermissions_userId_key" ON "UserPermissions"("userId");

-- CreateIndex
CREATE INDEX "UserPermissions_userId_idx" ON "UserPermissions"("userId");
