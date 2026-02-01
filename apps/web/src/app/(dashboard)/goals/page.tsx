'use client';

import { useEffect, useState } from 'react';
import { Target, Plus, Trash2, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  color?: string;
  icon?: string;
  description?: string;
  progress: number;
  remaining: number;
  daysRemaining?: number | null;
}

interface Milestone {
  percentage: number;
  name: string;
  reached: boolean;
}

function GoalsContent() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [contributionAmount, setContributionAmount] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
    color: '#10b981',
    icon: '🎯',
    description: ''
  });

  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    if (selectedGoal) {
      loadMilestones(selectedGoal);
    }
  }, [selectedGoal]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/goals');
      setGoals(response.data);
    } catch (err) {
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMilestones = async (goalId: string) => {
    try {
      const response = await api.get(`/goals/milestones/${goalId}`);
      setMilestones(response.data);
    } catch (err) {
      console.error('Error loading milestones:', err);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/goals', {
        ...formData,
        targetAmount: parseFloat(formData.targetAmount)
      });
      setGoals([...goals, response.data]);
      setShowForm(false);
      setFormData({
        name: '',
        targetAmount: '',
        deadline: '',
        color: '#10b981',
        icon: '🎯',
        description: ''
      });
    } catch (err) {
      alert('Failed to create goal');
    }
  };

  const handleContribute = async () => {
    if (!selectedGoal || !contributionAmount) return;
    try {
      const response = await api.patch(`/goals/${selectedGoal}/contribute`, {
        amount: parseFloat(contributionAmount)
      });
      setGoals(goals.map(g => g.id === selectedGoal ? response.data : g));
      setContributionAmount('');
      if (response.data.progress >= 100) {
        alert('🎉 Bravo! Ai atins obiectivul!');
      }
    } catch (err) {
      alert('Failed to contribute');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ștergi obiectivul?')) return;
    try {
      await api.delete(`/goals/${id}`);
      setGoals(goals.filter(g => g.id !== id));
      setSelectedGoal(null);
    } catch (err) {
      alert('Failed to delete goal');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Obiective de Economii</h1>
          <p className="text-sm text-muted-foreground mt-1">Setează și urmărește-ți obiectivele financiare</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nou Obiectiv
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Creează Obiectiv</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nume</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: Vacanță în Bali"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="target">Suma Țintă (RON)</Label>
                  <Input
                    id="target"
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    placeholder="5000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="color">Culoare</Label>
                  <div className="flex gap-2 mt-1">
                    {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          formData.color === color ? 'border-white' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Descriere (opțional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalii despre obiectiv..."
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

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => (
          <Card
            key={goal.id}
            className={`cursor-pointer transition-all border-2 ${
              selectedGoal === goal.id ? 'border-emerald-500' : 'border-white/10'
            }`}
            onClick={() => setSelectedGoal(goal.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{goal.name}</CardTitle>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>
                  )}
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(goal.id);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Progres</span>
                  <span className="font-semibold">{Math.round(goal.progress)}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Amount Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-muted-foreground">Economisit</div>
                  <div className="font-semibold text-emerald-400 mt-1">
                    {formatCurrency(goal.currentAmount)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-muted-foreground">Rămas</div>
                  <div className="font-semibold text-blue-400 mt-1">
                    {formatCurrency(goal.remaining)}
                  </div>
                </div>
              </div>

              {/* Deadline */}
              {goal.deadline && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {goal.daysRemaining != null && goal.daysRemaining > 0
                      ? `${goal.daysRemaining} zile rămase`
                      : goal.daysRemaining === 0
                      ? 'Azi este deadline!'
                      : 'Deadline depășit'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Panel */}
      {selectedGoal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adaugă Contribuție</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {milestones.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-3">Jaloane</h4>
                <div className="space-y-2">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        m.reached ? 'bg-emerald-500/20' : 'bg-white/10'
                      }`}>
                        <span className={`text-xs font-bold ${m.reached ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          {m.reached ? '✓' : m.percentage}
                        </span>
                      </div>
                      <span className={m.reached ? 'line-through text-muted-foreground' : ''}>
                        {m.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                type="number"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="Introduceți suma..."
              />
              <Button onClick={handleContribute} className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Adaugă
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {goals.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Niciun obiectiv creat încă. Creează-ți primul obiectiv!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function GoalsPage() {
  return (
    <PermissionGuard feature="goals">
      <GoalsContent />
    </PermissionGuard>
  );
}
