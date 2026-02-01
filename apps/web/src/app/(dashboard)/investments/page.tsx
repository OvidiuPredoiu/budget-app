'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Investment {
  id: string;
  name: string;
  symbol: string;
  type: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: string;
}

interface Performance {
  totalInvested: number;
  totalCurrent: number;
  totalGain: number;
  totalGainPercent: number;
  performance: any[];
}

function InvestmentsContent() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    type: 'stock',
    symbol: '',
    quantity: '',
    purchasePrice: '',
    currency: 'USD'
  });

  useEffect(() => {
    loadInvestments();
  }, []);

  const loadInvestments = async () => {
    try {
      setLoading(true);
      const [invRes, perfRes] = await Promise.all([
        api.get('/investments'),
        api.get('/investments/performance/summary')
      ]);
      setInvestments(invRes.data);
      setPerformance(perfRes.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/investments', formData);
      loadInvestments();
      setShowForm(false);
      setFormData({ name: '', type: 'stock', symbol: '', quantity: '', purchasePrice: '', currency: 'USD' });
    } catch (err) {
      alert('Failed to add investment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove investment?')) return;
    try {
      await api.delete(`/investments/${id}`);
      loadInvestments();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Portofoliu Investiții</h1>
          <p className="text-sm text-muted-foreground mt-1">Urmărire investiții și performanță</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adaugă Investiție
        </Button>
      </div>

      {/* Performance Overview */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">Valoare investită</div>
              <div className="text-2xl font-bold mt-2">
                {formatCurrency(performance.totalInvested)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">Valoare curentă</div>
              <div className="text-2xl font-bold text-cyan-400 mt-2">
                {formatCurrency(performance.totalCurrent)}
              </div>
            </CardContent>
          </Card>
          <Card className={performance.totalGain >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">Profit/Pierdere</div>
              <div className={`text-2xl font-bold mt-2 ${performance.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(performance.totalGain)} ({performance.totalGainPercent.toFixed(2)}%)
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adaugă Investiție</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nume</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: Apple Inc"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="symbol">Simbol</Label>
                  <Input
                    id="symbol"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    placeholder="AAPL"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Cantitate</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Preț de cumpărare</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Adaugă</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Anulează
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Investments List */}
      <div className="space-y-3">
        {investments.map((inv) => {
          const perf = performance?.performance.find(p => p.name === inv.name);
          return (
            <Card key={inv.id} className={perf?.gain >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}>
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{inv.symbol}</div>
                  <div className="text-xs text-muted-foreground">{inv.name}</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Cantitate: </span>
                    <span className="font-semibold">{inv.quantity} {inv.currency}</span>
                  </div>
                  <div className={`font-bold ${perf?.gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {perf ? formatCurrency(perf.currentAmount) : formatCurrency(inv.quantity * inv.currentPrice)}
                  </div>
                </div>
                <Button
                  onClick={() => handleDelete(inv.id)}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function InvestmentsPage() {
  return (
    <PermissionGuard feature="investments">
      <InvestmentsContent />
    </PermissionGuard>
  );
}
