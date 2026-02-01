import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const router = Router();

// Middleware pentru autentificare
router.use(authMiddleware);

// GET /api/reports - Lista rapoartelor utilizatorului
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'reports');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Reports feature is not available' });
      }
    }
    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/comparison/yearly - Raport de comparație anuală
router.get('/comparison/yearly', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        }
      },
      include: { category: true }
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i).toLocaleString('ro-RO', { month: 'long' }),
      income: 0,
      expense: 0,
      net: 0
    }));

    transactions.forEach(t => {
      const month = t.date.getMonth();
      if (t.type === 'income') {
        monthlyData[month].income += t.amount;
      } else if (t.type === 'expense') {
        monthlyData[month].expense += t.amount;
      }
      monthlyData[month].net = monthlyData[month].income - monthlyData[month].expense;
    });

    res.json(monthlyData);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch yearly comparison' });
  }
});

// GET /api/reports/categories-breakdown - Breakdown by categories
router.get('/categories-breakdown', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate }
      },
      include: { category: true }
    });

    const breakdown = transactions.reduce((acc: any, t) => {
      if (!acc[t.category.id]) {
        acc[t.category.id] = {
          categoryName: t.category.name,
          categoryColor: t.category.color,
          income: 0,
          expense: 0,
          count: 0
        };
      }
      if (t.type === 'income') {
        acc[t.category.id].income += t.amount;
      } else {
        acc[t.category.id].expense += t.amount;
      }
      acc[t.category.id].count++;
      return acc;
    }, {});

    res.json(Object.values(breakdown));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch categories breakdown' });
  }
});

// GET /api/reports/:id - Descarcă raport
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'reports');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Reports feature is not available' });
      }
    }

    const report = await prisma.report.findFirst({
      where: { id, userId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Regenerează raportul pe bază de date
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: report.startDate,
          lte: report.endDate
        }
      },
      include: { category: true },
      orderBy: { date: 'desc' }
    });

    if (report.format === 'json') {
      res.json({
        title: report.title,
        period: `${report.startDate} - ${report.endDate}`,
        generatedAt: new Date().toISOString(),
        transactions: transactions.map(t => ({
          date: t.date,
          category: t.category.name,
          amount: t.amount,
          type: t.type,
          merchant: t.merchant,
          note: t.note
        }))
      });
    } else if (report.format === 'csv') {
      let csv = 'Data,Categorie,Suma,Tip,Comerciant,Nota\n';
      transactions.forEach(t => {
        csv += `"${t.date.toISOString().split('T')[0]}","${t.category.name}",${t.amount},"${t.type}","${t.merchant || ''}","${t.note || ''}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report_${report.id}.csv"`);
      res.send(csv);
    } else if (report.format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Raport');

      // Headers
      worksheet.columns = [
        { header: 'Data', key: 'date', width: 12 },
        { header: 'Categorie', key: 'category', width: 15 },
        { header: 'Suma', key: 'amount', width: 12 },
        { header: 'Tip', key: 'type', width: 10 },
        { header: 'Comerciant', key: 'merchant', width: 20 },
        { header: 'Notă', key: 'note', width: 20 }
      ];

      // Data
      transactions.forEach(t => {
        worksheet.addRow({
          date: t.date.toISOString().split('T')[0],
          category: t.category.name,
          amount: t.amount,
          type: t.type,
          merchant: t.merchant,
          note: t.note
        });
      });

      // Summary sheet
      const summarySheet = workbook.addWorksheet('Rezumat');
      const byCategory = transactions.reduce((acc: any, t) => {
        if (!acc[t.category.name]) {
          acc[t.category.name] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
          acc[t.category.name].income += t.amount;
        } else {
          acc[t.category.name].expense += t.amount;
        }
        return acc;
      }, {});

      summarySheet.columns = [
        { header: 'Categorie', key: 'category', width: 20 },
        { header: 'Venituri', key: 'income', width: 12 },
        { header: 'Cheltuieli', key: 'expense', width: 12 }
      ];

      Object.entries(byCategory).forEach(([cat, data]: any) => {
        summarySheet.addRow({
          category: cat,
          income: data.income,
          expense: data.expense
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="report_${report.id}.xlsx"`);

      await workbook.xlsx.write(res);
    } else if (report.format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report_${report.id}.pdf"`);

      doc.pipe(res);

      doc.fontSize(20).font('Helvetica-Bold').text(report.title, { align: 'center' });
      doc.fontSize(10).text(`Perioada: ${report.startDate} - ${report.endDate}`, { align: 'center' });
      doc.text(`Generat: ${new Date().toLocaleString('ro-RO')}`, { align: 'center' });
      doc.moveDown();

      // Summary by category
      const byCategory = transactions.reduce((acc: any, t) => {
        if (!acc[t.category.name]) {
          acc[t.category.name] = { income: 0, expense: 0, count: 0 };
        }
        if (t.type === 'income') {
          acc[t.category.name].income += t.amount;
        } else {
          acc[t.category.name].expense += t.amount;
        }
        acc[t.category.name].count++;
        return acc;
      }, {});

      doc.fontSize(14).font('Helvetica-Bold').text('Rezumat pe Categorii', { underline: true });
      doc.fontSize(10).font('Helvetica');

      const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      Object.entries(byCategory).forEach(([cat, data]: any) => {
        const line = `${cat}: ${data.count} tranzacții - Venituri: ${data.income.toFixed(2)} | Cheltuieli: ${data.expense.toFixed(2)}`;
        doc.text(line, { align: 'left' });
      });

      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold').text(`Total Venituri: ${totalIncome.toFixed(2)} RON`);
      doc.text(`Total Cheltuieli: ${totalExpense.toFixed(2)} RON`);
      doc.text(`Net: ${(totalIncome - totalExpense).toFixed(2)} RON`);

      doc.end();
    }
  } catch (err: any) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// POST /api/reports - Crează raport
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { title, type, startDate, endDate, format, filters } = req.body;

    if (!title || !type || !startDate || !endDate || !format) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const report = await prisma.report.create({
      data: {
        userId,
        title,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        format,
        filters: filters ? JSON.stringify(filters) : null,
        generatedAt: new Date()
      }
    });

    res.status(201).json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// DELETE /api/reports/:id - Șterge raport
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const report = await prisma.report.findFirst({
      where: { id, userId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await prisma.report.delete({ where: { id } });
    res.json({ message: 'Report deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;
