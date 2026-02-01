'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Pencil, Trash2, Shield, User as UserIcon, BarChart3, Activity,
  TrendingUp, Users, Database, Download, Ban, CheckCircle, AlertCircle,
  Bell, FileText, Search, Filter, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { invalidatePermissionCache } from '@/lib/permissions';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
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

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'alerts' | 'categories' | 'audit' | 'permissions'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user'
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  // Analytics
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [retentionData, setRetentionData] = useState<any>(null);

  // Alerts
  const [alerts, setAlerts] = useState<any[]>([]);

  // Categories
  const [globalCategories, setGlobalCategories] = useState<any[]>([]);

  // Audit
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Permissions
  const [usersWithPermissions, setUsersWithPermissions] = useState<any[]>([]);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<any>(null);

  useEffect(() => {
    checkAdminAccess();
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users' && (searchQuery || filterRole || filterActive)) {
      loadUsers();
    }
  }, [searchQuery, filterRole, filterActive]);

  const checkAdminAccess = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  };

  const loadData = () => {
    if (activeTab === 'overview') loadStats();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'analytics') loadAnalytics();
    else if (activeTab === 'alerts') loadAlerts();
    else if (activeTab === 'categories') loadGlobalCategories();
    else if (activeTab === 'audit') loadAuditLogs();
    else if (activeTab === 'permissions') loadPermissions();
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?limit=5')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err: any) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterRole && filterRole !== 'all') params.append('role', filterRole);
      if (filterActive && filterActive !== 'all') params.append('active', filterActive);
      
      const response = await api.get(`/admin/users?${params.toString()}`);
      setUsers(response.data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [growthRes, retentionRes] = await Promise.all([
        api.get('/admin/analytics/growth'),
        api.get('/admin/analytics/retention')
      ]);
      setGrowthData(growthRes.data);
      setRetentionData(retentionRes.data);
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      console.error('Error loading global categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/audit-logs?limit=100');
      setAuditLogs(response.data);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/permissions/all');
      setUsersWithPermissions(response.data);
    } catch (err) {
      console.error('Error loading permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      const response = await api.get(`/admin/users/${userId}/permissions`);
      setUserPermissions(response.data);
    } catch (err) {
      console.error('Error loading user permissions:', err);
    }
  };

  const handlePermissionToggle = async (userId: string, feature: string, currentValue: boolean) => {
    try {
      const updatedPermissions = {
        ...userPermissions,
        [feature]: !currentValue,
      };
      
      await api.patch(`/admin/users/${userId}/permissions`, updatedPermissions);
      setUserPermissions(updatedPermissions);
      
      // Invalidate permission cache if updating current user
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser.id === userId) {
        invalidatePermissionCache();
      }
      
      loadPermissions();
    } catch (err) {
      console.error('Error updating permission:', err);
      alert('Failed to update permission');
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
      a.download = `users_${new Date().toISOString().split('T')[0]}.${format}`;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updateData: any = { email: formData.email, name: formData.name, role: formData.role };
        if (formData.password) updateData.password = formData.password;
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
    if (!confirm('Sigur doriți să ștergeți acest utilizator?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleGenerateAlerts = async () => {
    try {
      await api.post('/admin/alerts/generate');
      loadAlerts();
    } catch (err) {
      alert('Failed to generate alerts');
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

  if (loading && activeTab === 'overview') {
    return <div className="text-center py-12">Se încarcă...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Panou Administrare</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitorizare și gestionare sistem</p>
        </div>
        {activeTab === 'alerts' && (
          <Button onClick={handleGenerateAlerts} size="sm" className="w-full sm:w-auto">
            <Activity className="h-4 w-4 mr-2" />
            Generează Alerte
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-white/10 overflow-x-auto scrollbar-hide">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'users', label: 'Utilizatori', icon: Users },
          { id: 'permissions', label: 'Permisiuni', icon: Shield },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'alerts', label: 'Alerte', icon: Bell },
          { id: 'categories', label: 'Categorii', icon: Settings },
          { id: 'audit', label: 'Audit', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 sm:px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap min-h-[44px] ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 inline mr-2" />
              {tab.label}
              {tab.id === 'alerts' && alerts.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-destructive rounded-full">
                  {alerts.length}
                </span>
              )}
            </button>
          );
        })}
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
                {users.slice(0, 5).map((user) => (
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

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters & Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Caută</Label>
                  <Input
                    id="search"
                    placeholder="Email sau nume..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Toate rolurile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filterActive} onValueChange={setFilterActive}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Toate statusurile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate</SelectItem>
                      <SelectItem value="true">Activ</SelectItem>
                      <SelectItem value="false">Suspendat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 items-end">
                  <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button onClick={() => handleExport('json')} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Utilizatori ({users.length})</CardTitle>
                <Button onClick={() => setShowForm(!showForm)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adaugă User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showForm && (
                <form onSubmit={handleSubmit} className="mb-6 p-4 border border-white/10 rounded-lg bg-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Nume</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Parolă {editingId && '(lasă gol pentru a păstra)'}</Label>
                      <Input
                        id="password"
                        type="password"
                        required={!editingId}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="roleSelect">Rol</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger id="roleSelect">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button type="submit" size="sm">
                      {editingId ? 'Actualizează' : 'Creează'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Rol</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Activitate</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Ultima autentificare</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-white/10">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium">{user.name || user.email}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {user.role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <UserIcon className="h-3 w-3 mr-1" />}
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            user.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {user.active ? <CheckCircle className="h-3 w-3 mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
                            {user.active ? 'Activ' : 'Suspendat'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {user._count.transactions} tranzacții
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Niciodată'}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex justify-end gap-2">
                            <Button onClick={() => handleEdit(user)} variant="outline" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleToggleActive(user.id)}
                              variant="outline"
                              size="sm"
                              title={user.active ? 'Suspendă' : 'Activează'}
                            >
                              {user.active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                            <Button onClick={() => handleDelete(user.id)} variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Creștere Utilizatori (12 luni)</CardTitle>
            </CardHeader>
            <CardContent>
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={growthData}>
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
                    <Legend />
                    <Line type="monotone" dataKey="newUsers" stroke="#10b981" name="Utilizatori Noi" />
                    <Line type="monotone" dataKey="activeUsers" stroke="#3b82f6" name="Utilizatori Activi" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nu există date disponibile</p>
              )}
            </CardContent>
          </Card>

          {retentionData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Rata de Retenție (30 zile)</p>
                    <p className="text-3xl font-bold mt-2 text-emerald-400">
                      {retentionData.retention30d?.toFixed(1) || 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Rata de Retenție (60 zile)</p>
                    <p className="text-3xl font-bold mt-2 text-blue-400">
                      {retentionData.retention60d?.toFixed(1) || 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Rata de Retenție (90 zile)</p>
                    <p className="text-3xl font-bold mt-2 text-purple-400">
                      {retentionData.retention90d?.toFixed(1) || 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nu există alerte în acest moment</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className={`border-l-4 ${
                alert.severity === 'critical' ? 'border-l-red-500' :
                alert.severity === 'warning' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                          alert.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {alert.severity.toUpperCase()}
                        </span>
                        {!alert.isRead && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary">
                            NOU
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold mb-1">{alert.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(alert.createdAt)}
                      </p>
                    </div>
                    {!alert.isRead && (
                      <Button
                        onClick={() => handleMarkAlertRead(alert.id)}
                        variant="outline"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marchează citit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base">Categorii Globale</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Template-uri de categorii pentru utilizatori noi
                  </p>
                </div>
                <Button onClick={handleCreateGlobalCategory} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adaugă Categorie
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {globalCategories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există categorii globale
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {globalCategories.map((category) => (
                    <div
                      key={category.id}
                      className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <div className="font-medium">{category.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {category.color}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleDeleteGlobalCategory(category.id)}
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
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jurnal Audit ({auditLogs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există înregistrări în jurnal
                </p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{log.user?.name || log.user?.email || 'System'}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                              {log.action}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {log.entity} {log.entityId && `#${log.entityId}`}
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{formatDate(log.createdAt)}</span>
                            {log.ipAddress && (
                              <>
                                <span>•</span>
                                <span>IP: {log.ipAddress}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestionare Permisiuni Utilizatori</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Users List */}
                <div className="lg:col-span-1">
                  <div className="border border-white/10 rounded-lg divide-y divide-white/10">
                    <div className="p-4 font-medium text-sm bg-white/5">Utilizatori ({usersWithPermissions.length})</div>
                    <div className="max-h-96 overflow-y-auto">
                      {usersWithPermissions.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedUserForPermissions(user.id);
                            loadUserPermissions(user.id);
                          }}
                          className={`w-full text-left p-3 border-b border-white/10 transition-colors last:border-b-0 ${
                            selectedUserForPermissions === user.id
                              ? 'bg-primary/20 border-primary'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="text-sm font-medium">{user.name || user.email}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {user.role === 'admin' ? 'Administrator' : 'Utilizator'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Permissions Editor */}
                <div className="lg:col-span-2">
                  {selectedUserForPermissions && userPermissions ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                        <h3 className="font-medium mb-2">Permisiuni pentru {usersWithPermissions.find(u => u.id === selectedUserForPermissions)?.email}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Funcționalități de bază (Dashboard, Tranzacții, Categorii) sunt întotdeauna active.
                        </p>
                        
                        <div className="space-y-3">
                          {/* Basic Features (Always Enabled) */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-white/80">Funcționalități de Bază (Permanente)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {[
                                { key: 'dashboard', label: 'Tabloul de Bord' },
                                { key: 'transactions', label: 'Tranzacții' },
                                { key: 'categories', label: 'Categorii' },
                              ].map((feature) => (
                                <div key={feature.key} className="p-3 bg-white/5 border border-emerald-500/30 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    <span className="text-sm font-medium">{feature.label}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Additional Features (Configurable) */}
                          <div className="space-y-2 pt-4 border-t border-white/10">
                            <h4 className="text-sm font-semibold text-white/80">Funcționalități Suplimentare</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {[
                                { key: 'budgets', label: 'Bugete' },
                                { key: 'recurring', label: 'Tranzacții Recurente' },
                                { key: 'goals', label: 'Obiective de Economii' },
                                { key: 'investments', label: 'Investiții' },
                                { key: 'subscriptions', label: 'Abonamente' },
                                { key: 'receipts', label: 'Chitanțe' },
                                { key: 'reports', label: 'Rapoarte' },
                                { key: 'insights', label: 'Analize' },
                                { key: 'predictions', label: 'Predicții' },
                                { key: 'banking', label: 'Servicii Bancare' },
                                { key: 'sharedBudgets', label: 'Bugete Partajate' },
                                { key: 'analytics', label: 'Analitică' },
                                { key: 'tax', label: 'Impozite' },
                                { key: 'whiteLabel', label: 'White Label' },
                              ].map((feature) => (
                                <button
                                  key={feature.key}
                                  onClick={() => handlePermissionToggle(selectedUserForPermissions, feature.key, userPermissions[feature.key])}
                                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                                    userPermissions[feature.key]
                                      ? 'bg-blue-500/10 border-blue-500/50'
                                      : 'bg-white/5 border-white/10 opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {userPermissions[feature.key] ? (
                                      <CheckCircle className="h-4 w-4 text-blue-400" />
                                    ) : (
                                      <Ban className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-sm font-medium">{feature.label}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground mt-1 block">
                                    {userPermissions[feature.key] ? 'Activă' : 'Dezactivată'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Selectați un utilizator pentru a vedea și edita permisiunile</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
