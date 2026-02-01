import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CategoryGroupKey = {
  userId: string;
  name: string;
  color: string | null;
};

const groupKey = (c: { userId: string; name: string; color: string | null }) =>
  `${c.userId}::${c.name.trim().toLowerCase()}::${(c.color || '').toLowerCase()}`;

async function main() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      userId: true,
      name: true,
      color: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  const groups = new Map<string, CategoryGroupKey & { ids: string[] }>();

  for (const c of categories) {
    const key = groupKey({
      userId: c.userId || '',
      name: c.name,
      color: c.color
    });
    if (!groups.has(key)) {
      groups.set(key, {
        userId: c.userId || '',
        name: c.name,
        color: c.color,
        ids: [c.id]
      });
    } else {
      groups.get(key)!.ids.push(c.id);
    }
  }

  const duplicateGroups = Array.from(groups.values()).filter(g => g.ids.length > 1);
  if (duplicateGroups.length === 0) {
    console.log('No duplicate categories found.');
    return;
  }

  for (const group of duplicateGroups) {
    const [keepId, ...removeIds] = group.ids;

    await prisma.$transaction(async (tx) => {
      const keepBudgets = await tx.budget.findMany({
        where: { categoryId: keepId }
      });
      const keepByMonth = new Map(keepBudgets.map((b) => [b.month, b]));

      for (const removeId of removeIds) {
        const removeBudgets = await tx.budget.findMany({
          where: { categoryId: removeId }
        });

        for (const b of removeBudgets) {
          const existing = keepByMonth.get(b.month);
          if (existing) {
            const updated = await tx.budget.update({
              where: { id: existing.id },
              data: { amount: existing.amount + b.amount }
            });
            keepByMonth.set(updated.month, updated);
            await tx.budget.delete({ where: { id: b.id } });
          } else {
            const updated = await tx.budget.update({
              where: { id: b.id },
              data: { categoryId: keepId }
            });
            keepByMonth.set(updated.month, updated);
          }
        }
      }

      await tx.transaction.updateMany({
        where: { categoryId: { in: removeIds } },
        data: { categoryId: keepId }
      });

      await tx.category.deleteMany({
        where: { id: { in: removeIds } }
      });
    });

    console.log(
      `Merged ${removeIds.length} duplicates into ${keepId} for user ${group.userId} (${group.name}).`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
