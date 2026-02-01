'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';

interface Category {
  id: string;
  name: string;
  color?: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#3b82f6' });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      const unique = new Map<string, Category>();
      (response.data as Category[]).forEach((cat) => {
        const key = `${cat.name.trim().toLowerCase()}::${(cat.color || '').toLowerCase()}`;
        if (!unique.has(key)) {
          unique.set(key, cat);
        }
      });
      setCategories(Array.from(unique.values()));
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, formData);
      } else {
        await api.post('/categories', formData);
      }
      setFormData({ name: '', color: '#3b82f6' });
      setShowForm(false);
      setEditingId(null);
      loadCategories();
    } catch (err) {
      console.error('Error saving category:', err);
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({ name: category.name, color: category.color || '#3b82f6' });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți această categorie?')) return;
    try {
      await api.delete(`/categories/${id}`);
      loadCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', color: '#3b82f6' });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-12">Se încarcă...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">Categorii</h1>
        {!showForm && (
          <Button size="sm" className="h-10 sm:h-9 w-full sm:w-auto" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adaugă Categorie
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-sm font-medium text-gray-900">{editingId ? 'Editează Categorie' : 'Categorie Nouă'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nume</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Culoare</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
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
        {categories.map((category) => (
          <Card key={category.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.color || '#3b82f6' }}
                  >
                    <span className="text-white text-sm font-bold">
                      {category.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                </div>
                <div className="flex space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(category)} className="h-9 w-9">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(category.id)} className="h-9 w-9">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && !showForm && (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center text-gray-500">
            Nu aveți categorii încă. Adăugați una pentru a începe.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
