"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
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

export default function FinancialBrain() {
  const { showToast } = useToast();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'pending'>('ledger');

  // Form & Ledger State
  const [ledger, setLedger] = useState([
    { id: 1, name: 'Rental: Dacia Logan', type: 'INCOME', method: 'BANK_TRANSFER', amount: 1200, color: 'text-success', status: 'VERIFIED' },
    { id: 2, name: 'Service: Oil Change', type: 'EXPENSE', method: 'CASH', amount: 800, color: 'text-danger', status: 'VERIFIED' },
    { id: 3, name: 'Rental: Renault Clio', type: 'INCOME', method: 'CASH', amount: 850, color: 'text-success', status: 'VERIFIED' },
    { id: 4, name: 'Office Rent', type: 'EXPENSE', method: 'BANK_TRANSFER', amount: 5000, color: 'text-danger', status: 'VERIFIED' },
  ]);

  const [pendingPayments, setPendingPayments] = useState([
    { id: 101, name: 'Deposit: Toyota Prado', method: 'BANK_TRANSFER', amount: 5000, customer: 'Omar T.' },
    { id: 102, name: 'Rental: Clio (3 Days)', method: 'CASH', amount: 1050, customer: 'Sara L.' },
  ]);

  const handleVerify = (id: number) => {
    const payment = pendingPayments.find(p => p.id === id);
    if (payment) {
      setLedger([{ 
        id: payment.id, 
        name: payment.name, 
        type: 'INCOME', 
        method: payment.method, 
        amount: payment.amount, 
        color: 'text-success',
        status: 'VERIFIED'
      }, ...ledger]);
      setPendingPayments(pendingPayments.filter(p => p.id !== id));
      showToast('success', 'Liquidity Verified', `Money from ${payment.customer} is now officially in the ledger.`);
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const amount = Number(formData.get('amount'));
    const category = formData.get('category') as string;
    
    const newEntry = {
      id: Date.now(),
      name: `Expense: ${category}`,
      type: 'EXPENSE',
      method: 'CASH',
      amount: amount,
      color: 'text-danger',
      status: 'VERIFIED'
    };

    setLedger([newEntry, ...ledger]);
    setIsExpenseModalOpen(false);
    showToast('success', 'Expense Recorded', `${amount} MAD has been deducted from the agency ledger.`);
  };

  const removeEntry = (id: number) => {
    setLedger(ledger.filter(l => l.id !== id));
    showToast('info', 'Ledger Corrected', 'Transaction entry has been voided.');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase tracking-tight">Financial Brain</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">ERP, Profitability & Cash Ledger</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => showToast('info', 'Exporting...', 'Preparing forensic financial statement for Q2.')}>Export Tax Report</Button>
          <Button onClick={() => setIsExpenseModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </header>

      {/* Financial HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-500/5 border-emerald-500/20 group hover:ring-1 ring-emerald-500/30 transition-all cursor-pointer">
           <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10 group-hover:scale-110 transition-transform">
                 <Wallet className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded tracking-[0.2em]">HEALTHY</span>
           </div>
           <CardTitle className="text-3xl font-black text-white">142,800 <span className="text-sm text-white/40 font-bold uppercase">MAD</span></CardTitle>
           <CardDescription className="font-bold uppercase tracking-widest mt-1">Net Profit Margin (82%)</CardDescription>
        </Card>

        <Card className="group hover:ring-1 ring-primary/30 transition-all cursor-pointer">
           <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10 group-hover:scale-110 transition-transform">
                 <Receipt className="w-6 h-6 text-primary" />
              </div>
              <div className="text-right">
                 <span className="flex items-center text-[11px] font-black text-success gap-1">
                   <ArrowUpRight className="w-3.5 h-3.5" /> 8%
                 </span>
              </div>
           </div>
           <CardTitle className="text-3xl font-black text-white">165,000 <span className="text-sm text-white/40 font-bold uppercase">MAD</span></CardTitle>
           <CardDescription className="font-bold uppercase tracking-widest mt-1">Gross Rental Income</CardDescription>
        </Card>

        <Card className="group hover:ring-1 ring-danger/30 transition-all cursor-pointer">
           <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center border border-danger/10 group-hover:scale-110 transition-transform">
                 <CreditCard className="w-6 h-6 text-danger" />
              </div>
              <div className="text-right">
                 <span className="flex items-center text-[11px] font-black text-danger gap-1">
                   <ArrowDownRight className="w-3.5 h-3.5" /> 15%
                 </span>
              </div>
           </div>
           <CardTitle className="text-3xl font-black text-white">22,200 <span className="text-sm text-white/40 font-bold uppercase">MAD</span></CardTitle>
           <CardDescription className="font-bold uppercase tracking-widest mt-1">Operating Expenses (OPEX)</CardDescription>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Ledger */}
        <div className="lg:col-span-8 space-y-6">
           <CardHeader className="px-0 flex-row items-center justify-between">
              <div>
                <CardTitle className="uppercase tracking-tight">Financial Ledger</CardTitle>
                <CardDescription className="font-bold">Institutional transaction flow</CardDescription>
              </div>
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                 <button 
                  onClick={() => setActiveTab('ledger')}
                  className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all", activeTab === 'ledger' ? "bg-primary text-white" : "text-white/40")}
                 >HISTORY</button>
                 <button 
                  onClick={() => setActiveTab('pending')}
                  className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all relative", activeTab === 'pending' ? "bg-amber-500 text-white" : "text-white/40")}
                 >
                   PENDING
                   {pendingPayments.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full animate-ping" />}
                 </button>
              </div>
           </CardHeader>
           
           <Card padding="none" className="overflow-hidden border-white/5 shadow-2xl">
              {activeTab === 'ledger' ? (
                <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Transaction Entity</th>
                        <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Protocol</th>
                        <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Method</th>
                        <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Magnitude</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {ledger.map((item, i) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-bold text-white group-hover:text-primary transition-colors uppercase tracking-tight">{item.name}</p>
                                  <p className="text-[10px] font-black text-white/10 uppercase">Index: #TX-{item.id.toString().slice(-4)}</p>
                                </div>
                                <button onClick={() => removeEntry(item.id)} className="p-2 text-white/10 hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest border", item.type === 'INCOME' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20')}>
                                {item.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[9px] font-black text-white/30 uppercase tracking-widest">{item.method.replace('_', ' ')}</td>
                          <td className={cn("px-6 py-4 text-sm font-black text-right tracking-tight", item.color)}>
                            {item.type === 'INCOME' ? '+' : '-'}{item.amount.toLocaleString()} MAD
                          </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="divide-y divide-white/5">
                   {pendingPayments.map((p) => (
                     <div key={p.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-6">
                           <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                              <Clock className="w-6 h-6 text-amber-500 animate-pulse" />
                           </div>
                           <div>
                              <h4 className="text-sm font-black text-white uppercase tracking-tight">{p.name}</h4>
                              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Customer: {p.customer} • {p.method}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-8">
                           <p className="text-lg font-black text-white">{p.amount.toLocaleString()} MAD</p>
                           <Button size="sm" className="bg-success hover:bg-success/80 border-none shadow-success/20" onClick={() => handleVerify(p.id)}>
                              Verify Liquidity
                           </Button>
                        </div>
                     </div>
                   ))}
                   {pendingPayments.length === 0 && (
                     <div className="py-20 text-center">
                        <CheckCircle2 className="w-12 h-12 text-white/5 mx-auto mb-4" />
                        <p className="text-xs font-black text-white/20 uppercase tracking-widest">No pending verifications</p>
                     </div>
                   )}
                </div>
              )}
           </Card>
        </div>

        {/* Financial Intelligence */}
        <div className="lg:col-span-4 space-y-8">
           <Card className="border-white/5">
              <CardHeader className="p-0 mb-8">
                 <CardTitle className="uppercase tracking-tighter">Expenditure Flux</CardTitle>
                 <TrendingUp className="w-4 h-4 text-white/20" />
              </CardHeader>
              <div className="space-y-6">
                 {[
                   { label: 'Maintenance', value: 45, color: 'bg-primary shadow-primary/40' },
                   { label: 'Staff Salaries', value: 30, color: 'bg-emerald-500 shadow-emerald-500/40' },
                   { label: 'Office & Rent', value: 15, color: 'bg-amber-500 shadow-amber-500/40' },
                   { label: 'Marketing', value: 10, color: 'bg-blue-500 shadow-blue-500/40' },
                 ].map((cat, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                         <span className="text-white/40">{cat.label}</span>
                         <span className="text-white/90">{cat.value}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                         <div className={cn("h-full transition-all duration-1000", cat.color)} style={{ width: `${cat.value}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
           </Card>

           <Card className="bg-primary/5 border-primary/20 relative overflow-hidden group">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform" />
              <div className="flex items-start gap-4 relative z-10">
                 <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                 <div>
                    <CardTitle className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">Audit Forecast</CardTitle>
                    <p className="text-xs text-white/60 leading-relaxed mt-2 font-medium italic">
                       "Q2 Tax estimation: **18,500 MAD**. Suggest increasing bank transfer liquidity to maintain 1:1 asset backing."
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
        title="Deduct Agency Liquidity"
        description="Sync operating expense to ledger"
      >
        <form onSubmit={handleAddExpense} className="space-y-6">
           <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Expense Protocol</p>
              <select name="category" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm font-bold text-white outline-none appearance-none focus:border-primary transition-all">
                 <option>Maintenance & Spare Parts</option>
                 <option>Staff Salary Payout</option>
                 <option>Real Estate / Rent</option>
                 <option>Marketing & Acquisition</option>
                 <option>Utility Infrastructure</option>
              </select>
           </div>
           <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Magnitude (MAD)</p>
              <div className="relative">
                 <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                 <input name="amount" type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-4 text-sm font-bold text-white outline-none focus:border-primary transition-all shadow-inner" placeholder="0.00" />
              </div>
           </div>
           <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Trace / Memo</p>
              <textarea name="desc" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm font-bold text-white outline-none focus:border-primary transition-all min-h-[100px]" placeholder="Briefly describe the transaction..." />
           </div>
           <div className="p-4 glass rounded-2xl flex items-center justify-between border-danger/20 bg-danger/[0.03]">
              <div className="flex items-center gap-3">
                 <History className="w-4 h-4 text-danger/40" />
                 <span className="text-[10px] font-black text-danger/60 uppercase tracking-widest">Auto-Deduct from Net Profit</span>
              </div>
              <div className="w-10 h-5 bg-danger/20 rounded-full relative cursor-pointer border border-danger/20">
                 <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-danger rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              </div>
           </div>
           <Button type="submit" variant="danger" className="w-full py-4 uppercase tracking-widest font-black">Confirm Expenditure</Button>
        </form>
      </Modal>
    </div>
  );
}
