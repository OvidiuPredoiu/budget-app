'use client';

import { useEffect, useState } from 'react';
import { Download, BarChart as BarChartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { PermissionGuard } from '@/components/PermissionGuard';

interface TaxSummary {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  taxableIncome: number;
  estimatedTax: number;
}

function TaxContent() {
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [deductions, setDeductions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadTaxData();
  }, [year]);

  const loadTaxData = async () => {
    try {
      setLoading(true);
      const [summaryRes, estimateRes, deductionsRes] = await Promise.all([
        api.get(`/tax/summary?year=${year}`),
        api.get('/tax/estimate'),
        api.get(`/tax/deductions?year=${year}`)
      ]);
      setSummary(summaryRes.data);
      setEstimate(estimateRes.data);
      setDeductions(deductionsRes.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      await api.post('/tax/generate-report', { year });
      alert('Raport generat cu succes!');
    } catch (err) {
      alert('Failed to generate report');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Planificare Fiscală</h1>
          <p className="text-sm text-muted-foreground mt-1">Estimări taxe și deduceri</p>
        </div>
        <div className="flex gap-2">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button onClick={handleGenerateReport} className="gap-2">
            <Download className="h-4 w-4" />
            Generează Raport
          </Button>
        </div>
      </div>

      {/* Tax Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">Venit total</div>
              <div className="text-2xl font-bold text-emerald-400 mt-2">
                {formatCurrency(summary.totalIncome)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">Cheltuieli deductibile</div>
              <div className="text-2xl font-bold text-cyan-400 mt-2">
                {formatCurrency(summary.totalExpenses)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/30">
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">Taxă estimată</div>
              <div className="text-2xl font-bold text-orange-400 mt-2">
                {formatCurrency(summary.estimatedTax)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detaliuri Fiscale ({year})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between pb-3 border-b border-white/10">
              <span className="text-muted-foreground">Venit brut:</span>
              <span className="font-semibold">{formatCurrency(summary.totalIncome)}</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-white/10">
              <span className="text-muted-foreground">Cheltuieli eligibile:</span>
              <span className="font-semibold">{formatCurrency(summary.totalExpenses * 0.2)}</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-white/10">
              <span className="text-muted-foreground">Venit net:</span>
              <span className="font-semibold">{formatCurrency(summary.netIncome)}</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-white/10">
              <span className="text-muted-foreground">Venit impozabil:</span>
              <span className="font-semibold text-yellow-400">{formatCurrency(summary.taxableIncome)}</span>
            </div>
            <div className="flex justify-between pt-3">
              <span className="text-muted-foreground font-semibold">Taxă estimată (16%):</span>
              <span className="font-bold text-orange-400 text-lg">{formatCurrency(summary.estimatedTax)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estimate */}
      {estimate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimare Anuală</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Venit YTD ({estimate.monthsPassed} luni):</span>
              <span className="font-semibold">{formatCurrency(estimate.actualIncomeYTD)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimat anual:</span>
              <span className="font-semibold text-cyan-400">{formatCurrency(estimate.estimatedAnnualIncome)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-white/10">
              <span className="text-muted-foreground">Taxă lunară medie:</span>
              <span className="font-bold text-orange-400">{formatCurrency(estimate.estimatedMonthlyTax)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deductions */}
      {deductions?.breakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deduceri Posibile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(deductions.breakdown).map(([category, data]: [string, any]) => (
              <div key={category} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm">{category}</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(data.deductible)}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${(data.deductible / data.total) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {formatCurrency(data.total)} eligibil de {(data.deductible / data.total * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function TaxPage() {
  return (
    <PermissionGuard feature="tax">
      <TaxContent />
    </PermissionGuard>
  );
}
