'use client';

import { useEffect, useState } from 'react';
import { Upload, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Config {
  companyName: string;
  logo: string;
  colors: {
    primary: string;
    secondary: string;
  };
  domain: string;
  email: string;
}

function WhiteLabelContent() {
  const [config, setConfig] = useState<Config>({
    companyName: '',
    logo: '',
    colors: { primary: '#10b981', secondary: '#06b6d4' },
    domain: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/white-label/config');
      setConfig(res.data);
      setLogoPreview(res.data.logo);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setLogoPreview(dataUrl);
        setConfig({ ...config, logo: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.patch('/white-label/config', config);
      alert('Configurație salvată!');
    } catch (err) {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">White Label</h1>
        <p className="text-sm text-muted-foreground mt-1">Personalizează brandingul aplicației</p>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informații Companie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company">Nume Companie</Label>
            <Input
              id="company"
              value={config.companyName}
              onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
              placeholder="Numele companiei tale"
            />
          </div>
          <div>
            <Label htmlFor="domain">Domeniu</Label>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">budgetapp.io/</span>
              <Input
                id="domain"
                value={config.domain}
                onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                placeholder="mycompany"
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email Notificări</Label>
            <Input
              id="email"
              type="email"
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              placeholder="noreply@company.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoPreview && (
            <div className="w-32 h-32 rounded-lg border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center">
              <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
            </div>
          )}
          <div>
            <Label htmlFor="logo">Upload Logo</Label>
            <input
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="mt-2 block w-full text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">PNG, JPG recommended. Max 2MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Culori</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="primary">Culoare Primară</Label>
            <div className="flex items-center gap-3 mt-2">
              <input
                id="primary"
                type="color"
                value={config.colors.primary}
                onChange={(e) => setConfig({
                  ...config,
                  colors: { ...config.colors, primary: e.target.value }
                })}
                className="h-10 w-16 rounded cursor-pointer"
              />
              <span className="font-mono text-sm">{config.colors.primary}</span>
            </div>
          </div>
          <div>
            <Label htmlFor="secondary">Culoare Secundară</Label>
            <div className="flex items-center gap-3 mt-2">
              <input
                id="secondary"
                type="color"
                value={config.colors.secondary}
                onChange={(e) => setConfig({
                  ...config,
                  colors: { ...config.colors, secondary: e.target.value }
                })}
                className="h-10 w-16 rounded cursor-pointer"
              />
              <span className="font-mono text-sm">{config.colors.secondary}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Previzualizare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 rounded-lg border border-white/10" style={{ backgroundColor: config.colors.primary + '20' }}>
            {logoPreview && (
              <div className="mb-4 w-20 h-20 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
              </div>
            )}
            <h2 className="text-xl font-bold mb-2">{config.companyName || 'Company Name'}</h2>
            <p className="text-sm text-muted-foreground mb-4">Welcoming users to your budget app</p>
            <button
              className="px-4 py-2 rounded-lg text-white font-semibold"
              style={{ backgroundColor: config.colors.primary }}
            >
              Get Started
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
        <Save className="h-4 w-4" />
        {saving ? 'Se salvează...' : 'Salvează Configurație'}
      </Button>
    </div>
  );
}

export default function WhiteLabelPage() {
  return (
    <PermissionGuard feature="whiteLabel">
      <WhiteLabelContent />
    </PermissionGuard>
  );
}
