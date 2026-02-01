'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, TrendingDown, DollarSign, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGuard } from '@/components/PermissionGuard';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface SharedBudget {
  id: string;
  name: string;
  totalAmount: number;
  spent: number;
  remaining: number;
  createdBy: string;
  members: Array<{ id: string; email: string }>;
  isActive: boolean;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
  reason: string;
}

function SharedBudgetsContent() {
  const [budgets, setBudgets] = useState<SharedBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    totalAmount: '',
    members: ''
  });

  const [expenseData, setExpenseData] = useState({
    amount: '',
    category: '',
    description: '',
    paidBy: '',
    splitAmong: [] as string[]
  });

  useEffect(() => {
    loadBudgets();
  }, []);

  useEffect(() => {
    if (selectedBudget) {
      loadSettlements(selectedBudget);
    }
  }, [selectedBudget]);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shared-budgets');
      setBudgets(response.data);
    } catch (err) {
      console.error('Error loading budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettlements = async (budgetId: string) => {
    try {
      const response = await api.get(`/shared-budgets/${budgetId}/settlements`);
      setSettlements(response.data);
    } catch (err) {
      console.error('Error loading settlements:', err);
    }
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/shared-budgets', {
        name: formData.name,
        totalAmount: parseFloat(formData.totalAmount),
        members: formData.members.split(',').map(m => m.trim())
      });
      setBudgets([response.data, ...budgets]);
      setShowForm(false);
      setFormData({ name: '', totalAmount: '', members: '' });
    } catch (err) {
      alert('Failed to create shared budget');
    }
  };

  const handleAddExpense = async () => {
    if (!selectedBudget || !expenseData.amount || !expenseData.paidBy) {
      alert('Please fill all fields');
      return;
    }
    try {
      await api.post(`/shared-budgets/${selectedBudget}/expenses`, {
        amount: parseFloat(expenseData.amount),
        category: expenseData.category,
        description: expenseData.description,
        paidBy: expenseData.paidBy,
        splitAmong: expenseData.splitAmong
      });
      loadBudgets();
      loadSettlements(selectedBudget);
      setExpenseData({
        amount: '',
        category: '',
        description: '',
        paidBy: '',
        splitAmong: []
      });
    } catch (err) {
      alert('Failed to add expense');
    }
  };

  const handleSetttle = async (fromUserId: string, toUserId: string, amount: number) => {
    if (!selectedBudget) return;
    try {
      await api.post(`/shared-budgets/${selectedBudget}/settle`, {
        fromUserId,
        toUserId,
        amount
      });
      loadSettlements(selectedBudget);
      alert('Settlement recorded!');
    } catch (err) {
      alert('Failed to record settlement');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Bugete Partajate</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestionează cheltuieli cu alți oameni</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nou Buget Partajat
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Creează Buget Partajat</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <Label htmlFor="name">Nume Buget</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Vacanță familie"
                  required
                />
              </div>
              <div>
                <Label htmlFor="amount">Suma Totală (RON)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="members">Membri (email-uri separate prin virgulă)</Label>
                <Input
                  id="members"
                  value={formData.members}
                  onChange={(e) => setFormData({ ...formData, members: e.target.value })}
                  placeholder="user1@example.com, user2@example.com"
                  required
                />
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

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.map((budget) => {
          const percentSpent = (budget.spent / budget.totalAmount) * 100;
          return (
            <Card
              key={budget.id}
              className={`cursor-pointer transition-all border-2 ${
                selectedBudget === budget.id ? 'border-emerald-500' : 'border-white/10'
              }`}
              onClick={() => setSelectedBudget(budget.id)}
            >
              <CardHeader>
                <CardTitle className="text-base">{budget.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Cheltuiți</span>
                    <span className="font-semibold">{Math.round(percentSpent)}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                      style={{ width: `${Math.min(percentSpent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Amount Info */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-muted-foreground">Cheltuiți</div>
                    <div className="font-semibold text-red-400 text-sm mt-1">
                      {formatCurrency(budget.spent)}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-muted-foreground">Rămas</div>
                    <div className="font-semibold text-emerald-400 text-sm mt-1">
                      {formatCurrency(budget.remaining)}
                    </div>
                  </div>
                </div>

                {/* Members */}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {budget.members.length} membri
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Panel */}
      {selectedBudget && (
        <>
          {/* Add Expense */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adaugă Cheltuială</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expAmount">Suma (RON)</Label>
                  <Input
                    id="expAmount"
                    type="number"
                    value={expenseData.amount}
                    onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="expDesc">Descriere</Label>
                  <Input
                    id="expDesc"
                    value={expenseData.description}
                    onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                    placeholder="ex: Cina la restaurant"
                  />
                </div>
              </div>
              <Button onClick={handleAddExpense} className="w-full gap-2">
                <DollarSign className="h-4 w-4" />
                Adaugă Cheltuială
              </Button>
            </CardContent>
          </Card>

          {/* Settlements */}
          {settlements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Decontări Necesare</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {settlements.map((settlement, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm">
                            {settlement.from} → {settlement.to}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {settlement.reason}
                          </div>
                        </div>
                        <div className="font-bold text-emerald-400">
                          {formatCurrency(settlement.amount)}
                        </div>
                      </div>
                      <Button
                        onClick={() =>
                          handleSetttle(
                            settlement.from,
                            settlement.to,
                            settlement.amount
                          )
                        }
                        size="sm"
                        className="w-full gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Marchează ca Reglat
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {budgets.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Niciun buget partajat. Creează-ți primul!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SharedBudgetsPage() {
  return (
    <PermissionGuard feature="sharedBudgets">
      <SharedBudgetsContent />
    </PermissionGuard>
  );
}
