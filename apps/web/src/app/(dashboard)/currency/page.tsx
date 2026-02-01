'use client';

import { useEffect, useState } from 'react';
import { DollarSign, ArrowRightLeft, Plane, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { PermissionGuard } from '@/components/PermissionGuard';

interface ExchangeRates {
  [key: string]: number;
}

interface ConversionResult {
  original: number;
  fromCurrency: string;
  toCurrency: string;
  converted: number;
  rate: number;
}

interface TravelReport {
  period: string;
  totalSpent: number;
  byCategory: Record<string, any>;
  avgPerDay: number;
}

function CurrencyContent() {
  const [rates, setRates] = useState<ExchangeRates>({});
  const [loading, setLoading] = useState(true);

  // Converter state
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('RON');
  const [result, setResult] = useState<ConversionResult | null>(null);

  // Travel report state
  const [travelReport, setTravelReport] = useState<TravelReport | null>(null);
  const [travelStartDate, setTravelStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [travelEndDate, setTravelEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Portfolio state
  const [portfolio, setPortfolio] = useState<any>(null);

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR', 'RON'];

  useEffect(() => {
    loadRates();
    loadTravelReport();
    loadPortfolio();
  }, []);

  const loadRates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/currency/rates?base=USD');
      setRates(response.data.rates);
    } catch (err) {
      console.error('Error loading rates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    try {
      const response = await api.post('/currency/convert', {
        amount: parseFloat(amount),
        fromCurrency,
        toCurrency
      });
      setResult(response.data);
    } catch (err) {
      alert('Failed to convert currency');
    }
  };

  const loadTravelReport = async () => {
    try {
      const response = await api.get(
        `/currency/travel-report?startDate=${travelStartDate}&endDate=${travelEndDate}`
      );
      setTravelReport(response.data);
    } catch (err) {
      console.error('Error loading travel report:', err);
    }
  };

  const loadPortfolio = async () => {
    try {
      const response = await api.get('/currency/portfolio');
      setPortfolio(response.data);
    } catch (err) {
      console.error('Error loading portfolio:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Valute & Mulți-Valută</h1>
        <p className="text-sm text-muted-foreground mt-1">Conversii și tracking cheltuieli internaționale</p>
      </div>

      {/* Currency Converter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Convertor Valute
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">Suma</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Introduceți suma"
                />
              </div>
              <div>
                <Label htmlFor="from">Din</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger id="from">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(cur => (
                      <SelectItem key={cur} value={cur}>
                        {cur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="to">În</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger id="to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(cur => (
                      <SelectItem key={cur} value={cur}>
                        {cur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleConvert} className="w-full">
              Convertește
            </Button>

            {result && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">
                    {result.original} {result.fromCurrency}
                  </p>
                  <p className="text-3xl font-bold text-emerald-400 mb-2">
                    {result.converted} {result.toCurrency}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Rată: 1 {result.fromCurrency} = {result.rate} {result.toCurrency}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Travel Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Raport Cheltuieli de Călătorie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Data Inceput</Label>
              <Input
                id="startDate"
                type="date"
                value={travelStartDate}
                onChange={(e) => {
                  setTravelStartDate(e.target.value);
                }}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Sfarsit</Label>
              <Input
                id="endDate"
                type="date"
                value={travelEndDate}
                onChange={(e) => {
                  setTravelEndDate(e.target.value);
                }}
              />
            </div>
          </div>
          <Button
            onClick={loadTravelReport}
            className="w-full"
          >
            Genereaza Raport
          </Button>

          {travelReport && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-muted-foreground mb-2">Total Cheltuieli</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {travelReport.totalSpent.toFixed(2)} RON
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Medie pe zi: {travelReport.avgPerDay.toFixed(2)} RON
                </p>
              </div>

              {Object.entries(travelReport.byCategory).map(([cat, data]: any) => (
                <div key={cat} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{cat}</div>
                    <span className="text-sm text-muted-foreground">{data.count} cheltuieli</span>
                  </div>
                  <p className="text-lg font-semibold text-emerald-400">
                    {data.amount.toFixed(2)} RON
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exchange Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Rate de Schimb (vs USD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Se încarcă...</p>
          ) : Object.keys(rates).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(rates)
                .filter(([cur]) => currencies.includes(cur))
                .map(([cur, rate]: any) => (
                  <div key={cur} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-sm font-medium">{cur}</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {rate.toFixed(4)}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nu s-au putut încărca rate
            </p>
          )}
        </CardContent>
      </Card>

      {/* Multi-Currency Portfolio */}
      {portfolio && Object.keys(portfolio.currencies || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portofoliu Multi-Valută</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(portfolio.currencies).map(([currency, amount]: any) => (
                <div key={currency} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <div className="font-medium">{currency}</div>
                    <div className="text-xs text-muted-foreground">
                      {portfolio.totalTransactions} tranzacții
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {amount >= 0 ? '+' : ''}{amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CurrencyPage() {
  return (
    <PermissionGuard feature="currency">
      <CurrencyContent />
    </PermissionGuard>
  );
}
