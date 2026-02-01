'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  status: string;
  nextBillingDate: string;
}

interface Analytics {
  subscriptions: Subscription[];
  currentMonthTotal: number;
  annualTotal: number;
}

function SubscriptionsContent() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    paymentMethod: 'card'
  });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const [subsRes, analyticsRes] = await Promise.all([
        api.get('/subscriptions'),
        api.get('/subscriptions/analytics/monthly')
      ]);
      setSubscriptions(subsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/subscriptions', {
        ...formData,
        amount: parseFloat(formData.amount),
        nextBillingDate: new Date().toISOString()
      });
      loadSubscriptions();
      setShowForm(false);
      setFormData({ name: '', amount: '', frequency: 'monthly', paymentMethod: 'card' });
    } catch (err) {
      alert('Failed to create subscription');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirm cancellation?')) return;
    try {
      await api.delete(`/subscriptions/${id}`);
      loadSubscriptions();
    } catch (err) {
      alert('Failed to cancel');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Abonamente</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestionează abonamentele recurente</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nou Abonament
        </Button>
      </div>

      {/* Cost Summary */}
      {analytics && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">Cost lunar</div>
              <div className="text-2xl font-bold text-emerald-400 mt-2">
                {formatCurrency(analytics.currentMonthTotal)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">Cost anual estimat</div>
              <div className="text-2xl font-bold text-cyan-400 mt-2">
                {formatCurrency(analytics.annualTotal)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adaugă Abonament</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Nume</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Netflix"
                  required
                />
              </div>
              <div>
                <Label htmlFor="amount">Preț (RON)</Label>
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
                <Label htmlFor="frequency">Frecvență</Label>
                <select
                  id="frequency"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                >
                  <option value="monthly">Lunar</option>
                  <option value="yearly">Anual</option>
                  <option value="weekly">Săptămânal</option>
                </select>
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

      {/* List */}
      <div className="space-y-3">
        {subscriptions.map((sub) => (
          <Card key={sub.id}>
            <CardContent className="pt-6 flex justify-between items-center">
              <div>
                <div className="font-semibold">{sub.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1)}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-emerald-400">{formatCurrency(sub.amount)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {new Date(sub.nextBillingDate).toLocaleDateString('ro-RO')}
                  </div>
                </div>
                <Button
                  onClick={() => handleDelete(sub.id)}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <PermissionGuard feature="subscriptions">
      <SubscriptionsContent />
    </PermissionGuard>
  );
}
