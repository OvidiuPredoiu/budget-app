'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface Goal {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  paymentMethod: string;
  cardType?: string;
  merchant?: string;
  note?: string;
  categoryId: string;
  category: Category;
  goalId?: string | null;
  goal?: Goal | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    type: 'expense',
    paymentMethod: 'card',
    cardType: 'debit',
    merchant: '',
    note: '',
    categoryId: '',
    goalId: ''
  });

  useEffect(() => {
    loadCategories();
    loadGoals();
  }, []);

  useEffect(() => {
    loadTransactions();
    setCurrentPage(1);
  }, [filterMonth]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadGoals = async () => {
    try {
      const response = await api.get('/goals');
      setGoals(response.data);
    } catch (err) {
      console.error('Error loading goals:', err);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/transactions?month=${filterMonth}`);
      setTransactions(response.data);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetMonth = formData.date.slice(0, 7);
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        cardType: formData.paymentMethod === 'card' ? formData.cardType : undefined,
        goalId: formData.goalId || undefined
      };
      
      if (editingId) {
        await api.put(`/transactions/${editingId}`, data);
      } else {
        await api.post('/transactions', data);
      }
      resetForm();
      if (targetMonth !== filterMonth) {
        setFilterMonth(targetMonth);
      } else {
        loadTransactions();
      }
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      const errorMsg = err.response?.data?.error || 'Eroare la salvare';
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setFormData({
      date: new Date(transaction.date).toISOString().split('T')[0],
      amount: transaction.amount.toString(),
      type: transaction.type,
      paymentMethod: transaction.paymentMethod,
      cardType: transaction.cardType || 'debit',
      merchant: transaction.merchant || '',
      note: transaction.note || '',
      categoryId: transaction.categoryId,
      goalId: transaction.goalId || ''
    });
    setEditingId(transaction.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți această tranzacție?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      loadTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      type: 'expense',
      paymentMethod: 'card',
      cardType: 'debit',
      merchant: '',
      note: '',
      categoryId: '',
      goalId: ''
    });
    setEditingId(null);
    setShowForm(false);
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

  const filteredTransactions = transactions
    .filter((t) => {
      if (activeTab === 'expense') return t.type === 'expense';
      if (activeTab === 'income') return t.type === 'income';
      if (activeTab === 'transfer') return t.type === 'transfer';
      return false;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const getTabLabel = (type: 'expense' | 'income' | 'transfer') => {
    const count = transactions.filter((t) => t.type === type).length;
    if (type === 'expense') return `Cheltuieli (${count})`;
    if (type === 'income') return `Venituri (${count})`;
    if (type === 'transfer') return `Transferuri (${count})`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">Tranzacții</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
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
              <span className="hidden sm:inline">Adaugă Tranzacție</span>
              <span className="sm:hidden">Nou</span>
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-sm font-medium text-gray-900">{editingId ? 'Editează Tranzacție' : 'Tranzacție Nouă'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
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
                <div className="space-y-2">
                  <Label htmlFor="type">Tip</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Venit</SelectItem>
                      <SelectItem value="expense">Cheltuială</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
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
                  <Label htmlFor="goalId">Obiectiv (opțional)</Label>
                  <Select value={formData.goalId || 'none'} onValueChange={(value) => setFormData({ ...formData, goalId: value === 'none' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Fără obiectiv" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Fără obiectiv</SelectItem>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Metodă Plată</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cash">Numerar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.paymentMethod === 'card' && (
                  <div className="space-y-2">
                    <Label htmlFor="cardType">Tip Card</Label>
                    <Select value={formData.cardType} onValueChange={(value) => setFormData({ ...formData, cardType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="virtual">Virtual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="merchant">Comerciant (opțional)</Label>
                  <Input
                    id="merchant"
                    value={formData.merchant}
                    onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="note">Notă (opțional)</Label>
                  <Input
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="w-full sm:w-auto">Salvează</Button>
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">
                  Anulează
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabs pentru categorii */}
      <div className="flex space-x-1 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('expense')}
          className={`px-4 sm:px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap min-h-[44px] ${
            activeTab === 'expense'
              ? 'text-primary border-b-2 border-primary -mb-px'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {getTabLabel('expense')}
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`px-4 sm:px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap min-h-[44px] ${
            activeTab === 'income'
              ? 'text-primary border-b-2 border-primary -mb-px'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {getTabLabel('income')}
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`px-4 sm:px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap min-h-[44px] ${
            activeTab === 'transfer'
              ? 'text-primary border-b-2 border-primary -mb-px'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {getTabLabel('transfer')}
        </button>
      </div>

      {/* Lista tranzacții */}
      <div className="space-y-3">
        {paginatedTransactions.map((transaction) => (
          <Card key={transaction.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="py-3 sm:py-4">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: transaction.category.color || '#3b82f6' }}
                  >
                    <span className="text-white text-sm font-bold">
                      {transaction.category.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{transaction.category.name}</span>
                      {transaction.merchant && (
                        <span className="text-xs text-gray-500 truncate">• {transaction.merchant}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <div className="flex flex-wrap gap-x-2">
                        <span>{formatDate(transaction.date)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{
                          transaction.type === 'expense' 
                            ? 'Cheltuială'
                            : transaction.type === 'income'
                              ? 'Venit'
                              : 'Transfer'
                        }</span>
                      </div>
                      {transaction.note && (
                        <span className="text-xs text-gray-500 block sm:inline mt-1 sm:mt-0"> • {transaction.note}</span>
                      )}
                      {transaction.goal && (
                        <span className="text-xs text-emerald-600 block sm:inline mt-1 sm:mt-0"> • Obiectiv: {transaction.goal.name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 shrink-0">
                  <span className={`text-sm sm:text-base font-semibold whitespace-nowrap ${
                    transaction.type === 'income' 
                      ? 'text-green-600'
                      : transaction.type === 'expense'
                        ? 'text-red-600'
                        : 'text-blue-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                    {formatCurrency(transaction.amount)}
                  </span>
                  <div className="flex space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(transaction)} className="h-9 w-9">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(transaction.id)} className="h-9 w-9">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {paginatedTransactions.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center text-gray-500">
              {activeTab === 'expense' && 'Nu aveți cheltuieli în această lună.'}
              {activeTab === 'income' && 'Nu aveți venituri în această lună.'}
              {activeTab === 'transfer' && 'Nu aveți transferuri în această lună.'}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Înapoi
          </Button>
          <span className="text-sm text-gray-500 font-medium">
            Pagina {currentPage} din {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Înainte
          </Button>
        </div>
      )}

      {transactions.length === 0 && !showForm && (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center text-gray-500">
            Nu aveți tranzacții în această lună. Adăugați una pentru a începe.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
