"use client";

import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  TrendingUp,
  History,
  AlertCircle,
  Plus,
  Trash2,
  DollarSign,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';

// Canonical expense taxonomy — must match the backend's EXPENSE_CATEGORIES
// (expenses.dto.ts, finding #10). The <select> submits the CODE via
// `<option value>`; the label is display-only. Summaries key on the code, so
// CATEGORY_LABEL maps it back to a friendly label for rendering.
const EXPENSE_CATEGORIES = [
  { code: 'MAINTENANCE', label: 'Maintenance & Spare Parts' },
  { code: 'SALARY', label: 'Staff Salary Payout' },
  { code: 'RENT', label: 'Real Estate / Rent' },
  { code: 'MARKETING', label: 'Marketing & Acquisition' },
  { code: 'UTILITIES', label: 'Utility Infrastructure' },
  { code: 'TAX', label: 'Tax' },
  { code: 'OTHER', label: 'Other' },
] as const;

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.code, c.label]),
);

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
  type?: string;
  invoice?: {
    id?: string;
    booking?: {
      customer?: { firstName?: string; lastName?: string } | null;
      car?: { brand?: string; model?: string } | null;
    } | null;
  } | null;
};

type RecentPayment = PendingPayment & {
  type: string;
  status: string;
  date?: string;
};

type ExpenseSummary = {
  total: number;
  byCategory: Record<string, number>;
  count: number;
};

type OpenInvoice = {
  id: string;
  amount: number;
  status: string;
  booking?: {
    customer?: { firstName?: string; lastName?: string };
    car?: { brand?: string; model?: string };
  };
};

export default function FinancialBrain() {
  const t = useTranslations('ownerPages');
  const { showToast } = useToast();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'pending'>('ledger');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFinance = useCallback(async () => {
    setIsLoading(true);
    try {
      const [expenseResponse, paymentResponse, recentResponse, summaryResponse] =
        await Promise.all([
          api.get<Expense[]>('/expenses'),
          api.get<PendingPayment[]>('/payments/pending'),
          api.get<RecentPayment[]>('/payments/recent'),
          api.get<ExpenseSummary>('/expenses/summary'),
        ]);
      setExpenses(expenseResponse.data);
      setPendingPayments(paymentResponse.data);
      setRecentPayments(recentResponse.data);
      setSummary(summaryResponse.data);
    } catch (err: any) {
      showToast('danger', 'Load Failed', err?.response?.data?.message || 'Could not load financial records.');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadFinance(); }, [loadFinance]);

  const loadOpenInvoices = useCallback(async () => {
    try {
      // Bookings include invoices; filter to DUE/PARTIAL for payment recording.
      const { data: bookings } = await api.get<any[]>('/bookings');
      const invoices: OpenInvoice[] = [];
      for (const b of bookings ?? []) {
        for (const inv of b.invoices ?? []) {
          if (inv.status === 'DUE' || inv.status === 'PARTIAL') {
            invoices.push({
              id: inv.id,
              amount: Number(inv.amount),
              status: inv.status,
              booking: {
                customer: b.customer,
                car: b.car,
              },
            });
          }
        }
      }
      // findAll may not include invoices — fall back to booking list labels only
      if (invoices.length === 0) {
        const withInvoices = (bookings ?? []).filter((b) => Array.isArray(b.invoices) && b.invoices.length);
        if (withInvoices.length === 0) {
          // fetch one-by-one is too heavy; leave empty and show hint
          setOpenInvoices([]);
          return;
        }
      }
      setOpenInvoices(invoices);
    } catch {
      setOpenInvoices([]);
    }
  }, []);

  useEffect(() => {
    if (isPaymentModalOpen) loadOpenInvoices();
  }, [isPaymentModalOpen, loadOpenInvoices]);

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

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const invoiceId = String(formData.get('invoiceId') || '');
    const amount = Number(formData.get('amount'));
    const type = String(formData.get('type') || 'INCOME') as 'INCOME' | 'REFUND';
    const method = String(formData.get('method') || 'CASH');
    const reference = String(formData.get('reference') || '') || undefined;

    if (!invoiceId) {
      showToast('danger', 'Invoice required', 'Select an open invoice or paste an invoice id.');
      return;
    }

    try {
      await api.post('/payments', {
        invoiceId,
        amount,
        type,
        method,
        reference,
        autoVerify: true,
      });
      setIsPaymentModalOpen(false);
      showToast(
        'success',
        type === 'REFUND' ? 'Refund Recorded' : 'Payment Recorded',
        `${amount.toLocaleString()} MAD ${type === 'REFUND' ? 'refunded' : 'applied'} and reconciled.`,
      );
      await loadFinance();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not record the payment.';
      showToast('danger', 'Payment Failed', Array.isArray(msg) ? msg.join(' ') : String(msg));
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

  const ledger = useMemo(() => {
    const expenseRows = expenses.map((expense) => ({
      id: expense.id,
      name: expense.description || CATEGORY_LABEL[expense.category] || expense.category,
      type: 'EXPENSE' as const,
      method: '—',
      amount: Number(expense.amount),
      color: 'text-danger',
      kind: 'expense' as const,
    }));
    const paymentRows = recentPayments.map((p) => {
      const car = p.invoice?.booking?.car;
      const customer = p.invoice?.booking?.customer;
      const carLabel = car ? `${car.brand || ''} ${car.model || ''}`.trim() : 'Payment';
      const who = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : '';
      return {
        id: p.id,
        name: who ? `${carLabel} · ${who}` : carLabel,
        type: (p.type === 'REFUND' ? 'REFUND' : 'INCOME') as 'INCOME' | 'REFUND',
        method: p.method || '—',
        amount: Number(p.amount),
        color: p.type === 'REFUND' ? 'text-danger' : 'text-success',
        kind: 'payment' as const,
      };
    });
    return [...paymentRows, ...expenseRows];
  }, [expenses, recentPayments]);

  const pendingTotal = pendingPayments.reduce((total, payment) => total + Number(payment.amount), 0);

  const categoryBars = useMemo(() => {
    if (!summary?.byCategory || Object.keys(summary.byCategory).length === 0) {
      return [] as { label: string; value: number; color: string }[];
    }
    const total = summary.total || 1;
    const colors = ['bg-primary', 'bg-primary/70', 'bg-primary/50', 'bg-primary/30', 'bg-primary/20'];
    return Object.entries(summary.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, amount], i) => ({
        label: CATEGORY_LABEL[code] ?? code,
        value: Math.round((amount / total) * 100),
        color: colors[i % colors.length],
      }));
  }, [summary]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('financialBrain')}</h1>
          <p className="mt-1.5 text-sm text-text-muted">Profitability, expenses and the cash ledger</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setIsPaymentModalOpen(true)}>
            <CreditCard className="w-4 h-4 me-2" />
            Record payment
          </Button>
          <Button onClick={() => setIsExpenseModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            Add expense
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group">
          <p className="eyebrow">{t('trackedExpenses')}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight"><span className="metal-text font-mono tabular">{(summary?.total ?? expenses.reduce((total, expense) => total + Number(expense.amount), 0)).toLocaleString()}</span> <span className="text-sm font-normal text-text-faint">MAD</span></p>
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
        <div className="lg:col-span-8 space-y-6">
           <CardHeader className="px-0 flex-row items-center justify-between">
              <div>
                <CardTitle>{t('financialRecords')}</CardTitle>
                <p className="mt-0.5 text-xs text-text-muted">{isLoading ? t('loadingRecords') : `${ledger.length + pendingPayments.length} ${t('records').toLowerCase()}`}</p>
              </div>
              <div className="flex gap-1 p-1 bg-surface rounded-xl border border-hairline">
                 <button
                  onClick={() => setActiveTab('ledger')}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all", activeTab === 'ledger' ? "bg-primary text-primary-foreground" : "text-text-muted hover:text-foreground")}
                 >History</button>
                 <button
                  onClick={() => setActiveTab('pending')}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all relative", activeTab === 'pending' ? "bg-primary text-primary-foreground" : "text-text-muted hover:text-foreground")}
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
                    {ledger.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-sm text-text-muted">
                          No verified payments or expenses yet.
                        </td>
                      </tr>
                    )}
                    {ledger.map((item) => (
                      <tr key={`${item.kind}-${item.id}`} className="border-b border-hairline last:border-0 hover:bg-surface-raised transition-colors group">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">{item.name}</p>
                                  <p className="mt-0.5 font-mono tabular text-xs text-text-faint">#TX-{item.id.toString().slice(-4)}</p>
                                </div>
                                {item.kind === 'expense' && (
                                  <button onClick={() => removeEntry(item.id)} className="p-2 text-text-faint hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={item.type === 'EXPENSE' || item.type === 'REFUND' ? 'destructive' : 'default'}>
                                {item.type === 'EXPENSE' ? 'Expense' : item.type === 'REFUND' ? 'Refund' : 'Income'}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-text-muted">{item.method.replace('_', ' ').toLowerCase()}</td>
                          <td className={cn("px-5 py-3.5 text-end font-mono tabular", item.color)}>
                            {item.type === 'INCOME' ? '+' : '-'}{item.amount.toLocaleString()} <span className="text-text-faint text-xs">MAD</span>
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
                              {p.type === 'REFUND' && <span className="text-danger">refund</span>}
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

        <div className="lg:col-span-4 space-y-8">
           <Card>
              <CardHeader className="p-0 mb-6">
                 <CardTitle>Expense breakdown</CardTitle>
                 <TrendingUp className="w-4 h-4 text-text-faint" />
              </CardHeader>
              <div className="space-y-5">
                 {categoryBars.length === 0 && (
                   <p className="text-xs text-text-muted">No expenses yet — breakdown appears once the ledger has categories.</p>
                 )}
                 {categoryBars.map((cat, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs">
                         <span className="text-text-muted truncate pe-2">{cat.label}</span>
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
                    <p className="eyebrow">How money moves</p>
                    <p className="text-sm text-text-muted leading-relaxed mt-2">
                      Bookings create a PENDING payment. Verify it here to mark the invoice PARTIAL/PAID.
                      Use <span className="text-foreground">Record payment</span> for partials or refunds.
                      Deposits are managed on each booking (hold / return / claim).
                    </p>
                 </div>
              </div>
           </Card>
        </div>
      </div>

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
                 {EXPENSE_CATEGORIES.map((c) => (
                   <option key={c.code} value={c.code}>{c.label}</option>
                 ))}
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

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record payment or refund"
        description="Partial income or refund against an invoice — reconciles immediately"
      >
        <form onSubmit={handleRecordPayment} className="space-y-5">
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Invoice</p>
            {openInvoices.length > 0 ? (
              <select
                name="invoiceId"
                required
                className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all"
              >
                <option value="">Select open invoice…</option>
                {openInvoices.map((inv) => {
                  const who = inv.booking?.customer
                    ? `${inv.booking.customer.firstName || ''} ${inv.booking.customer.lastName || ''}`.trim()
                    : 'Customer';
                  const car = inv.booking?.car
                    ? `${inv.booking.car.brand || ''} ${inv.booking.car.model || ''}`.trim()
                    : '';
                  return (
                    <option key={inv.id} value={inv.id}>
                      {who}{car ? ` · ${car}` : ''} — {inv.amount.toLocaleString()} MAD ({inv.status})
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                name="invoiceId"
                required
                placeholder="Invoice UUID"
                className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-mono text-foreground outline-none focus:border-primary transition-all"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Type</p>
              <select name="type" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all">
                <option value="INCOME">Income (partial/full)</option>
                <option value="REFUND">Refund</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="eyebrow px-1">Method</p>
              <select name="method" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all">
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="TRANSFER">Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Amount (MAD)</p>
            <input name="amount" type="number" step="0.01" min="0.01" required className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all" placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <p className="eyebrow px-1">Reference (optional)</p>
            <input name="reference" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all" placeholder="Bank ref / receipt #" />
          </div>
          <Button type="submit" className="w-full">Confirm payment</Button>
        </form>
      </Modal>
    </div>
  );
}
