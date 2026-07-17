"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, FileText, AlertTriangle, Upload, Eye, Download, Search, Filter, History, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/lib/contexts/ToastContext';

export default function GuardianVault() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired'>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const [allDocuments, setAllDocuments] = useState([
    { id: 1, car: 'Dacia Logan', plate: '12345-A-1', type: 'Insurance', expiry: '2 days', status: 'expired_soon', file: 'insurance_log_2026.pdf' },
    { id: 2, car: 'Renault Clio', plate: '98765-B-4', type: 'Technical Inspection', expiry: '14 days', status: 'warning', file: 'vt_clio_987.pdf' },
    { id: 3, car: 'Range Rover', plate: '55555-D-7', type: 'Vignette', expiry: '240 days', status: 'valid', file: 'vignette_rr_2026.pdf' },
    { id: 4, car: 'Hyundai i20', plate: '11223-G-2', type: 'Carte Grise', expiry: 'Valid', status: 'valid', file: 'cg_i20_main.pdf' },
    { id: 5, car: 'Dacia Duster', plate: '44332-H-9', type: 'Insurance', expiry: 'EXPIRED', status: 'danger', file: 'old_ins_443.pdf' },
  ]);

  const filteredDocs = allDocuments.filter(doc => {
    if (filter === 'expiring') return doc.status === 'expired_soon' || doc.status === 'warning';
    if (filter === 'expired') return doc.status === 'danger';
    return true;
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('success', 'Document Processed', 'AES-256 encryption applied and asset linked.');
    setIsUploadModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Guardian Vault</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">Centralized Fleet Compliance & Legal Docs</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => showToast('info', 'Archive Loaded', 'Retrieving historical compliance data...')}>
            <History className="w-4 h-4 mr-2" />
            Archive
          </Button>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            New Upload
          </Button>
        </div>
      </header>

      {/* Summary HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button onClick={() => setFilter('all')} className={cn("glass-card p-6 text-left transition-all", filter === 'all' && "border-primary ring-1 ring-primary/50 bg-primary/5")}>
           <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Assets</p>
           <p className="text-3xl font-black text-white">{allDocuments.length}</p>
        </button>
        <button onClick={() => setFilter('expiring')} className={cn("glass-card p-6 text-left transition-all", filter === 'expiring' && "border-amber-500 ring-1 ring-amber-500/50 bg-amber-500/5")}>
           <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Expiring Soon</p>
           <p className="text-3xl font-black text-white">2</p>
        </button>
        <button onClick={() => setFilter('expired')} className={cn("glass-card p-6 text-left transition-all", filter === 'expired' && "border-danger ring-1 ring-danger/50 bg-danger/5")}>
           <p className="text-[10px] font-black text-danger uppercase tracking-widest mb-1">Hard Locked</p>
           <p className="text-3xl font-black text-white">1</p>
        </button>
      </div>

      {/* Document List */}
      <Card padding="none" className="overflow-hidden border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
           <div className="flex items-center gap-4 flex-1 max-w-md">
              <Search className="w-4 h-4 text-white/20" />
              <input placeholder="Search asset or document type..." className="bg-transparent border-none outline-none text-sm font-bold text-white w-full placeholder:text-white/10" />
           </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Document Entity</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Linked Car</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Validity</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border",
                      doc.status === 'danger' ? 'bg-danger/10 text-danger border-danger/20' : 
                      doc.status === 'valid' ? 'bg-success/10 text-success border-success/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    )}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">{doc.type}</p>
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{doc.file}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div>
                      <p className="text-sm font-bold text-white">{doc.car}</p>
                      <p className="text-[10px] font-black text-primary/60 uppercase">{doc.plate}</p>
                   </div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex flex-col">
                      <span className={cn(
                        "text-xs font-black",
                        doc.status === 'danger' ? 'text-danger' : 
                        doc.status === 'valid' ? 'text-success' : 'text-amber-500'
                      )}>
                        {doc.expiry.toUpperCase()}
                      </span>
                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{doc.status.replace('_', ' ')}</span>
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0" onClick={() => setSelectedDoc(doc)}>
                        <Eye className="w-4 h-4 text-white/40" />
                      </Button>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <Download className="w-4 h-4 text-white/40" />
                      </Button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Ingest Legal Document"
        description="Sync new compliance file to vehicle asset"
      >
        <form onSubmit={handleUpload} className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Asset ID</p>
                 <select required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none">
                    <option>Select Vehicle...</option>
                    <option>Dacia Logan (12345-A-1)</option>
                    <option>Renault Clio (98765-B-4)</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Doc Type</p>
                 <select required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none">
                    <option>INSURANCE</option>
                    <option>VISITE TECHNIQUE</option>
                    <option>VIGNETTE</option>
                    <option>CARTE GRISE</option>
                 </select>
              </div>
           </div>
           <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Expiry Date</p>
              <input type="date" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary transition-colors" />
           </div>
           <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer group">
              <Upload className="w-8 h-8 text-white/20 mx-auto mb-3 group-hover:text-primary transition-colors" />
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Drop PDF or Scan Image</p>
              <p className="text-[9px] font-medium text-white/10 mt-1 uppercase">Max Size: 10MB</p>
           </div>
           <Button type="submit" className="w-full">Upload & Sync</Button>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title="Document Intelligence"
        description={`${selectedDoc?.type} • PL: ${selectedDoc?.plate}`}
      >
        <div className="space-y-6">
           <div className="aspect-[3/4] bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
              <FileText className="w-16 h-16 text-white/5" />
              <p className="absolute text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">Forensic Preview</p>
           </div>
           <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedDoc(null)}>Close</Button>
              <Button className="flex-1">
                 <Download className="w-4 h-4 mr-2" />
                 Download
              </Button>
           </div>
        </div>
      </Modal>
    </div>
  );
}
