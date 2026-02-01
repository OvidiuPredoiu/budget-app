'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Shield, User as UserIcon, BarChart3, Activity, TrendingUp, Users, Database, Download, Ban, CheckCircle, AlertCircle, Bell, FileText, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    categories: number;
    budgets: number;
    transactions: number;
  };
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  avgTransactionsPerUser: number;
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

interface GrowthData {
  month: string;
  newUsers: number;
  activeUsers: number;
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  userId?: string;
  isRead: boolean;
  createdAt: string;
}

interface GlobalCategory {
  id: string;
  name: string;
  color: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity' | 'analytics' | 'alerts' | 'categories' | 'audit'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [globalCategories, setGlobalCategories] = useState<GlobalCategory[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user'
  });

  useEffect(() => {
    checkAdminAccess();
    loadData();
  }, [activeTab]);

  const loadData = () => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'overview') {
      loadStats();
    } else if (activeTab === 'activity') {
      loadActivityLogs();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    } else if (activeTab === 'alerts') {
      loadAlerts();
    } else if (activeTab === 'categories') {
      loadGlobalCategories();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    }
  };

  const checkAdminAccess = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        router.push('/dashboard');
      }
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/activity');
      setActivityLogs(response.data);
    } catch (err: any) {
      console.error('Error loading activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/analytics/growth');
      setGrowthData(response.data);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/alerts');
      setAlerts(response.data);
    } catch (err: any) {
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/categories/global');
      setGlobalCategories(response.data);
    } catch (err: any) {
      console.error('Error loading global categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/audit-logs?limit=50');
      setAuditLogs(response.data);
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterRole) params.append('role', filterRole);
      if (filterActive) params.append('active', filterActive);
      
      const response = await api.get(`/admin/users?${params.toString()}`);
      setUsers(response.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        router.push('/dashboard');
      }
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await api.get(`/admin/users/export?format=${format}`, {
        responseType: format === 'csv' ? 'text' : 'json'
      });
      
      const blob = new Blob(
        [format === 'csv' ? response.data : JSON.stringify(response.data, null, 2)],
        { type: format === 'csv' ? 'text/csv' : 'application/json' }
      );
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export data');
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle-active`);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to toggle user status');
    }
  };

  const handleGenerateAlerts = async () => {
    try {
      await api.post('/admin/alerts/generate');
      loadAlerts();
    } catch (err) {
      console.error('Failed to generate alerts:', err);
    }
  };

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      await api.patch(`/admin/alerts/${alertId}/read`);
      loadAlerts();
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const handleCreateGlobalCategory = async () => {
    const name = prompt('Nume categorie:');
    const color = prompt('Culoare (#hex):', '#3b82f6');
    
    if (name) {
      try {
        await api.post('/admin/categories/global', { name, color });
        loadGlobalCategories();
      } catch (err) {
        alert('Failed to create category');
      }
    }
  };

  const handleDeleteGlobalCategory = async (id: string) => {
    if (confirm('Șterge categorie globală?')) {
      try {
        await api.delete(`/admin/categories/global/${id}`);
        loadGlobalCategories();
      } catch (err) {
        alert('Failed to delete category');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updateData: any = {
          email: formData.email,
          name: formData.name,
          role: formData.role,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.patch(`/admin/users/${editingId}`, updateData);
      } else {
        await api.post('/admin/users', formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ email: '', password: '', name: '', role: 'user' });
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      email: user.email,
      password: '',
      name: user.name || '',
      role: user.role
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți acest utilizator? Toate datele sale vor fi șterse.')) {
      return;
    }
    try {
      await api.delete(`/admin/users/${id}`);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Se încarcă...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Panou Administrare</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitorizare și gestionare sistem</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-white/10 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 sm:px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap min-h-[44px] ${
            activeTab === 'overview'
              ? 'text-primary border-b-2 border-primary -mb-px'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="h-4 w-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 sm:px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap min-h-[44px] ${
            activeTab === 'users'
              ? 'text-primary border-b-2 border-primary -mb-px'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Utilizatori
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 sm:px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap min-h-[44px] ${
            activeTab === 'activity'
              ? 'text-primary border-b-2 border-primary -mb-px'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="h-4 w-4 inline mr-2" />
          Activitate
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Utilizatori</p>
                    <p className="text-2xl font-bold mt-2">{stats.totalUsers}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.activeUsers} activi (luna curentă)
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tranzacții</p>
                    <p className="text-2xl font-bold mt-2">{stats.totalTransactions}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Medie {stats.avgTransactionsPerUser.toFixed(1)} / user
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Database className="h-6 w-6 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Volum Total</p>
                    <p className="text-xl font-bold mt-2 text-emerald-400">
                      +{formatCurrency(stats.totalIncome)}
                    </p>
                    <p className="text-xl font-bold text-destructive">
                      -{formatCurrency(stats.totalExpense)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Utilizatori (după activitate)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users
                  .sort((a, b) => b._count.transactions - a._count.transactions)
                  .slice(0, 5)
                  .map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{user.name || user.email}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{user._count.transactions} tranzacții</div>
                        <div className="text-xs text-muted-foreground">
                          {user._count.budgets} bugete • {user._count.categories} categorii
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activitate Recentă</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLogs.length > 0 ? (
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{log.action}</div>
                      <div className="text-xs text-muted-foreground mt-1">{log.details}</div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{log.userName || log.userEmail}</span>
                        <span>•</span>
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nu există activitate înregistrată
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold">Administrare Utilizatori</h2>
              <p className="text-sm text-muted-foreground mt-1">Gestionați utilizatorii și accesul lor</p>
            </div>
            <Button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData({ email: '', password: '', name: '', role: 'user' });
              }}
              size="sm"
              className="h-10 sm:h-9 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Utilizator Nou
            </Button>
          </div>

          {showForm && (
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-base font-medium">
              {editingId ? 'Editare Utilizator' : 'Utilizator Nou'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nume</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Parolă {editingId ? '(opțional - lasă gol pentru a păstra)' : '*'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingId}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-gray-700">Rol *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Utilizator</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" size="sm" className="h-9">
                  {editingId ? 'Actualizează' : 'Creează'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ email: '', password: '', name: '', role: 'user' });
                  }}
                >
                  Anulează
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilizator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Categorii</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bugete</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tranzacții</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Înregistrat</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{user.name || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'admin' ? (
                        <>
                          <Shield className="h-3 w-3" />
                          Admin
                        </>
                      ) : (
                        <>
                          <UserIcon className="h-3 w-3" />
                          User
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {user._count.categories}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {user._count.budgets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {user._count.transactions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-primary hover:text-primary/80"
                        title="Editează"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Șterge"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {users.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nu există utilizatori în sistem
        </div>
      )}
        </div>
      )}
    </div>
  );
}
