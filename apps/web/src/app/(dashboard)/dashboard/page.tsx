'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';
import api from '@/lib/api';
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Plus } from 'lucide-react';
import { useLastUpdate } from '@/lib/useLastUpdate';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function DashboardPage() {
  const router = useRouter();
  const { updateNow } = useLastUpdate();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [month]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadDashboardData();
    }, 15000);
    return () => clearInterval(intervalId);
  }, [month]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const streamUrl = `${API_URL}/insights/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    const onUpdate = () => {
      loadDashboardData();
    };

    eventSource.addEventListener('insights-update', onUpdate as EventListener);
    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.removeEventListener('insights-update', onUpdate as EventListener);
      eventSource.close();
    };
  }, [month]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const dashboardResponse = await api.get(`/dashboard?month=${month}`);
      setData(dashboardResponse.data);

      const [insightsResult, transactionsResult] = await Promise.allSettled([
        api.get(`/insights?month=${month}`),
        api.get(`/transactions?month=${month}`)
      ]);

      if (insightsResult.status === 'fulfilled') {
        setInsights(insightsResult.value.data);
      } else {
        console.warn('Insights unavailable:', insightsResult.reason);
        setInsights(null);
      }

      if (transactionsResult.status === 'fulfilled') {
        setRecentTransactions(transactionsResult.value.data.slice(0, 5));
      } else {
        console.warn('Transactions unavailable:', transactionsResult.reason);
        setRecentTransactions([]);
      }

      // Actualizez timestamp-ul
      updateNow();
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
                    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = months[d.getMonth()];
      const label = `${monthName} ${d.getFullYear()}`;
      options.push({ value, label });
    }
    return options;
  };

  if (loading) {
    return <div className="text-center py-12">Se încarcă...</div>;
  }

  if (!data) {
    return <div className="text-center py-12">Nu există date disponibile</div>;
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Raportare</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-10 sm:h-9 w-full sm:w-auto" onClick={() => router.push('/transactions')}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Tranzacție Nouă</span>
            <span className="sm:hidden">Nou</span>
          </Button>
        </div>
      </div>
  {/* 3 Cards într-un grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Bugete depășite */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-900">Bugete depășite</CardTitle>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {data.budgetVsActual?.length > 0 ? (
              (() => {
                const over = data.budgetVsActual
                  .filter((b: any) => b.budgetType !== 'income')
                  .filter((b: any) => b.actual > b.budget)
                  .sort((a: any, b: any) => b.actual - b.budget - (a.actual - a.budget));
                const biggest = over[0];
                return (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-700">
                      {over.length > 0
                        ? `${over.length} categorii depășite luna asta.`
                        : 'Nicio depășire de buget. Bravo!'}
                    </div>
                    {biggest && (
                      <div className="p-3 rounded-lg border">
                        <div className="text-xs text-gray-500">Cea mai mare depășire</div>
                        <div className="text-sm font-medium text-gray-900">{biggest.categoryName}</div>
                        <div className="text-sm text-red-600 font-semibold">
                          {formatCurrency(biggest.actual - biggest.budget)} peste buget
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">Nu există bugete pentru această lună</p>
            )}
          </CardContent>
        </Card>

        {/* Cheltuieli pe Categorie */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-900">Cheltuieli pe Categorie</CardTitle>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {data.spendByCategory.length > 0 ? (
              <div className="space-y-3">
                {data.spendByCategory.slice(0, 5).map((cat: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{cat.name}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          backgroundColor: cat.color || COLORS[idx],
                          width: `${(cat.amount / data.kpis.totalExpense) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">Nu există date</p>
            )}
          </CardContent>
        </Card>

        {/* Sumar lunar */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-900">Sumar Lunar</CardTitle>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Venituri</div>
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(data.kpis.totalIncome)}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Cheltuieli</div>
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(data.kpis.totalExpense)}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Bilanț</div>
                    <div className={`text-sm font-semibold ${
                      data.kpis.net >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>{formatCurrency(data.kpis.net)}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Tabel principal cu KPIs */}
      <Card className="shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categorie</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Buget</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Diferență</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.budgetVsActual.map((item: any, idx: number) => {
                const isIncome = item.budgetType === 'income';
                const diff = item.budget - item.actual;
                const percentage = item.budget > 0 ? (item.actual / item.budget) * 100 : 0;
                let status = 'Excelent';
                let statusColor = 'bg-green-100 text-green-800';
                if (isIncome) {
                  if (percentage < 100) {
                    status = 'Sub țintă';
                    statusColor = 'bg-yellow-100 text-yellow-800';
                  } else if (percentage >= 120) {
                    status = 'Peste țintă';
                    statusColor = 'bg-green-100 text-green-800';
                  } else {
                    status = 'Atins';
                    statusColor = 'bg-green-100 text-green-800';
                  }
                } else {
                  if (percentage > 100) {
                    status = 'Depășit';
                    statusColor = 'bg-red-100 text-red-800';
                  } else if (percentage > 80) {
                    status = 'Atenție';
                    statusColor = 'bg-yellow-100 text-yellow-800';
                  } else if (percentage > 50) {
                    status = 'Bun';
                    statusColor = 'bg-green-100 text-green-800';
                  }
                }
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-sm font-medium text-gray-900">{item.categoryName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">{formatCurrency(item.budget)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">{formatCurrency(item.actual)}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                      (isIncome ? diff <= 0 : diff >= 0) ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isIncome
                        ? (diff <= 0 ? '+' : '-')
                        : (diff >= 0 ? '+' : '-')}
                      {formatCurrency(Math.abs(diff))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-8 flex items-end gap-0.5">
                          {[40, 60, 45, 70, 55, 65, 50].map((height, i) => (
                            <div key={i} className="flex-1 bg-primary rounded-sm" style={{ height: `${height}%` }}></div>
                          ))}
                        </div>
                        <span className={`text-xs font-medium ${
                          (isIncome ? diff <= 0 : diff >= 0) ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(isIncome ? diff <= 0 : diff >= 0) ? '↑' : '↓'} {Math.abs(percentage - 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

    
      {/* AI Friend Insights */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-gray-50 py-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-gray-900">Prietenul tău AI</CardTitle>
            <div className="text-[11px] text-gray-500">Recomandări rapide</div>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {insights ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-700">{insights.summary}</div>
              <div className="space-y-2">
                {insights.messages?.length > 0 ? (
                  insights.messages.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-md border">
                      <div
                        className={`w-2 h-2 mt-1.5 rounded-full ${
                          item.type === 'warning'
                            ? 'bg-red-500'
                            : item.type === 'success'
                              ? 'bg-green-500'
                              : 'bg-blue-500'
                        }`}
                      ></div>
                      <div>
                        <div className="text-xs font-semibold text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-600">{item.detail}</div>
                        <div className="text-[11px] text-gray-500 mt-1">Data: {formatDate(item.date)}</div>
                        {item.transactionDate && (
                          <div className="text-[11px] text-gray-500">Legat de tranzacția din {formatDate(item.transactionDate)}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500">Nu sunt recomandări disponibile.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">Se încarcă recomandările...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
