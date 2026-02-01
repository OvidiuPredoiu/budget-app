'use client';

import { useEffect, useState } from 'react';
import { Copy, Trash2, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { PermissionGuard } from '@/components/PermissionGuard';

interface APIKey {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
}

interface Webhook {
  id: string;
  event: string;
  url: string;
  active: boolean;
}

function DeveloperContent() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [webhookData, setWebhookData] = useState({ event: 'transaction.created', url: '' });

  useEffect(() => {
    loadDeveloperData();
  }, []);

  const loadDeveloperData = async () => {
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        api.get('/developer/api-keys'),
        api.get('/developer/webhooks')
      ]);
      setApiKeys(keysRes.data);
      setWebhooks(webhooksRes.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleCreateKey = async () => {
    try {
      const res = await api.post('/developer/api-keys', { name: keyName });
      setApiKeys([res.data, ...apiKeys]);
      setShowKeyForm(false);
      setKeyName('');
    } catch (err) {
      alert('Failed to create API key');
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Delete API key?')) return;
    try {
      await api.delete(`/developer/api-keys/${id}`);
      setApiKeys(apiKeys.filter(k => k.id !== id));
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleCreateWebhook = async () => {
    try {
      const res = await api.post('/developer/webhooks', webhookData);
      setWebhooks([res.data, ...webhooks]);
      setShowWebhookForm(false);
      setWebhookData({ event: 'transaction.created', url: '' });
    } catch (err) {
      alert('Failed to create webhook');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Developer Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">API keys și webhook-uri pentru integrări</p>
      </div>

      {/* API Keys Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">API Keys</h2>
          <Button onClick={() => setShowKeyForm(!showKeyForm)} className="gap-2" size="sm">
            <Plus className="h-4 w-4" />
            Nou Key
          </Button>
        </div>

        {showKeyForm && (
          <Card className="mb-4">
            <CardContent className="pt-6 space-y-3">
              <div>
                <Label htmlFor="keyname">Nume</Label>
                <Input
                  id="keyname"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="ex: Mobile App"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateKey}>Creează</Button>
                <Button onClick={() => setShowKeyForm(false)} variant="outline">
                  Anulează
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {apiKeys.map((key) => (
            <Card key={key.id}>
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{key.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{key.apiKey}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(key.apiKey);
                      alert('Copied!');
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteKey(key.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Webhooks Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <Button onClick={() => setShowWebhookForm(!showWebhookForm)} className="gap-2" size="sm">
            <Plus className="h-4 w-4" />
            Nou Webhook
          </Button>
        </div>

        {showWebhookForm && (
          <Card className="mb-4">
            <CardContent className="pt-6 space-y-3">
              <div>
                <Label htmlFor="event">Eveniment</Label>
                <select
                  id="event"
                  value={webhookData.event}
                  onChange={(e) => setWebhookData({ ...webhookData, event: e.target.value })}
                  className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                >
                  <option value="transaction.created">Transaction Created</option>
                  <option value="budget.updated">Budget Updated</option>
                  <option value="report.generated">Report Generated</option>
                </select>
              </div>
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={webhookData.url}
                  onChange={(e) => setWebhookData({ ...webhookData, url: e.target.value })}
                  placeholder="https://example.com/webhooks/budget"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateWebhook}>Creează</Button>
                <Button onClick={() => setShowWebhookForm(false)} variant="outline">
                  Anulează
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">{webhook.event}</div>
                    <div className="text-xs text-muted-foreground font-mono break-all">{webhook.url}</div>
                  </div>
                  {webhook.active && (
                    <div className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                      Active
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* API Documentation */}
      <Card className="border-blue-500/30 bg-blue-500/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            API Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="font-semibold mb-1">Base URL</div>
            <div className="font-mono text-muted-foreground">https://api.budgetapp.io/v1</div>
          </div>
          <div>
            <div className="font-semibold mb-1">Authentication</div>
            <div className="text-muted-foreground">Include your API key in the Authorization header: Bearer YOUR_API_KEY</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeveloperPage() {
  return (
    <PermissionGuard feature="developer">
      <DeveloperContent />
    </PermissionGuard>
  );
}
