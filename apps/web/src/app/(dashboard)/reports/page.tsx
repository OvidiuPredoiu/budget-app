'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Trash2, Plus, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Report {
  id: string;
  title: string;
  type: string;
  format: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
}

function ReportsContent() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [comparing, setComparing] = useState<'yearly' | 'monthly' | null>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    type: 'monthly',
    format: 'pdf',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadReports();
    loadComparison();
    loadBreakdown();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports');
      setReports(response.data);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadComparison = async () => {
    try {
      const response = await api.get('/reports/comparison/yearly?year=' + new Date().getFullYear());
      setComparisonData(response.data);
    } catch (err) {
      console.error('Error loading comparison:', err);
    }
  };

  const loadBreakdown = async () => {
    try {
      const response = await api.get('/reports/categories-breakdown');
      setBreakdown(response.data);
    } catch (err) {
      console.error('Error loading breakdown:', err);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/reports', formData);
      setReports([response.data, ...reports]);
      setShowForm(false);
      setFormData({
        title: '',
        type: 'monthly',
        format: 'pdf',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      alert('Failed to generate report');
    }
  };

  const handleDownload = async (reportId: string, format: string) => {
    try {
      const response = await api.get(`/reports/${reportId}`, {
        responseType: format === 'pdf' ? 'blob' : 'json'
      });

      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : format === 'csv' ? 'text/csv' : 'application/json'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportId}.${format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download report');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ștergi raportul?')) return;
    try {
      await api.delete(`/reports/${id}`);
      setReports(reports.filter(r => r.id !== id));
    } catch (err) {
      alert('Failed to delete report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Rapoarte</h1>
          <p className="text-sm text-muted-foreground mt-1">Exportă și analizează datele financiare</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Genereaza Raport
        </Button>
      </div>

      {/* Generate Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nou Raport</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Titlu</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="ex: Raport Ianuarie 2026"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tip</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Lunar</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Data Inceput</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data Sfarsit</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="format">Format</Label>
                  <Select value={formData.format} onValueChange={(value) => setFormData({ ...formData, format: value })}>
                    <SelectTrigger id="format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Genereaza</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Anuleaza</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Yearly Comparison */}
      {comparisonData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Comparație Anuală
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparisonData.map((month: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{month.month}</div>
                    <div className="text-xs text-muted-foreground">
                      Venituri: {month.income.toFixed(2)} RON | Cheltuieli: {month.expense.toFixed(2)} RON
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${month.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {month.net >= 0 ? '+' : ''}{month.net.toFixed(2)} RON
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {breakdown && breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breakdown pe Categorii</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {breakdown.map((cat: any) => (
                <div key={cat.categoryName} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.categoryColor }}
                    />
                    <div className="font-medium">{cat.categoryName}</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Venituri:</span>
                      <span className="text-emerald-400">{cat.income.toFixed(2)} RON</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cheltuieli:</span>
                      <span className="text-red-400">{cat.expense.toFixed(2)} RON</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tranzacții:</span>
                      <span>{cat.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rapoarte Generate</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Se încarcă...</p>
          ) : reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Niciun raport generat încă</p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{report.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {report.type} • {formatDate(report.startDate)} - {formatDate(report.endDate)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(report.id, report.format)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(report.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <PermissionGuard feature="reports">
      <ReportsContent />
    </PermissionGuard>
  );
}
