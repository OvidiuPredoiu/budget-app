'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, XAxis, YAxis } from 'recharts';
import { TrendingUp, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PermissionGuard } from '@/components/PermissionGuard';

function AnalyticsContent() {
  const [sankey, setSankey] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [customData, setCustomData] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any>(null);
  const [categoryTrends, setCategoryTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [groupBy, setGroupBy] = useState('category');
  const [chartType, setChartType] = useState('all');

  const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    loadAnalytics();
  }, [selectedMonth, selectedYear, groupBy, chartType]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [sankey, heatmap, custom, daily, trends] = await Promise.all([
        api.get(`/analytics/sankey?month=${selectedMonth}&year=${selectedYear}`),
        api.get(`/analytics/heatmap?year=${selectedYear}`),
        api.get(`/analytics/custom?month=${selectedMonth}&year=${selectedYear}&groupBy=${groupBy}&type=${chartType}`),
        api.get(`/analytics/daily?days=30`),
        api.get(`/analytics/category-trends?months=6`)
      ]);

      setSankey(sankey.data);
      setHeatmap(heatmap.data);
      setCustomData(custom.data);
      setDailyData(daily.data);
      setCategoryTrends(trends.data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const json = JSON.stringify({
      sankey,
      heatmap,
      customData,
      dailyData,
      categoryTrends
    }, null, 2);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (loading) {
    return <div className="text-center py-12">Se încarcă...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Analize Avansate</h1>
          <p className="text-sm text-muted-foreground mt-1">Vizualizări detaliate și tendințe</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Exportă
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Luna</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i).toLocaleString('ro-RO', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">An</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Grupare</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              >
                <option value="category">Categorie</option>
                <option value="type">Tip</option>
                <option value="day">Zi</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tip</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              >
                <option value="all">Toate</option>
                <option value="income">Venit</option>
                <option value="expense">Cheltuiala</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custom Chart */}
        {customData?.data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuție după {groupBy}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={customData.data}>
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                  <Bar dataKey="total" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2 text-sm">
                <div>Total: <span className="font-bold text-emerald-400">{formatCurrency(customData.summary.totalAmount)}</span></div>
                <div>Tranzacții: <span className="font-bold">{customData.summary.totalTransactions}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Balance */}
        {dailyData?.data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Balanță Zilnică (30 zile)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData.data}>
                  <XAxis dataKey="date" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" />
                  <Line type="monotone" dataKey="net" stroke="#06b6d4" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Category Trends */}
      {categoryTrends?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendințe pe Categorii (ultimi 6 luni)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryTrends.data.slice(0, 5).map((trend: any, idx: number) => (
                <div key={idx} className="border-b border-white/10 pb-4 last:border-0">
                  <div className="font-semibold mb-2 text-sm">{trend.category}</div>
                  <div className="flex gap-1">
                    {Object.entries(trend.months).map(([month, amount]: [string, any]) => (
                      <div
                        key={month}
                        className="flex-1 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"
                        title={`${month}: ${formatCurrency(amount)}`}
                      >
                        <div
                          className="h-full rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center text-xs"
                          style={{
                            width: `${(amount / 100) * 100}%`,
                            minWidth: '2px'
                          }}
                        >
                          {amount > 50 && <span className="text-white font-bold">{formatCurrency(amount)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heatmap */}
      {heatmap?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calendar Cheltuieli ({heatmap.year})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Total anual: <span className="font-bold text-emerald-400">{formatCurrency(heatmap.totalSpent)}</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {Array.from({ length: 12 }).map((_, monthIdx) => (
                  <div key={monthIdx}>
                    <div className="text-xs font-semibold mb-2">
                      {new Date(2024, monthIdx).toLocaleString('ro-RO', { month: 'long' })}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {heatmap.data
                        .filter((d: any) => d.month === monthIdx + 1)
                        .map((day: any) => {
                          const intensity = Math.min(100, (day.amount / (heatmap.maxAmount / 4)) * 100);
                          return (
                            <div
                              key={day.date}
                              className="w-4 h-4 rounded-sm border border-white/10"
                              style={{
                                backgroundColor: `rgba(16, 185, 129, ${intensity / 100})`
                              }}
                              title={`${day.date}: ${formatCurrency(day.amount)}`}
                            />
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <PermissionGuard feature="analytics">
      <AnalyticsContent />
    </PermissionGuard>
  );
}
