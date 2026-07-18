'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Cloud, 
  Database, 
  Globe, 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Server,
  Zap,
  Lock,
  Box
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/contexts/ToastContext';

const STEPS = [
  { id: 1, title: 'Identity', description: 'Institutional Info' },
  { id: 2, title: 'Infrastructure', description: 'Cloud & Database' },
  { id: 3, title: 'Governance', description: 'SLA & Policies' },
  { id: 4, title: 'Review', description: 'Final Manifest' },
];

export default function ProvisionPage() {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    orgName: '',
    subdomain: '',
    adminEmail: '',
    region: 'us-east-1',
    sharding: 'shared',
    clusterType: 'standard',
    sla: '99.9%',
    backup: 'daily',
  });

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <Badge variant="outline" className="mb-4 border-primary/20 text-primary bg-primary/5">
          Enterprise Provisioning Engine v2.4
        </Badge>
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
          Institutional <span className="text-primary">Provisioning</span>
        </h1>
        <p className="text-white/40 font-bold uppercase tracking-widest text-[11px] mt-1">
          Instantiate high-availability enterprise environments
        </p>
      </div>

      {/* Stepper */}
      <div className="flex justify-between mb-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2 -z-10" />
        {STEPS.map((step) => (
          <div key={step.id} className="flex flex-col items-center gap-2">
            <motion.div 
              animate={{ 
                scale: currentStep === step.id ? 1.2 : 1,
                backgroundColor: currentStep >= step.id ? 'var(--color-primary, #3b82f6)' : 'rgba(255,255,255,0.05)',
                boxShadow: currentStep === step.id ? '0 0 20px rgba(59,130,246,0.5)' : 'none'
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${currentStep >= step.id ? 'text-white' : 'text-white/20'}`}
            >
              {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : step.id}
            </motion.div>
            <div className="text-center">
              <p className={`text-[10px] font-black uppercase tracking-tighter ${currentStep === step.id ? 'text-white' : 'text-white/20'}`}>
                {step.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Card className="min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Box className="w-64 h-64 rotate-12" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 p-4"
          >
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white italic underline decoration-primary/50 underline-offset-4">IDENTITY MANIFEST</h2>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Base organizational parameters</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white/60 font-black uppercase text-[10px]">Organization Name</Label>
                    <Input 
                      placeholder="e.g. Titan Global Logistics"
                      value={formData.orgName}
                      onChange={(e) => updateForm('orgName', e.target.value)}
                      className="bg-white/5 border-white/10 h-12 focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/60 font-black uppercase text-[10px]">Subdomain</Label>
                    <div className="relative">
                      <Input 
                        placeholder="titan-global"
                        value={formData.subdomain}
                        onChange={(e) => updateForm('subdomain', e.target.value)}
                        className="bg-white/5 border-white/10 h-12 pr-24 focus:border-primary/50"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20">
                        .fider.app
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/60 font-black uppercase text-[10px]">Primary Admin Email</Label>
                  <Input 
                    type="email"
                    placeholder="admin@titan-global.com"
                    value={formData.adminEmail}
                    onChange={(e) => updateForm('adminEmail', e.target.value)}
                    className="bg-white/5 border-white/10 h-12 focus:border-primary/50"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Cloud className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white italic underline decoration-emerald-500/50 underline-offset-4">INFRASTRUCTURE CORE</h2>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Compute and Persistence Architecture</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Label className="text-white/60 font-black uppercase text-[10px]">Select Region</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['us-east-1', 'eu-west-1', 'ap-southeast-1'].map((r) => (
                      <button
                        key={r}
                        onClick={() => updateForm('region', r)}
                        className={`p-4 rounded-xl border text-left transition-all ${formData.region === r ? 'bg-primary/20 border-primary text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                      >
                        <Globe className="w-4 h-4 mb-2" />
                        <span className="text-xs font-black uppercase tracking-tighter">{r}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white/60 font-black uppercase text-[10px]">DB Sharding Strategy</Label>
                    <select 
                      value={formData.sharding}
                      onChange={(e) => updateForm('sharding', e.target.value)}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-sm text-white focus:border-primary/50 outline-none"
                    >
                      <option value="shared">Shared Multi-tenant</option>
                      <option value="dedicated">Dedicated Shard</option>
                      <option value="isolated">Physically Isolated</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/60 font-black uppercase text-[10px]">Cluster Type</Label>
                    <select 
                      value={formData.clusterType}
                      onChange={(e) => updateForm('clusterType', e.target.value)}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-sm text-white focus:border-primary/50 outline-none"
                    >
                      <option value="standard">Standard (General Purpose)</option>
                      <option value="performance">High Performance (Optimized)</option>
                      <option value="enterprise">Mission Critical (Max HA)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Shield className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white italic underline decoration-amber-500/50 underline-offset-4">GOVERNANCE & POLICY</h2>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Compliance and Continuity Protocols</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="text-sm font-black text-white uppercase italic">SLA Commitment</p>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Uptime guarantee level</p>
                      </div>
                    </div>
                    <select 
                      value={formData.sla}
                      onChange={(e) => updateForm('sla', e.target.value)}
                      className="bg-transparent text-white font-black uppercase text-xs focus:outline-none"
                    >
                      <option value="99.9%">99.9% (Standard)</option>
                      <option value="99.99%">99.99% (Enterprise)</option>
                      <option value="99.999%">99.999% (Titan)</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-black text-white uppercase italic">Backup Frequency</p>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Point-in-time recovery depth</p>
                      </div>
                    </div>
                    <select 
                      value={formData.backup}
                      onChange={(e) => updateForm('backup', e.target.value)}
                      className="bg-transparent text-white font-black uppercase text-xs focus:outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="hourly">Hourly</option>
                      <option value="continuous">Real-time Streaming</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                    <Lock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs font-black text-white uppercase">Military-Grade Encryption Enabled</p>
                      <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">AES-256-GCM at rest and in transit</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Server className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white italic underline decoration-primary/50 underline-offset-4">PROVISIONING MANIFEST</h2>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Review and Initiate Instantiation</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Organization', value: formData.orgName || 'Not Set' },
                    { label: 'Identity', value: `${formData.subdomain}.fider.app` },
                    { label: 'Admin', value: formData.adminEmail || 'Not Set' },
                    { label: 'Cloud Region', value: formData.region.toUpperCase() },
                    { label: 'DB Architecture', value: formData.sharding.toUpperCase() },
                    { label: 'SLA Tier', value: formData.sla },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">{item.label}</p>
                      <p className="text-sm font-bold text-white uppercase tracking-tighter italic">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-xs font-black text-emerald-400 uppercase mb-2">Ready for Instantiation</p>
                  <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest">All health checks passed. Infrastructure pre-warmed.</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer Navigation */}
        <div className="mt-auto p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
          <Button 
            variant="ghost" 
            onClick={prevStep}
            disabled={currentStep === 1}
            className="text-white/40 hover:text-white"
          >
            <ArrowLeft className="w-3 h-3 mr-2" />
            Back
          </Button>

          {currentStep < 4 ? (
            <Button onClick={nextStep} className="bg-primary px-8">
              Continue
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          ) : (
            <Button 
              className="bg-emerald-500 shadow-emerald-500/20 px-8"
              onClick={() => showToast('success', 'Tenant Provisioned', 'Infrastructure and databases have been initialized.')}
            >
              <Zap className="w-3 h-3 mr-2 fill-current" />
              INSTANTIATE TENANT
            </Button>
          )}
        </div>
      </Card>

      {/* Helper Info */}
      <div className="mt-8 grid grid-cols-3 gap-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-primary rounded-full" />
          <p className="text-[9px] text-white/40 font-bold uppercase leading-tight">Automated CI/CD<br/><span className="text-white/60">Pipeline Active</span></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-emerald-500 rounded-full" />
          <p className="text-[9px] text-white/40 font-bold uppercase leading-tight">Terraform State<br/><span className="text-white/60">Locked & Verified</span></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-amber-500 rounded-full" />
          <p className="text-[9px] text-white/40 font-bold uppercase leading-tight">Regional Quota<br/><span className="text-white/60">Verified (84% Avail)</span></p>
        </div>
      </div>
    </div>
  );
}
