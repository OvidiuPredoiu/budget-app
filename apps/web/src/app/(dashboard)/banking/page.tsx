'use client';

import { useEffect, useState } from 'react';
import { Link, Download, Zap, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Account {
  id: string;
  name: string;
  type: string;
  mask: string;
  balance: number;
  currency: string;
  verified: boolean;
}

interface Integration {
  id: string;
  provider: string;
  isActive: boolean;
}

function BankingContent() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [linkedAt, setLinkedAt] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/banking/accounts');
      setAccounts(response.data.accounts);
      setIntegration(response.data.integration);
      setLinkedAt(response.data.linkedAt);
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkBank = async () => {
    try {
      const tokenRes = await api.post('/banking/link-token', {});
      
      // In production, open Plaid Link modal
      // For MVP, mock the exchange
      alert('In production, Plaid Link modal would open here');
      
      // Mock exchange
      await api.post('/banking/exchange-token', {
        publicToken: 'mock_public_token_' + Date.now()
      });

      loadAccounts();
    } catch (err) {
      alert('Failed to link bank account');
    }
  };

  const handleSyncTransactions = async (accountId: string) => {
    try {
      setSyncing(true);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      await api.post('/banking/sync-transactions', {
        accountId,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      });

      alert('Transactions synced successfully');
      loadAccounts();
    } catch (err) {
      alert('Failed to sync transactions');
    } finally {
      setSyncing(false);
    }
  };

  const handleAutoCategorize = async () => {
    try {
      setSyncing(true);
      await api.post('/banking/auto-categorize', {});
      alert('Transactions auto-categorized');
    } catch (err) {
      alert('Failed to auto-categorize');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deconectezi contul bancar?')) return;
    try {
      await api.delete('/banking/disconnect');
      setAccounts([]);
      setIntegration(null);
      setLinkedAt(null);
    } catch (err) {
      alert('Failed to disconnect');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Conturi Bancare</h1>
          <p className="text-sm text-muted-foreground mt-1">Sincronizează conturi și importa tranzacții</p>
        </div>
        {!integration?.isActive && (
          <Button onClick={handleLinkBank} className="gap-2">
            <Link className="h-4 w-4" />
            Conectează Bancă
          </Button>
        )}
      </div>

      {/* Connection Status */}
      {integration?.isActive && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-emerald-400">Conectat cu Plaid</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {linkedAt && `Conectat pe ${new Date(linkedAt).toLocaleDateString('ro-RO')}`}
                </div>
              </div>
              <Button onClick={handleDisconnect} variant="destructive" size="sm">
                Deconectează
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Controls */}
      {integration?.isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sincronizare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleAutoCategorize} disabled={syncing} className="w-full gap-2">
              <Zap className="h-4 w-4" />
              {syncing ? 'Se sincronizează...' : 'Auto-categorizează tranzacții'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Accounts */}
      {accounts.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold mb-4">Conturi Conectate</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardContent className="pt-6 space-y-4">
                  {/* Account Info */}
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{account.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {account.type} • ••••{account.mask}
                        </div>
                      </div>
                      {account.verified && (
                        <div className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                          Verificat
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-muted-foreground">Balanță</div>
                    <div className="font-bold text-lg text-emerald-400 mt-1">
                      {formatCurrency(account.balance)} {account.currency}
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    onClick={() => handleSyncTransactions(account.id)}
                    disabled={syncing}
                    className="w-full gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {syncing ? 'Se sincronizează...' : 'Sincronizează'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : !integration?.isActive ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Conectează un cont bancar pentru a sincroniza tranzacții
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function BankingPage() {
  return (
    <PermissionGuard feature="banking">
      <BankingContent />
    </PermissionGuard>
  );
}
