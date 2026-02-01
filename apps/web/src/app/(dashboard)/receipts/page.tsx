'use client';

import { useEffect, useState } from 'react';
import { Camera, Upload, X, Check, DollarSign, Store, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Tesseract from 'tesseract.js';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Receipt {
  id: string;
  imageUrl: string;
  merchant: string;
  amount: number;
  date: string;
  text: string;
  transactionId: string | null;
  createdAt: string;
}

function ReceiptsContent() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [ocrText, setOcrText] = useState('');
  const [extractedData, setExtractedData] = useState({
    merchant: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/receipts');
      setReceipts(response.data);
    } catch (err) {
      console.error('Error loading receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const performOCR = async () => {
    if (!preview) return;

    try {
      setOcrLoading(true);
      const result = await Tesseract.recognize(preview, 'eng');
      const text = result.data.text;
      setOcrText(text);

      // Parse text pentru a extrage informații
      const amountMatch = text.match(/\$?(\d+[\.,]\d{2})/);
      const amount = amountMatch ? amountMatch[1].replace(',', '.') : '';

      setExtractedData({
        merchant: extractMerchant(text),
        amount,
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('OCR error:', err);
      alert('Failed to perform OCR');
    } finally {
      setOcrLoading(false);
    }
  };

  const extractMerchant = (text: string): string => {
    // Simplă extragere a primei linii cu litere mari
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && /[A-Z]/.test(trimmed)) {
        return trimmed.substring(0, 50);
      }
    }
    return 'Unknown';
  };

  const handleUploadReceipt = async () => {
    if (!preview || !extractedData.merchant || !extractedData.amount) {
      alert('Please fill all fields');
      return;
    }

    try {
      const response = await api.post('/receipts/scan', {
        imageUrl: preview,
        extractedText: ocrText,
        merchant: extractedData.merchant,
        amount: parseFloat(extractedData.amount),
        date: new Date(extractedData.date).toISOString(),
        description: `Receipt from ${extractedData.merchant}`
      });

      loadReceipts();
      setSelectedFile(null);
      setPreview('');
      setOcrText('');
      setExtractedData({
        merchant: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });

      alert(response.data.message);
    } catch (err) {
      alert('Failed to upload receipt');
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    if (!confirm('Confirm delete?')) return;
    try {
      await api.delete(`/receipts/${id}`);
      loadReceipts();
    } catch (err) {
      alert('Failed to delete receipt');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Chitanțe</h1>
          <p className="text-sm text-muted-foreground mt-1">Scanează și gestionează chitanțe</p>
        </div>
      </div>

      {/* Scanner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scanează Chitanță</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!preview ? (
            <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Alege o imagine sau trage aici
                </span>
              </label>
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="flex gap-4">
                <div className="w-40 h-40 bg-white/5 rounded-lg overflow-hidden border border-white/10">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                </div>

                {/* OCR Results */}
                <div className="flex-1 space-y-4">
                  <Button onClick={performOCR} disabled={ocrLoading} className="w-full gap-2">
                    {ocrLoading ? 'Se scanează...' : 'Scanează cu OCR'}
                  </Button>

                  {ocrText && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-2">Text extras:</div>
                      <div className="text-xs max-h-24 overflow-y-auto text-white/70">
                        {ocrText}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Edit Form */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="merchant" className="text-xs">
                      Comerciant
                    </Label>
                    <Input
                      id="merchant"
                      value={extractedData.merchant}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, merchant: e.target.value })
                      }
                      placeholder="ex: Kaufland"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount" className="text-xs">
                      Suma (RON)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      value={extractedData.amount}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, amount: e.target.value })
                      }
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date" className="text-xs">
                      Data
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={extractedData.date}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, date: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleUploadReceipt} className="flex-1 gap-2">
                    <Check className="h-4 w-4" />
                    Salvează Chitanță
                  </Button>
                  <Button
                    onClick={() => {
                      setPreview('');
                      setOcrText('');
                      setSelectedFile(null);
                    }}
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Receipts List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Chitanțe Recente</h2>
        {receipts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nicio chitanță încă</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {receipts.map((receipt) => (
              <Card
                key={receipt.id}
                className={`cursor-pointer transition-all border-2 ${
                  selectedReceipt === receipt.id ? 'border-emerald-500' : 'border-white/10'
                }`}
                onClick={() => setSelectedReceipt(receipt.id)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Image */}
                  {receipt.imageUrl && (
                    <div className="w-full h-32 bg-white/5 rounded-lg overflow-hidden border border-white/10">
                      <img
                        src={receipt.imageUrl}
                        alt="Receipt"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-blue-400" />
                      <span className="font-semibold text-sm">{receipt.merchant}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400">
                        {formatCurrency(receipt.amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(receipt.date).toLocaleDateString('ro-RO')}
                      </span>
                    </div>

                    {receipt.transactionId && (
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-xs text-emerald-400">
                          ✓ Tranzacție creată
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <Button
                    onClick={() => handleDeleteReceipt(receipt.id)}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    Șterge
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReceiptsPage() {
  return (
    <PermissionGuard feature="receipts">
      <ReceiptsContent />
    </PermissionGuard>
  );
}
