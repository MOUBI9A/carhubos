"use client";

import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  CreditCard,
  History,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  status: string;
  date: string;
};

type PendingPayment = {
  id: string;
  amount: number;
  method: string;
  invoice?: {
    booking?: {
      customer?: { firstName?: string; lastName?: string } | null;
      car?: { brand?: string; model?: string } | null;
    } | null;
  } | null;
};

export default function FinancialBrain() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'pending'>('ledger');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFinance = useCallback(async () => {
    setIsLoading(true);
    try {
      const [expenseResponse, paymentResponse] = await Promise.all([
        api.get<Expense[]>('/expenses'),
        api.get<PendingPayment[]>('/payments/pending'),
      ]);
      setExpenses(expenseResponse.data);
      setPendingPayments(paymentResponse.data);
    } catch (err: any) {
      showToast('danger', 'Load Failed', err?.response?.data?.message || 'Could not load financial records.');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadFinance(); }, [loadFinance]);

  const handleVerify = async (id: string) => {
    try {
      await api.patch(`/payments/${id}/verify`);
      showToast('success', 'Liquidity Verified', 'The payment was verified and reconciled.');
      await loadFinance();
    } catch (err: any) {
      showToast('danger', 'Verification Failed', err?.response?.data?.message || 'Could not verify the payment.');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const amount = Number(formData.get('amount'));
    const category = formData.get('category') as string;

    try {
      await api.post('/expenses', {
        category,
        description: String(formData.get('desc') || category),
        amount,
      });
      setIsExpenseModalOpen(false);
      showToast('success', 'Expense Recorded', `${amount} MAD was added to the agency ledger.`);
      await loadFinance();
    } catch (err: any) {
      showToast('danger', 'Save Failed', err?.response?.data?.message || 'Could not record the expense.');
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await api.delete(`/expenses/${id}`);
      showToast('info', 'Ledger Corrected', 'The expense was removed from the ledger.');
      await loadFinance();
    } catch (err: any) {
      showToast('danger', 'Delete Failed', err?.response?.data?.message || 'Could not remove the expense.');
    }
  };

  const ledger = expenses.map((expense) => ({
    id: expense.id,
    name: expense.description || expense.category,
    type: 'EXPENSE' as const,
    method: '—',
    amount: Number(expense.amount),
    color: 'text-danger',
  }));
  const pendingTotal = pendingPayments.reduce((total, payment) => total + Number(payment.amount), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('financialBrain')}</h1>
          <p className="mt-1.5 text-sm text-text-muted">Profitability, expenses and the cash ledger</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => showToast('info', 'Exporting...', 'Preparing forensic financial statement for Q2.')}>Export tax report</Button>
          <Button onClick={() => setIsExpenseModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            Add expense
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group">
          <p className="eyebrow">{t('trackedExpenses')}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight"><span className="metal-text font-mono tabular">{expenses.reduce((total, expense) => total + Number(expense.amount), 0).toLocaleString()}</span> <span className="text-sm font-normal text-text-faint">MAD</span></p>
        </Card>
        <Card className="group">
          <p className="eyebrow">{t('pendingLiquidity')}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight"><span className="font-mono tabular">{pendingTotal.toLocaleString()}</span> <span className="text-sm font-normal text-text-faint">MAD</span></p>
        </Card>
        <Card className="group">
          <p className="eyebrow">{t('records')}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight"><span className="font-mono tabular">{ledger.length + pendingPayments.length}</span></p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Ledger */}
        <div className="lg:col-span-8 space-y-6">
           <CardHeader className="px-0 flex-row items-center justify-between">
              <div>
                <CardTitle>{t('financialRecords')}</CardTitle>
                <p className="mt-0.5 text-xs text-text-muted">{isLoading ? t('loadingRecords') : `${ledger.length + pendingPayments.length} ${t('records').toLowerCase()}`}</p>
              </div>
              <div className="flex gap-1 p-1 bg-surface rounded-xl border border-hairline">
                 <button
                  onClick={() => setActiveTab('ledger')}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all", activeTab === 'ledger' ? "bg-primary text-white" : "text-text-muted hover:text-foreground")}
                 >History</button>
                 <button
                  onClick={() => setActiveTab('pending')}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all relative", activeTab === 'pending' ? "bg-primary text-white" : "text-text-muted hover:text-foreground")}
                 >
                   Pending
                   {pendingPayments.length > 0 && <span className="absolute -top-1 -end-1 w-2 h-2 bg-danger rounded-full" />}
                 </button>
              </div>
           </CardHeader>

           <Card padding="none" className="overflow-hidden">
              {activeTab === 'ledger' ? (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline">
                        <th className="eyebrow px-5 py-3 text-start">Transaction</th>
                        <th className="eyebrow px-5 py-3 text-start">Type</th>
                        <th className="eyebrow px-5 py-3 text-start">Method</th>
                        <th className="eyebrow px-5 py-3 text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((item) => (
                      <tr key={item.id} className="border-b border-hairline last:border-0 hover:bg-surface-raised transition-colors group">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">{item.name}</p>
                                  <p className="mt-0.5 font-mono tabular text-xs text-text-faint">#TX-{item.id.toString().slice(-4)}</p>
                                </div>
                                <button onClick={() => removeEntry(item.id)} className="p-2 text-text-faint hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant="destructive">
                                Expense
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-text-muted">{item.method.replace('_', ' ').toLowerCase()}</td>
                          <td className={cn("px-5 py-3.5 text-end font-mono tabular", item.color)}>
                            -{item.amount.toLocaleString()} <span className="text-text-faint text-xs">MAD</span>
                          </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div>
                   {pendingPayments.map((p) => {
                     const customer = p.invoice?.booking?.customer;
                     const car = p.invoice?.booking?.car;
                     const customerName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : '—';
                     const paymentName = car ? `${car.brand || ''} ${car.model || ''}`.trim() : 'Payment';
                     return (
                     <div key={p.id} className="flex items-center gap-4 px-5 py-4 border-b border-hairline last:border-0 hover:bg-surface-raised transition-colors">
                        <Avatar name={customerName} size={40} />
                        <div className="min-w-0 flex-1">
                           <p className="truncate text-sm font-medium text-foreground">{paymentName}</p>
                           <p className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                              <span>{customerName}</span>
                              <span className="text-text-faint">·</span>
                              <span>{p.method.replace('_', ' ').toLowerCase()}</span>
                           </p>
                        </div>
                        <div className="flex items-center gap-5 shrink-0">
                           <p className="font-mono tabular text-foreground">{p.amount.toLocaleString()} <span className="text-text-faint text-xs">MAD</span></p>
                           <Button size="sm" onClick={() => handleVerify(p.id)}>
                              {t('verifyPayment')}
                           </Button>
                        </div>
                     </div>
                     );
                   })}
                   {pendingPayments.length === 0 && (
                     <div className="py-16 text-center">
                        <CheckCircle2 className="w-10 h-10 text-text-faint mx-auto mb-3" />
                        <p className="text-sm font-medium text-foreground">{t('noPending')}</p>
                        <p className="mt-1 text-xs text-text-muted">{t('noPendingBody')}</p>
                     </div>
                   )}
                </div>
              )}
           </Card>
        </div>

        {/* Financial Intelligence */}
        <div className="lg:col-span-4 space-y-8">
           <Card>
              <CardHeader className="p-0 mb-6">
                 <CardTitle>Expense breakdown</CardTitle>
                 <TrendingUp className="w-4 h-4 text-text-faint" />
              </CardHeader>
              <div className="space-y-5">
                 {[
                   { label: 'Maintenance', value: 45, color: 'bg-primary' },
                   { label: 'Staff salaries', value: 30, color: 'bg-primary/70' },
                   { label: 'Office & rent', value: 15, color: 'bg-primary/50' },
                   { label: 'Marketing', value: 10, color: 'bg-primary/30' },
                 ].map((cat, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs">
                         <span className="text-text-muted">{cat.label}</span>
                         <span className="font-mono tabular font-medium text-foreground">{cat.value}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                         <div className={cn("h-full rounded-full transition-all duration-1000", cat.color)} style={{ width: `${cat.value}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
           </Card>

           <Card>
              <div className="flex items-start gap-4">
                 <AlertCircle className="w-5 h-5 text-info shrink-0 mt-0.5" />
                 <div>
                    <p className="eyebrow">Audit forecast</p>
                    <p className="text-sm text-text-muted leading-relaxed mt-2">
                       Q2 tax estimation: <span className="font-mono tabular text-foreground">18,500 MAD</span>. Suggest increasing bank transfer liquidity to maintain 1:1 asset backing.
                    </p>
                 </div>
              </div>
           </Card>
        </div>
      </div>

      {/* Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record an expense"
        description="Add an operating expense to the ledger"
      >
        <form onSubmit={handleAddExpense} className="space-y-6">
           <div className="space-y-1.5">
              <p className="eyebrow px-1">Category</p>
              <select name="category" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all">
                 <option>Maintenance & Spare Parts</option>
                 <option>Staff Salary Payout</option>
                 <option>Real Estate / Rent</option>
                 <option>Marketing & Acquisition</option>
                 <option>Utility Infrastructure</option>
              </select>
           </div>
           <div className="space-y-1.5">
              <p className="eyebrow px-1">Amount (MAD)</p>
              <div className="relative">
                 <DollarSign className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
                 <input name="amount" type="number" required className="w-full bg-surface border border-hairline rounded-xl ps-11 pe-4 py-3.5 text-sm font-mono tabular text-foreground placeholder:text-text-faint outline-none focus:border-primary transition-all" placeholder="0.00" />
              </div>
           </div>
           <div className="space-y-1.5">
              <p className="eyebrow px-1">Memo</p>
              <textarea name="desc" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground placeholder:text-text-faint outline-none focus:border-primary transition-all min-h-[100px]" placeholder="Briefly describe the transaction..." />
           </div>
           <div className="p-4 rounded-2xl flex items-center justify-between bg-surface border border-hairline">
              <div className="flex items-center gap-3">
                 <History className="w-4 h-4 text-danger" />
                 <span className="text-xs font-medium text-text-muted">Auto-deduct from net profit</span>
              </div>
              <div className="w-10 h-5 bg-danger/20 rounded-full relative cursor-pointer border border-danger/20">
                 <div className="absolute end-0.5 top-0.5 w-4 h-4 bg-danger rounded-full" />
              </div>
           </div>
           <Button type="submit" variant="danger" className="w-full">Confirm expense</Button>
        </form>
      </Modal>
    </div>
  );
}
