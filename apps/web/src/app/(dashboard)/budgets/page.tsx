'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { formatCurrency, formatMonth } from '@/lib/utils';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface Budget {
  id: string;
  name?: string | null;
  month: string;
  amount: number;
  categoryId: string;
  category: Category;
  spent?: number;
  remaining?: number;
  percentage?: number;
}

function BudgetsContent() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formData, setFormData] = useState({
    name: '',
    month: selectedMonth,
    amount: '',
    categoryId: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [selectedMonth]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/budgets?month=${selectedMonth}`);
      setBudgets(response.data);
    } catch (err) {
      console.error('Error loading budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name.trim()) {
        alert('Introdu un nume pentru buget');
        return;
      }
      if (!formData.categoryId) {
        alert('Selectează o categorie');
        return;
      }
      const amountValue = parseFloat(formData.amount);
      if (Number.isNaN(amountValue) || amountValue <= 0) {
        alert('Introdu o sumă validă');
        return;
      }
      const data = {
        ...formData,
        amount: amountValue
      };
      if (editingId) {
        await api.put(`/budgets/${editingId}`, data);
      } else {
        await api.post('/budgets', data);
      }
      setFormData({ name: '', month: selectedMonth, amount: '', categoryId: '' });
      setShowForm(false);
      setEditingId(null);
      loadBudgets();
    } catch (err: any) {
      console.error('Error saving budget:', err);
      const message = err?.response?.data?.error || 'Eroare la salvare buget';
      alert(typeof message === 'string' ? message : JSON.stringify(message));
    }
  };

  const handleEdit = (budget: Budget) => {
    setFormData({
      name: budget.name || '',
      month: budget.month,
      amount: budget.amount.toString(),
      categoryId: budget.categoryId
    });
    setEditingId(budget.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți acest buget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      loadBudgets();
    } catch (err) {
      console.error('Error deleting budget:', err);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', month: selectedMonth, amount: '', categoryId: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
                    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    
    for (let i = -6; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">Bugete</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
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
          {!showForm && (
            <Button size="sm" className="h-10 sm:h-9 w-full sm:w-auto" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adaugă Buget
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-sm font-medium text-gray-900">{editingId ? 'Editează Buget' : 'Buget Nou'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nume Buget</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="month">Lună</Label>
                <Select value={formData.month} onValueChange={(value) => setFormData({ ...formData, month: value })}>
                  <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categorie</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectați categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Sumă (Lei)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="w-full sm:w-auto">Salvează</Button>
                <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                  Anulează
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {budgets.map((budget) => {
          const percentage = budget.percentage || 0;
          const spent = budget.spent || 0;
          const remaining = budget.remaining || budget.amount;
          const isOverBudget = percentage > 100;
          
          return (
            <Card key={budget.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: budget.category.color || '#3b82f6' }}
                      >
                        <span className="text-white text-sm font-bold">
                          {budget.category.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{budget.name || budget.category.name}</div>
                        <div className="text-xs text-gray-500">{formatMonth(budget.month)}</div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(budget)} className="h-9 w-9">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(budget.id)} className="h-9 w-9">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Cheltuit</span>
                      <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isOverBudget
                            ? 'bg-red-500'
                            : percentage > 80
                            ? 'bg-yellow-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Budget Details */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cheltuit:</span>
                      <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(spent)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Buget:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(budget.amount)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className={`font-medium ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {remaining < 0 ? 'Depășit cu:' : 'Rămas:'}
                      </span>
                      <span className={`font-semibold ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatCurrency(Math.abs(remaining))}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {budgets.length === 0 && !showForm && (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center text-gray-500">
            Nu aveți bugete pentru {formatMonth(selectedMonth)}. Adăugați unul pentru a începe.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function BudgetsPage() {
  return (
    <PermissionGuard feature="budgets">
      <BudgetsContent />
    </PermissionGuard>
  );
}
