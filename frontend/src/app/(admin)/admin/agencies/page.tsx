"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  Plus, 
  Trash2, 
  Activity, 
  Shield, 
  Globe, 
  CheckCircle2, 
  MoreVertical,
  Mail,
  Lock,
  Zap,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';

export default function AgencyManagement() {
  const { showToast } = useToast();
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<any>(null);

  const [agencies, setAgencies] = useState([
    { id: 1, name: 'CIG CAR Casablanca', subdomain: 'cig-casablanca', owner: 'Hamza E.', plan: 'BUSINESS', status: 'ACTIVE', revenue: '125,000 MAD' },
    { id: 2, name: 'Atlas Rentals Marrakech', subdomain: 'atlas-marrakech', owner: 'Omar T.', plan: 'PRO', status: 'ACTIVE', revenue: '98,000 MAD' },
    { id: 3, name: 'Sahara Fleet Agadir', subdomain: 'sahara-agadir', owner: 'Yassine M.', plan: 'STARTER', status: 'ACTIVE', revenue: '76,500 MAD' },
    { id: 4, name: 'City Drive Tangier', subdomain: 'city-tangier', owner: 'Amine L.', plan: 'PRO', status: 'SUSPENDED', revenue: '0 MAD' },
  ]);

  const handleProvision = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    showToast('success', 'Agency Provisioned', `${name} is now live on the infrastructure.`);
    setIsProvisionModalOpen(false);
  };

  const toggleStatus = (id: number) => {
    setAgencies(agencies.map(a => 
      a.id === id ? { ...a, status: a.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : a
    ));
    showToast('warning', 'Status Modified', 'Agency access permissions have been updated.');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase tracking-tight">Agency Management</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-success" />
             Infrastructure Status: 100% Operational
          </p>
        </div>
        <Button onClick={() => setIsProvisionModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Provision Agency
        </Button>
      </header>

      <Card padding="none" className="overflow-hidden border-white/5 shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Agency Entity</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Subscription</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Revenue</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {agencies.map((agency) => (
              <tr key={agency.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {agency.name?.[0] || 'A'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-primary transition-colors uppercase tracking-tight">{agency.name}</p>
                      <p className="text-[10px] font-medium text-white/40">{agency.subdomain}.carhub.os</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className="text-[9px] font-black bg-white/5 border border-white/10 px-2 py-1 rounded-md text-white/60 tracking-widest">
                     {agency.plan}
                   </span>
                </td>
                <td className="px-6 py-4 text-xs font-black text-white/80">
                   {agency.revenue}
                </td>
                <td className="px-6 py-4">
                   <span className={cn(
                     "text-[9px] font-black px-2 py-1 rounded-md tracking-widest border",
                     agency.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'
                   )}>
                     {agency.status}
                   </span>
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="text-[9px] h-auto py-1.5" onClick={() => showToast('pulse', 'Impersonating...', `Entering forensic session for ${agency.name}`)}>
                         Impersonate
                      </Button>
                      <button onClick={() => toggleStatus(agency.id)} className="p-2 text-white/20 hover:text-white transition-colors">
                         <Lock className="w-4 h-4" />
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Provision Modal */}
      <Modal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        title="Provision New Agency"
        description="Instantiate high-performance tenant sandbox"
      >
        <form onSubmit={handleProvision} className="space-y-6">
           <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Agency Brand Name</p>
              <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary transition-colors" placeholder="e.g. Atlas Drive Marrakech" />
           </div>
           <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Subdomain Route</p>
              <div className="flex">
                 <input name="subdomain" required className="flex-1 bg-white/5 border border-white/10 rounded-l-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary transition-colors" placeholder="atlas-drive" />
                 <div className="bg-white/10 border border-l-0 border-white/10 rounded-r-xl px-4 flex items-center text-[10px] font-black text-white/40">.carhub.os</div>
              </div>
           </div>
           <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Select Tier</p>
              <div className="grid grid-cols-3 gap-3">
                 {['STARTER', 'PRO', 'BUSINESS'].map(t => (
                    <label key={t} className="cursor-pointer group">
                       <input type="radio" name="tier" value={t} defaultChecked={t === 'PRO'} className="sr-only peer" />
                       <div className="p-3 rounded-xl border border-white/10 bg-white/5 text-center peer-checked:border-primary peer-checked:bg-primary/10 transition-all group-hover:border-white/20">
                          <p className="text-[9px] font-black text-white uppercase tracking-widest">{t}</p>
                       </div>
                    </label>
                 ))}
              </div>
           </div>
           <div className="p-4 glass-card border-success/20 flex items-center gap-3">
              <Zap className="w-4 h-4 text-success" />
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-tight">Database schemas and DNS routes will auto-generate.</p>
           </div>
           <Button type="submit" className="w-full">Initialize Tenant</Button>
        </form>
      </Modal>
    </div>
  );
}
