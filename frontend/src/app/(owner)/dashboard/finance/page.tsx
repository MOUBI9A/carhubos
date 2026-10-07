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
import { useFormat } from '@/lib/useFormat';

const EXPENSE_CATEGORIES = [
  { code: 'MAINTENANCE', label: 'Maintenance & Spare Parts' },
  { code: 'SALARY', label: 'Staff Salary Payout' },
  { code: 'RENT', label: 'Real Estate / Rent' },
  { code: 'MARKETING', label: 'Marketing & Acquisition' },
  { code: 'UTILITIES', label: 'Utility Infrastructure' },
  { code: 'TAX', label: 'Tax' },
  { code: 'OTHER', label: 'Other' },
] as const;



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
  const tf = useTranslations('finance');
  const { money, number } = useFormat();
  const categoryLabel = useCallback((code: string) => {
    const category = EXPENSE_CATEGORIES.find((entry) => entry.code === code);
    return category ? tf(`categories.${category.code}`) : code;
  }, [tf]);
  const methodLabel = (code: string) => {
    const method = (['CASH', 'CARD', 'TRANSFER', 'CHEQUE'] as const).find((entry) => entry === code);
    return method ? tf(`methods.${method}`) : code;
  };
  const invoiceStatusLabel = (code: string) => {
    const status = (['DUE', 'PARTIAL', 'PAID'] as const).find((entry) => entry === code);
    return status ? tf(`invoiceStatuses.${status}`) : code;
  };
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
  const [loadError, setLoadError] = useState(false);
  const [invoiceLoadError, setInvoiceLoadError] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadFinance = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
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
    } catch {
      setLoadError(true);
      showToast('danger', tf('loadFailedTitle'), tf('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [showToast, tf]);

  useEffect(() => { loadFinance(); }, [loadFinance]);

  const loadOpenInvoices = useCallback(async () => {
    setInvoiceLoadError(false);
    try {
      const { data: bookings } = await api.get<any[]>('/bookings');
      const invoices: OpenInvoice[] = [];
      for (const b of bookings ?? []) {
        for (const inv of b.invoices ?? []) {
          if (inv.status === 'DUE' || inv.status === 'PARTIAL' || inv.status === 'PAID') {
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
      setInvoiceLoadError(true);
      setOpenInvoices([]);
    }
  }, []);

  useEffect(() => {
    if (isPaymentModalOpen) loadOpenInvoices();
  }, [isPaymentModalOpen, loadOpenInvoices]);

  const handleVerify = async (id: string) => {
    if (verifyingId) return;
    setVerifyingId(id);
    try {
      await api.patch(`/payments/${id}/verify`);
      showToast('success', tf('verifiedTitle'), tf('verifiedBody'));
      await loadFinance();
    } catch {
      showToast('danger', tf('verifyFailedTitle'), tf('verifyFailed'));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const amount = Number(formData.get('amount'));
    const category = formData.get('category') as string;
    if (savingExpense) return;
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(?:\.\d{1,2})?$/.test(String(formData.get('amount')))) {
      showToast('danger', tf('invalidAmountTitle'), tf('invalidAmount'));
      return;
    }
    setSavingExpense(true);

    try {
      await api.post('/expenses', {
        category,
        description: String(formData.get('desc') || category),
        amount,
      });
      setIsExpenseModalOpen(false);
      showToast('success', tf('expenseSavedTitle'), tf('expenseSaved', { amount: money(amount) }));
      await loadFinance();
    } catch {
      showToast('danger', tf('saveFailedTitle'), tf('saveFailed'));
    } finally {
      setSavingExpense(false);
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
      showToast('danger', tf('invoiceRequiredTitle'), tf('invoiceRequired'));
      return;
    }

    if (savingPayment) return;
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(?:\.\d{1,2})?$/.test(String(formData.get('amount')))) {
      showToast('danger', tf('invalidAmountTitle'), tf('invalidAmount'));
      return;
    }
    setSavingPayment(true);
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
        type === 'REFUND' ? tf('refundSavedTitle') : tf('paymentSavedTitle'),
        tf(type === 'REFUND' ? 'refundSaved' : 'paymentSaved', { amount: money(amount) }),
      );
      await loadFinance();
    } catch {
      showToast('danger', tf('paymentFailedTitle'), tf('paymentFailed'));
    } finally {
      setSavingPayment(false);
    }
  };

  const removeEntry = async (id: string) => {
    if (removingId) return;
    setRemovingId(id);
    try {
      await api.delete(`/expenses/${id}`);
      showToast('info', tf('removedTitle'), tf('removedBody'));
      await loadFinance();
    } catch {
      showToast('danger', tf('deleteFailedTitle'), tf('deleteFailed'));
    } finally {
      setRemovingId(null);
    }
  };

  const ledger = useMemo(() => {
    const expenseRows = expenses.map((expense) => ({
      id: expense.id,
      name: expense.description && expense.description !== expense.category ? expense.description : categoryLabel(expense.category),
      type: 'EXPENSE' as const,
      method: '—',
      amount: Number(expense.amount),
      color: 'text-danger',
      kind: 'expense' as const,
    }));
    const paymentRows = recentPayments.map((p) => {
      const car = p.invoice?.booking?.car;
      const customer = p.invoice?.booking?.customer;
      const carLabel = car ? `${car.brand || ''} ${car.model || ''}`.trim() : tf('payment');
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
  }, [expenses, recentPayments, categoryLabel, tf]);

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
        label: categoryLabel(code),
        value: Math.round((amount / total) * 100),
        color: colors[i % colors.length],
      }));
  }, [summary, categoryLabel]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('financialBrain')}</h1>
          <p className="mt-1.5 text-sm text-text-muted">{tf('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setIsPaymentModalOpen(true)}>
            <CreditCard className="w-4 h-4 me-2" />
            {tf('recordPayment')}
          </Button>
          <Button onClick={() => setIsExpenseModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            {tf('addExpense')}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group">
          <p className="eyebrow">{t('trackedExpenses')}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight"><span className="metal-text font-mono tabular"><bdi>{isLoading || loadError ? '—' : money(summary?.total ?? expenses.reduce((total, expense) => total + Number(expense.amount), 0))}</bdi></span></p>
        </Card>
        <Card className="group">
          <p className="eyebrow">{t('pendingLiquidity')}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight"><span className="font-mono tabular"><bdi>{isLoading || loadError ? '—' : money(pendingTotal)}</bdi></span></p>
        </Card>
        <Card className="group">
          <p className="eyebrow">{t('records')}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight"><span className="font-mono tabular">{isLoading || loadError ? '—' : number(ledger.length + pendingPayments.length)}</span></p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
           <CardHeader className="px-0 flex-row items-center justify-between">
              <div>
                <CardTitle>{t('financialRecords')}</CardTitle>
                <p className="mt-0.5 text-xs text-text-muted">{isLoading ? t('loadingRecords') : tf('recordsCount', { count: ledger.length + pendingPayments.length })}</p>
              </div>
              <div className="flex gap-1 p-1 bg-surface rounded-xl border border-hairline">
                 <button
                  onClick={() => setActiveTab('ledger')}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all", activeTab === 'ledger' ? "bg-primary text-primary-foreground" : "text-text-muted hover:text-foreground")}
                 >{tf('history')}</button>
                 <button
                  onClick={() => setActiveTab('pending')}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all relative", activeTab === 'pending' ? "bg-primary text-primary-foreground" : "text-text-muted hover:text-foreground")}
                 >
                   {tf('pending')}
                   {pendingPayments.length > 0 && <span className="absolute -top-1 -end-1 w-2 h-2 bg-danger rounded-full" />}
                 </button>
              </div>
           </CardHeader>

           <Card padding="none" className="overflow-hidden">
              {loadError ? (
                <div role="alert" className="p-6 text-center space-y-3">
                  <p className="text-danger">{tf('loadFailed')}</p>
                  <Button variant="outline" onClick={loadFinance}>{tf('retry')}</Button>
                </div>
              ) : isLoading ? (
                <p role="status" className="p-6 text-text-muted">{t('loadingRecords')}</p>
              ) : activeTab === 'ledger' ? (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline">
                        <th className="eyebrow px-5 py-3 text-start">{tf('transaction')}</th>
                        <th className="eyebrow px-5 py-3 text-start">{tf('type')}</th>
                        <th className="eyebrow px-5 py-3 text-start">{tf('method')}</th>
                        <th className="eyebrow px-5 py-3 text-end">{tf('amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-sm text-text-muted">
                          {tf('emptyLedger')}
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
                                  <button disabled={removingId !== null} aria-label={tf('deleteExpense', { name: item.name })} onClick={() => removeEntry(item.id)} className="p-2 text-text-faint hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={item.type === 'EXPENSE' || item.type === 'REFUND' ? 'destructive' : 'default'}>
                                {tf(item.type === 'EXPENSE' ? 'expense' : item.type === 'REFUND' ? 'refund' : 'income')}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-text-muted">{methodLabel(item.method)}</td>
                          <td className={cn("px-5 py-3.5 text-end font-mono tabular", item.color)}>
                            <bdi>{money(item.type === 'INCOME' ? item.amount : -item.amount)}</bdi>
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
                     const paymentName = car ? `${car.brand || ''} ${car.model || ''}`.trim() : tf('payment');
                     return (
                     <div key={p.id} className="flex flex-wrap sm:flex-nowrap items-center gap-4 px-5 py-4 border-b border-hairline last:border-0 hover:bg-surface-raised transition-colors">
                        <Avatar name={customerName} size={40} />
                        <div className="min-w-0 flex-1">
                           <p className="truncate text-sm font-medium text-foreground">{paymentName}</p>
                           <p className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                              <span>{customerName}</span>
                              <span className="text-text-faint">·</span>
                              <span>{methodLabel(p.method)}</span>
                              {p.type === 'REFUND' && <span className="text-danger">{tf('refund')}</span>}
                           </p>
                        </div>
                        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-5 shrink-0">
                           <p className="font-mono tabular text-foreground"><bdi>{money(p.amount)}</bdi></p>
                           <Button size="sm" disabled={verifyingId !== null} isLoading={verifyingId === p.id} onClick={() => handleVerify(p.id)}>
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
                 <CardTitle>{tf('breakdown')}</CardTitle>
                 <TrendingUp className="w-4 h-4 text-text-faint" />
              </CardHeader>
              <div className="space-y-5">
                 {categoryBars.length === 0 && (
                   <p className="text-xs text-text-muted">{tf('emptyBreakdown')}</p>
                 )}
                 {categoryBars.map((cat, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs">
                         <span className="text-text-muted truncate pe-2">{cat.label}</span>
                         <span className="font-mono tabular font-medium text-foreground">{number(cat.value / 100, { style: 'percent' })}</span>
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
                    <p className="eyebrow">{tf('moneyFlow')}</p>
                    <p className="text-sm text-text-muted leading-relaxed mt-2">
                      {tf('moneyFlowBody')}
                    </p>
                 </div>
              </div>
           </Card>
        </div>
      </div>

      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={tf('expenseTitle')}
        description={tf('expenseDescription')}
      >
        <form onSubmit={handleAddExpense} className="space-y-6">
           <div className="space-y-1.5">
              <label htmlFor="expense-category" className="eyebrow px-1">{tf('category')}</label>
              <select id="expense-category" name="category" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all">
                 {EXPENSE_CATEGORIES.map((c) => (
                   <option key={c.code} value={c.code}>{categoryLabel(c.code)}</option>
                 ))}
              </select>
           </div>
           <div className="space-y-1.5">
              <label htmlFor="expense-amount" className="eyebrow px-1">{tf('amountMad')}</label>
              <div className="relative">
                 <DollarSign className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
                 <input id="expense-amount" name="amount" type="number" step="0.01" min="0.01" required className="w-full bg-surface border border-hairline rounded-xl ps-11 pe-4 py-3.5 text-sm font-mono tabular text-foreground placeholder:text-text-faint outline-none focus:border-primary transition-all" placeholder="0.00" />
              </div>
           </div>
           <div className="space-y-1.5">
              <label htmlFor="expense-memo" className="eyebrow px-1">{tf('memo')}</label>
              <textarea id="expense-memo" name="desc" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground placeholder:text-text-faint outline-none focus:border-primary transition-all min-h-[100px]" placeholder={tf('memoPlaceholder')} />
           </div>
           <div className="p-4 rounded-2xl flex items-center justify-between bg-surface border border-hairline">
              <div className="flex items-center gap-3">
                 <History className="w-4 h-4 text-danger" />
                 <span className="text-xs font-medium text-text-muted">{tf('expenseNote')}</span>
              </div>

           </div>
           <Button type="submit" variant="danger" className="w-full" isLoading={savingExpense}>{tf('confirmExpense')}</Button>
        </form>
      </Modal>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={tf('paymentTitle')}
        description={tf('paymentDescription')}
      >
        <form onSubmit={handleRecordPayment} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="payment-invoice" className="eyebrow px-1">{tf('invoice')}</label>
            {invoiceLoadError && <p role="alert" className="text-sm text-danger">{tf('invoiceLoadFailed')}</p>}
            {openInvoices.length > 0 ? (
              <select
                id="payment-invoice"
                name="invoiceId"
                required
                className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all"
              >
                <option value="">{tf('selectInvoice')}</option>
                {openInvoices.map((inv) => {
                  const who = inv.booking?.customer
                    ? `${inv.booking.customer.firstName || ''} ${inv.booking.customer.lastName || ''}`.trim()
                    : tf('customer');
                  const car = inv.booking?.car
                    ? `${inv.booking.car.brand || ''} ${inv.booking.car.model || ''}`.trim()
                    : '';
                  return (
                    <option key={inv.id} value={inv.id}>
                      {who}{car ? ` · ${car}` : ''} — {money(inv.amount)} ({invoiceStatusLabel(inv.status)})
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                id="payment-invoice"
                name="invoiceId"
                required
                placeholder={tf('invoiceId')}
                className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-mono text-foreground outline-none focus:border-primary transition-all"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="payment-type" className="eyebrow px-1">{tf('type')}</label>
              <select id="payment-type" name="type" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all">
                <option value="INCOME">{tf('incomeOption')}</option>
                <option value="REFUND">{tf('refund')}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="payment-method" className="eyebrow px-1">{tf('method')}</label>
              <select id="payment-method" name="method" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary transition-all">
                <option value="CASH">{tf('methods.CASH')}</option>
                <option value="CARD">{tf('methods.CARD')}</option>
                <option value="TRANSFER">{tf('methods.TRANSFER')}</option>
                <option value="CHEQUE">{tf('methods.CHEQUE')}</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="payment-amount" className="eyebrow px-1">{tf('amountMad')}</label>
            <input id="payment-amount" name="amount" type="number" step="0.01" min="0.01" required className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm font-mono tabular text-foreground outline-none focus:border-primary transition-all" placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="payment-reference" className="eyebrow px-1">{tf('reference')}</label>
            <input id="payment-reference" name="reference" className="w-full bg-surface border border-hairline rounded-xl px-4 py-3.5 text-sm text-foreground outline-none focus:border-primary transition-all" placeholder={tf('referencePlaceholder')} />
          </div>
          <Button type="submit" className="w-full" isLoading={savingPayment}>{tf('confirmPayment')}</Button>
        </form>
      </Modal>
    </div>
  );
}
