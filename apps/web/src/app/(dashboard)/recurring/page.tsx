'use client';

import { useEffect, useState } from 'react';
import { Repeat2, Plus, Trash2, PlayCircle, Calendar, DollarSign, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { PermissionGuard } from '@/components/PermissionGuard';

interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  frequency: string;
  category: { name: string; color?: string } | null;
  startDate: string;
  endDate?: string;
  lastRunDate?: string;
  isActive: boolean;
}

interface UpcomingTransaction {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  nextRunDate: string;
  daysUntilRun: number;
  category: { name: string; color?: string } | null;
  isActive: boolean;
}

function RecurringContent() {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingTransaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    frequency: 'monthly',
    categoryId: '',
    paymentMethod: 'card',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  useEffect(() => {
    loadRecurring();
    loadUpcoming();
    loadCategories();
  }, []);

  const loadRecurring = async () => {
    try {
      setLoading(true);
      const response = await api.get('/recurring?active=true');
      setRecurring(response.data);
    } catch (err) {
      console.error('Error loading recurring:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUpcoming = async () => {
    try {
      const response = await api.get('/recurring/upcoming/list?days=30');
      setUpcoming(response.data);
    } catch (err) {
      console.error('Error loading upcoming:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/recurring', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      setRecurring([response.data, ...recurring]);
      setShowForm(false);
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        frequency: 'monthly',
        categoryId: '',
        paymentMethod: 'card',
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
      });
      loadUpcoming();
    } catch (err) {
      alert('Failed to create recurring transaction');
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      await api.post(`/recurring/${id}/run`);
      alert('Transaction executed!');
      loadRecurring();
      loadUpcoming();
    } catch (err) {
      alert('Failed to execute transaction');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ștergi tranzacția recurentă?')) return;
    try {
      await api.delete(`/recurring/${id}`);
      setRecurring(recurring.filter(r => r.id !== id));
      loadUpcoming();
    } catch (err) {
      alert('Failed to delete transaction');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/recurring/${id}`, { isActive: !isActive });
      loadRecurring();
    } catch (err) {
      alert('Failed to update transaction');
    }
  };

  // Calculate monthly impact
  const monthlyImpact = recurring.reduce((acc, tx) => {
    const multiplier = tx.frequency === 'daily' ? 30 : tx.frequency === 'weekly' ? 4.33 : tx.frequency === 'biweekly' ? 2 : tx.frequency === 'yearly' ? 1/12 : 1;
    const monthlyAmount = tx.amount * multiplier;
    return tx.type === 'income' ? acc + monthlyAmount : acc - monthlyAmount;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Tranzacții Recurente</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestionează plăți și venituri recurente</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nou Recurent
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nou Recurent</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRecurring} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Descriere</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="ex: Chirie"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Suma (RON)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
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
                      <SelectItem value="income">Venit</SelectItem>
                      <SelectItem value="expense">Cheltuială</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="frequency">Frecvență</Label>
                  <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Zilnic</SelectItem>
                      <SelectItem value="weekly">Săptămânal</SelectItem>
                      <SelectItem value="biweekly">Bi-săptămânal</SelectItem>
                      <SelectItem value="monthly">Lunar</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Categorie</Label>
                  <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Alege categorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
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
              </div>
              <div className="flex gap-2">
                <Button type="submit">Creează</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Anulează
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Monthly Impact */}
      {recurring.length > 0 && (
        <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impactul Lunar Estimat</p>
                <p className={`text-3xl font-bold mt-2 ${monthlyImpact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {monthlyImpact >= 0 ? '+' : ''}{formatCurrency(monthlyImpact)}
                </p>
              </div>
              <Repeat2 className="h-12 w-12 text-emerald-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Urmează în 30 de zile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcoming.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (tx.category?.color || '#6366f1') + '20' }}>
                      <Calendar className="h-5 w-5" style={{ color: tx.category?.color || '#6366f1' }} />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{tx.description}</div>
                      <div className="text-xs text-muted-foreground">{tx.category?.name || 'Fără categorie'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(tx.amount)}</div>
                    <div className="text-xs text-muted-foreground">{tx.daysUntilRun} zile</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Recurring Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tranzacții Active ({recurring.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Se încarcă...</p>
          ) : recurring.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Niciun tranzacție recurentă</p>
          ) : (
            <div className="space-y-3">
              {recurring.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: (tx.category?.color || '#6366f1') + '20' }}
                    >
                      <Repeat2 className="h-5 w-5" style={{ color: tx.category?.color || '#6366f1' }} />
                    </div>
                    <div>
                      <div className="font-medium">{tx.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {tx.category?.name || 'Fără categorie'} • {tx.frequency}
                      </div>
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <div className={`font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">Ultima: {tx.lastRunDate ? formatDate(tx.lastRunDate) : 'Niciodată'}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleRunNow(tx.id)}
                      variant="outline"
                      size="sm"
                      title="Rulează acum"
                    >
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleToggleActive(tx.id, tx.isActive)}
                      variant="outline"
                      size="sm"
                    >
                      {tx.isActive ? 'Activ' : 'Inactiv'}
                    </Button>
                    <Button
                      onClick={() => handleDelete(tx.id)}
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

export default function RecurringPage() {
  return (
    <PermissionGuard feature="recurring">
      <RecurringContent />
    </PermissionGuard>
  );
}
