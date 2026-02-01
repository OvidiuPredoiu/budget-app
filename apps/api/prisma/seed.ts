import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  // Create a test user
  const hashedPassword = await argon2.hash('password123');
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Utilizator Test',
      role: 'user'
    }
  });
  
  console.log('Created user:', user.email);
  
  // Create an admin user
  const adminPassword = await argon2.hash('admin123');
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Administrator',
      role: 'admin'
    }
  });
  
  console.log('Created admin:', admin.email);

  // Create permissions for users
  await Promise.all([
    prisma.userPermissions.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        // All features enabled by default
        dashboard: true,
        transactions: true,
        categories: true,
        budgets: true,
        recurring: true,
        goals: true,
        investments: true,
        subscriptions: true,
        receipts: true,
        reports: true,
        insights: true,
        predictions: true,
        banking: true,
        sharedBudgets: true,
        analytics: true,
        tax: true,
        currency: false,
        developer: false,
        whiteLabel: true,
      }
    }),
    prisma.userPermissions.upsert({
      where: { userId: admin.id },
      update: {},
      create: {
        userId: admin.id,
        // Admin gets all features
        dashboard: true,
        transactions: true,
        categories: true,
        budgets: true,
        recurring: true,
        goals: true,
        investments: true,
        subscriptions: true,
        receipts: true,
        reports: true,
        insights: true,
        predictions: true,
        banking: true,
        sharedBudgets: true,
        analytics: true,
        tax: true,
        currency: true,
        developer: true,
        whiteLabel: true,
      }
    })
  ]);

  console.log('Created permissions for users');
  
  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Alimente',
        color: '#10b981',
        userId: user.id
      }
    }),
    prisma.category.create({
      data: {
        name: 'Transport',
        color: '#3b82f6',
        userId: user.id
      }
    }),
    prisma.category.create({
      data: {
        name: 'Utilități',
        color: '#f59e0b',
        userId: user.id
      }
    }),
    prisma.category.create({
      data: {
        name: 'Distracție',
        color: '#ec4899',
        userId: user.id
      }
    }),
    prisma.category.create({
      data: {
        name: 'Sănătate',
        color: '#ef4444',
        userId: user.id
      }
    }),
    prisma.category.create({
      data: {
        name: 'Educație',
        color: '#8b5cf6',
        userId: user.id
      }
    }),
    prisma.category.create({
      data: {
        name: 'Salariu',
        color: '#059669',
        userId: user.id
      }
    }),
    prisma.category.create({
      data: {
        name: 'Economii',
        color: '#06b6d4',
        userId: user.id
      }
    })
  ]);
  
  console.log(`Created ${categories.length} categories`);
  
  // Create budgets for current month
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const budgets = await Promise.all([
    prisma.budget.create({
      data: {
        month: currentMonth,
        amount: 1500,
        categoryId: categories[0].id, // Alimente
        userId: user.id
      }
    }),
    prisma.budget.create({
      data: {
        month: currentMonth,
        amount: 500,
        categoryId: categories[1].id, // Transport
        userId: user.id
      }
    }),
    prisma.budget.create({
      data: {
        month: currentMonth,
        amount: 800,
        categoryId: categories[2].id, // Utilități
        userId: user.id
      }
    }),
    prisma.budget.create({
      data: {
        month: currentMonth,
        amount: 600,
        categoryId: categories[3].id, // Distracție
        userId: user.id
      }
    }),
    prisma.budget.create({
      data: {
        month: currentMonth,
        amount: 400,
        categoryId: categories[4].id, // Sănătate
        userId: user.id
      }
    })
  ]);
  
  console.log(`Created ${budgets.length} budgets for ${currentMonth}`);
  
  // Create sample transactions for the current month
  const transactions = [];
  
  // Income transactions
  transactions.push(
    prisma.transaction.create({
      data: {
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        amount: 5000,
        type: 'income',
        paymentMethod: 'card',
        cardType: 'debit',
        merchant: 'Companie SRL',
        note: 'Salariu luna curentă',
        categoryId: categories[6].id, // Salariu
        userId: user.id
      }
    })
  );
  
  // Expense transactions
  const expenseData = [
    { date: 3, amount: 120.50, categoryIdx: 0, merchant: 'Kaufland', note: 'Cumpărături săptămânale' },
    { date: 5, amount: 45.00, categoryIdx: 1, merchant: 'Metrorex', note: 'Abonament lunar' },
    { date: 7, amount: 250.00, categoryIdx: 2, merchant: 'Enel', note: 'Factură electricitate' },
    { date: 8, amount: 80.30, categoryIdx: 0, merchant: 'Mega Image', note: 'Alimente' },
    { date: 10, amount: 150.00, categoryIdx: 3, merchant: 'Cinema City', note: 'Film + cină' },
    { date: 12, amount: 200.00, categoryIdx: 4, merchant: 'Farmacia Tei', note: 'Medicamente' },
    { date: 14, amount: 95.00, categoryIdx: 0, merchant: 'Carrefour', note: 'Cumpărături' },
    { date: 15, amount: 60.00, categoryIdx: 1, merchant: 'OMV', note: 'Benzină', cardType: 'credit' },
    { date: 17, amount: 180.00, categoryIdx: 2, merchant: 'Digi', note: 'Internet + TV' },
    { date: 19, amount: 110.00, categoryIdx: 0, merchant: 'Lidl', note: 'Alimente' },
    { date: 20, amount: 75.00, categoryIdx: 3, merchant: 'Restaurant', note: 'Cină prieteni' },
    { date: 22, amount: 300.00, categoryIdx: 5, merchant: 'Udemy', note: 'Curs online' },
    { date: 24, amount: 130.00, categoryIdx: 0, merchant: 'Auchan', note: 'Cumpărături lunare' },
    { date: 26, amount: 50.00, categoryIdx: 1, merchant: 'Taxi', note: 'Transport urgență', paymentMethod: 'cash' },
    { date: 28, amount: 90.00, categoryIdx: 3, merchant: 'Steam', note: 'Jocuri', cardType: 'virtual' }
  ];
  
  for (const expense of expenseData) {
    transactions.push(
      prisma.transaction.create({
        data: {
          date: new Date(currentDate.getFullYear(), currentDate.getMonth(), expense.date),
          amount: expense.amount,
          type: 'expense',
          paymentMethod: expense.paymentMethod || 'card',
          cardType: expense.cardType || 'debit',
          merchant: expense.merchant,
          note: expense.note,
          categoryId: categories[expense.categoryIdx].id,
          userId: user.id
        }
      })
    );
  }
  
  await Promise.all(transactions);
  
  console.log(`Created ${transactions.length} transactions`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
