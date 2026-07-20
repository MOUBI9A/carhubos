"use client";

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, FileText, AlertTriangle, Upload, Eye, Download, Search, Filter, History, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/lib/contexts/ToastContext';

export default function GuardianVault() {
  const t = useTranslations('ownerPages');
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
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('guardianVault')}</h1>
          <p className="mt-1.5 text-sm text-text-muted">Fleet compliance and legal documents, in one place</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => showToast('info', 'Archive Loaded', 'Retrieving historical compliance data...')}>
            <History className="w-4 h-4 me-2" />
            Archive
          </Button>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="w-4 h-4 me-2" />
            New upload
          </Button>
        </div>
      </header>

      {/* Summary HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button onClick={() => setFilter('all')} className={cn("rounded-2xl bg-surface border border-hairline p-6 text-start transition-all hover:bg-surface-raised", filter === 'all' && "ring-1 ring-primary/40")}>
           <p className="eyebrow mb-2">All documents</p>
           <p className="text-3xl font-semibold tracking-tight text-foreground font-mono tabular">{allDocuments.length}</p>
        </button>
        <button onClick={() => setFilter('expiring')} className={cn("rounded-2xl bg-surface border border-hairline p-6 text-start transition-all hover:bg-surface-raised", filter === 'expiring' && "ring-1 ring-primary/40")}>
           <p className="eyebrow text-warning mb-2">Expiring soon</p>
           <p className="text-3xl font-semibold tracking-tight text-foreground font-mono tabular">2</p>
        </button>
        <button onClick={() => setFilter('expired')} className={cn("rounded-2xl bg-surface border border-hairline p-6 text-start transition-all hover:bg-surface-raised", filter === 'expired' && "ring-1 ring-primary/40")}>
           <p className="eyebrow text-danger mb-2">Expired</p>
           <p className="text-3xl font-semibold tracking-tight text-foreground font-mono tabular">1</p>
        </button>
      </div>

      {/* Document List */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-hairline flex items-center justify-between">
           <div className="flex items-center gap-4 flex-1 max-w-md">
              <Search className="w-4 h-4 text-text-faint" />
              <input placeholder="Search asset or document type..." className="bg-transparent border-none outline-none text-sm text-foreground w-full placeholder:text-text-faint" />
           </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-hairline">
              <th className="eyebrow px-6 py-3 text-start">Document</th>
              <th className="eyebrow px-6 py-3 text-start">Vehicle</th>
              <th className="eyebrow px-6 py-3 text-start">Validity</th>
              <th className="eyebrow px-6 py-3 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="border-b border-hairline last:border-0 hover:bg-surface-raised transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border",
                      doc.status === 'danger' ? 'bg-danger/10 text-danger border-danger/20' :
                      doc.status === 'valid' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'
                    )}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.type}</p>
                      <p className="mt-0.5 text-xs text-text-faint">{doc.file}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div>
                      <p className="text-sm font-medium text-foreground">{doc.car}</p>
                      <p className="mt-0.5 font-mono tabular text-xs text-text-faint">{doc.plate}</p>
                   </div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex flex-col">
                      <span className={cn(
                        "text-xs font-medium",
                        doc.status === 'danger' ? 'text-danger' :
                        doc.status === 'valid' ? 'text-success' : 'text-warning'
                      )}>
                        {doc.expiry}
                      </span>
                      <span className="eyebrow mt-0.5">{doc.status.replace('_', ' ')}</span>
                   </div>
                </td>
                <td className="px-6 py-4 text-end">
                   <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0" onClick={() => setSelectedDoc(doc)}>
                        <Eye className="w-4 h-4 text-text-muted" />
                      </Button>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <Download className="w-4 h-4 text-text-muted" />
                      </Button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload document"
        description="Link a compliance file to a vehicle"
      >
        <form onSubmit={handleUpload} className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <p className="eyebrow px-1">Vehicle</p>
                 <select required className="w-full bg-surface border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors">
                    <option>Select vehicle...</option>
                    <option>Dacia Logan (12345-A-1)</option>
                    <option>Renault Clio (98765-B-4)</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <p className="eyebrow px-1">Document type</p>
                 <select required className="w-full bg-surface border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors">
                    <option>Insurance</option>
                    <option>Visite technique</option>
                    <option>Vignette</option>
                    <option>Carte grise</option>
                 </select>
              </div>
           </div>
           <div className="space-y-1.5">
              <p className="eyebrow px-1">Expiry date</p>
              <input type="date" required className="w-full bg-surface border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors" />
           </div>
           <div className="border-2 border-dashed border-hairline rounded-2xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer group">
              <Upload className="w-8 h-8 text-text-faint mx-auto mb-3 group-hover:text-primary transition-colors" />
              <p className="text-sm font-medium text-foreground">Drop a PDF or scan image</p>
              <p className="mt-1 text-xs text-text-faint">Max size 10 MB</p>
           </div>
           <Button type="submit" className="w-full">Upload & Sync</Button>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title="Document preview"
        description={`${selectedDoc?.type} • ${selectedDoc?.plate}`}
      >
        <div className="space-y-6">
           <div className="document relative aspect-[3/4] rounded-2xl flex items-center justify-center">
              <FileText className="w-16 h-16 opacity-10" />
              <p className="absolute text-xs font-medium tracking-wide opacity-50">Document preview</p>
           </div>
           <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedDoc(null)}>Close</Button>
              <Button className="flex-1">
                 <Download className="w-4 h-4 me-2" />
                 Download
              </Button>
           </div>
        </div>
      </Modal>
    </div>
  );
}
