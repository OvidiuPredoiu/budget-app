'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, Lightbulb, Activity, Target, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/lib/api';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Prediction {
  month: string;
  predictedTotal: number;
  byCategory: Record<string, any>;
}

interface Anomaly {
  transactionId: string;
  date: string;
  category: string;
  amount: number;
  expectedAvg: number;
  deviation: number;
  severity: string;
}

interface Recommendation {
  type: string;
  category?: string;
  message: string;
  potentialSavings: number;
  priority: string;
}

interface HealthScore {
  score: number;
  grade: string;
  income: number;
  expense: number;
  savingsRate: number;
  budgetAdherence: number;
  recommendations: string[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function InsightsContent() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const [predRes, anomRes, recRes, healthRes] = await Promise.all([
        api.get('/predictions/expenses?months=3'),
        api.get('/predictions/anomalies?threshold=2'),
        api.get('/predictions/recommendations'),
        api.get('/predictions/financial-health')
      ]);

      setPredictions(predRes.data);
      setAnomalies(anomRes.data);
      setRecommendations(recRes.data);
      setHealth(healthRes.data);
    } catch (err) {
      console.error('Error loading insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Se încarcă...</div>;
  }

  // Prepare data for charts
  const chartData = predictions.map(p => ({
    month: p.month.split('-')[1],
    total: p.predictedTotal
  }));

  const anomaliesByCategory = anomalies.reduce((acc: any, a) => {
    if (!acc[a.category]) acc[a.category] = 0;
    acc[a.category]++;
    return acc;
  }, {});

  const anomalyChartData = Object.entries(anomaliesByCategory).map(([cat, count]) => ({
    name: cat,
    value: count
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Insights & Predicții</h1>
        <p className="text-sm text-muted-foreground mt-1">Analiză inteligentă și recomandări de economii</p>
      </div>

      {/* Financial Health Score */}
      {health && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              Scor Sănătate Financiară
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-end gap-4">
                  <div className="text-6xl font-bold text-emerald-400">{health.score}</div>
                  <div className="mb-2">
                    <div className="text-3xl font-bold">{health.grade}</div>
                    <div className="text-sm text-muted-foreground">Grade</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Venituri lunare:</span>
                  <span className="font-semibold text-emerald-400">{health.income.toFixed(2)} RON</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cheltuieli lunare:</span>
                  <span className="font-semibold text-red-400">{health.expense.toFixed(2)} RON</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Rata de economii:</span>
                  <span className="font-semibold text-blue-400">{health.savingsRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Aderență la buget:</span>
                  <span className="font-semibold text-purple-400">{health.budgetAdherence.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            {health.recommendations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                {health.recommendations.map((rec, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground">• {rec}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expense Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Prognoza Cheltuieli (3 luni)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} name="Prognozat" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nu sunt date disponibile</p>
          )}
        </CardContent>
      </Card>

      {/* Anomalies Detection */}
      {anomalies.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Cheltuieli Neobișnuite ({anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomalies.slice(0, 5).map((anomaly) => (
                <div
                  key={anomaly.transactionId}
                  className={`p-4 rounded-lg border ${
                    anomaly.severity === 'high'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{anomaly.category}</div>
                      <div className="text-sm text-muted-foreground">
                        Suma: {anomaly.amount.toFixed(2)} RON (Medie: {anomaly.expectedAvg.toFixed(2)} RON)
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${anomaly.severity === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {anomaly.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-400" />
              Recomandări de Economii
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    rec.priority === 'high'
                      ? 'bg-red-500/10 border-red-500/30'
                      : rec.priority === 'medium'
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-green-500/10 border-green-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium">{rec.category || rec.type}</div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      rec.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {rec.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{rec.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Potențial economii:</span>
                    <span className="font-semibold text-emerald-400">
                      {Number(rec.potentialSavings ?? 0).toFixed(2)} RON
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anomalies by Category */}
      {anomalyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuție Anomalii</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={anomalyChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {anomalyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function InsightsPage() {
  return (
    <PermissionGuard feature="insights">
      <InsightsContent />
    </PermissionGuard>
  );
}
