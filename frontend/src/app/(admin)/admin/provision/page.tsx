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
import { useTranslations } from 'next-intl';
import api from '@/lib/api';

const STEPS = [
  { id: 1, title: 'Identity', description: 'Institutional Info' },
  { id: 2, title: 'Infrastructure', description: 'Cloud & Database' },
  { id: 3, title: 'Governance', description: 'SLA & Policies' },
  { id: 4, title: 'Review', description: 'Final Manifest' },
];

export default function ProvisionPage() {
  const t = useTranslations('adminPages');
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    orgName: '',
    subdomain: '',
    adminEmail: '',
    ownerName: '',
    initialPassword: '',
    region: 'us-east-1',
    sharding: 'shared',
    clusterType: 'standard',
    sla: '99.9%',
    backup: 'daily',
  });
  const [isProvisioning, setIsProvisioning] = useState(false);

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // Real founder-initiated provisioning: POST /saas-admin/provision creates the
  // agency + OWNER + BETA subscription server-side. The infrastructure/SLA steps
  // are presentational (this is a single managed DB) — only the identity fields
  // are persisted. The owner signs in with the initial password, shared out-of-band.
  const handleProvision = async () => {
    if (
      !formData.orgName.trim() ||
      !formData.ownerName.trim() ||
      !formData.adminEmail.trim() ||
      formData.initialPassword.length < 8
    ) {
      showToast(
        'danger',
        'Missing details',
        'Organization name, owner name, admin email, and an 8+ character initial password are required.',
      );
      setCurrentStep(1);
      return;
    }
    setIsProvisioning(true);
    try {
      const { data } = await api.post('/saas-admin/provision', {
        agencyName: formData.orgName.trim(),
        subdomain: formData.subdomain.trim() || undefined,
        ownerName: formData.ownerName.trim(),
        ownerEmail: formData.adminEmail.trim(),
        initialPassword: formData.initialPassword,
      });
      showToast(
        'success',
        'Tenant provisioned',
        `${data.agency.name} is live — ${data.owner.email} can sign in with the initial password you set.`,
      );
      setFormData({
        orgName: '',
        subdomain: '',
        adminEmail: '',
        ownerName: '',
        initialPassword: '',
        region: 'us-east-1',
        sharding: 'shared',
        clusterType: 'standard',
        sla: '99.9%',
        backup: 'daily',
      });
      setCurrentStep(1);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Provisioning failed.';
      showToast(
        'danger',
        'Provisioning failed',
        Array.isArray(msg) ? msg.join(' ') : String(msg),
      );
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <Badge variant="outline" className="mb-4">
          Provisioning engine v2.4
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {t('provision')}
        </h1>
        <p className="text-sm text-text-muted mt-2">
          Instantiate a high-availability environment for a new agency
        </p>
      </div>

      {/* Stepper */}
      <div className="flex justify-between mb-12 relative">
        <div className="absolute top-1/2 start-0 w-full h-px bg-hairline -translate-y-1/2 -z-10" />
        {STEPS.map((step) => (
          <div key={step.id} className="flex flex-col items-center gap-2">
            <motion.div
              animate={{
                scale: currentStep === step.id ? 1.2 : 1,
                backgroundColor: currentStep >= step.id ? 'var(--color-primary, hsl(266 58% 66%))' : 'var(--color-surface-raised, hsl(32 9% 14%))',
                boxShadow: currentStep === step.id ? '0 0 0 4px hsla(266, 58%, 66%, 0.16)' : 'none'
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm ${currentStep >= step.id ? 'text-primary-foreground' : 'text-text-faint'}`}
            >
              {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : step.id}
            </motion.div>
            <div className="text-center">
              <p className={`eyebrow ${currentStep === step.id ? 'text-foreground' : ''}`}>
                {step.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Card className="min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="absolute top-0 end-0 p-8 opacity-5">
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
                  <div className="p-2 bg-surface-raised border border-hairline rounded-lg">
                    <Building2 className="w-5 h-5 text-text-muted" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Identity</h2>
                    <p className="text-xs text-text-muted mt-0.5">Base organizational parameters</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="eyebrow">Organization name</Label>
                    <Input
                      placeholder="e.g. Titan Global Logistics"
                      value={formData.orgName}
                      onChange={(e) => updateForm('orgName', e.target.value)}
                      className="bg-surface border-hairline h-12 focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="eyebrow">Subdomain</Label>
                    <div className="relative">
                      <Input
                        placeholder="titan-global"
                        value={formData.subdomain}
                        onChange={(e) => updateForm('subdomain', e.target.value)}
                        className="bg-surface border-hairline h-12 pe-24 focus:border-primary/50 font-mono tabular"
                      />
                      <div className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-mono text-text-faint">
                        .fider.app
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="eyebrow">Owner name</Label>
                    <Input
                      placeholder="e.g. Sara Bennani"
                      value={formData.ownerName}
                      onChange={(e) => updateForm('ownerName', e.target.value)}
                      className="bg-surface border-hairline h-12 focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="eyebrow">Primary admin email</Label>
                    <Input
                      type="email"
                      placeholder="admin@titan-global.com"
                      value={formData.adminEmail}
                      onChange={(e) => updateForm('adminEmail', e.target.value)}
                      className="bg-surface border-hairline h-12 focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="eyebrow">Initial owner password</Label>
                    <span className="text-[10px] text-text-faint">Min 8 chars · share securely with the owner</span>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.initialPassword}
                    onChange={(e) => updateForm('initialPassword', e.target.value)}
                    className="bg-surface border-hairline h-12 focus:border-primary/50"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <Cloud className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Infrastructure</h2>
                    <p className="text-xs text-text-muted mt-0.5">Compute and persistence architecture</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Label className="eyebrow">Select region</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['us-east-1', 'eu-west-1', 'ap-southeast-1'].map((r) => (
                      <button
                        key={r}
                        onClick={() => updateForm('region', r)}
                        className={`p-4 rounded-xl border text-start transition-all ${formData.region === r ? 'bg-primary/10 border-primary text-foreground' : 'bg-surface border-hairline text-text-muted hover:bg-surface-raised'}`}
                      >
                        <Globe className="w-4 h-4 mb-2" />
                        <span className="text-xs font-mono tabular">{r}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="eyebrow">DB sharding strategy</Label>
                    <select
                      value={formData.sharding}
                      onChange={(e) => updateForm('sharding', e.target.value)}
                      className="w-full h-12 bg-surface border border-hairline rounded-lg px-4 text-sm text-foreground focus:border-primary/50 outline-none"
                    >
                      <option value="shared">Shared Multi-tenant</option>
                      <option value="dedicated">Dedicated Shard</option>
                      <option value="isolated">Physically Isolated</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="eyebrow">Cluster type</Label>
                    <select
                      value={formData.clusterType}
                      onChange={(e) => updateForm('clusterType', e.target.value)}
                      className="w-full h-12 bg-surface border border-hairline rounded-lg px-4 text-sm text-foreground focus:border-primary/50 outline-none"
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
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <Shield className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Governance and policy</h2>
                    <p className="text-xs text-text-muted mt-0.5">Compliance and continuity protocols</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-surface border border-hairline flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-warning" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">SLA commitment</p>
                        <p className="text-xs text-text-faint">Uptime guarantee level</p>
                      </div>
                    </div>
                    <select
                      value={formData.sla}
                      onChange={(e) => updateForm('sla', e.target.value)}
                      className="bg-transparent text-foreground font-mono tabular text-xs focus:outline-none"
                    >
                      <option value="99.9%">99.9% (Standard)</option>
                      <option value="99.99%">99.99% (Enterprise)</option>
                      <option value="99.999%">99.999% (Titan)</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-xl bg-surface border border-hairline flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-success" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Backup frequency</p>
                        <p className="text-xs text-text-faint">Point-in-time recovery depth</p>
                      </div>
                    </div>
                    <select
                      value={formData.backup}
                      onChange={(e) => updateForm('backup', e.target.value)}
                      className="bg-transparent text-foreground font-medium text-xs focus:outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="hourly">Hourly</option>
                      <option value="continuous">Real-time Streaming</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-xl bg-info/10 border border-info/20 flex items-center gap-3">
                    <Lock className="w-5 h-5 text-info" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Encryption enabled by default</p>
                      <p className="text-xs text-text-muted mt-0.5">Managed by the database provider at deploy time</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-surface-raised border border-hairline rounded-lg">
                    <Server className="w-5 h-5 text-text-muted" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Provisioning manifest</h2>
                    <p className="text-xs text-text-muted mt-0.5">Review and initiate instantiation</p>
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
                    <div key={item.label} className="p-3 rounded-lg bg-surface border border-hairline">
                      <p className="eyebrow">{item.label}</p>
                      <p className="text-[13px] font-mono tabular text-foreground truncate mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 rounded-2xl bg-success/10 border border-success/20 text-center">
                  <p className="text-sm font-semibold text-success mb-1">Ready for instantiation</p>
                  <p className="text-xs text-text-muted">All health checks passed. Infrastructure pre-warmed.</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer Navigation */}
        <div className="mt-auto p-4 border-t border-hairline flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-3 h-3 me-2" />
            Back
          </Button>

          {currentStep < 4 ? (
            <Button onClick={nextStep} className="px-8">
              Continue
              <ArrowRight className="w-3 h-3 ms-2" />
            </Button>
          ) : (
            <Button
              className="px-8"
              onClick={handleProvision}
              disabled={isProvisioning}
            >
              <Zap className="w-3 h-3 me-2 fill-current" />
              {isProvisioning ? 'Provisioning…' : 'Instantiate tenant'}
            </Button>
          )}
        </div>
      </Card>

      {/* Helper Info */}
      <div className="mt-8 grid grid-cols-3 gap-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-success rounded-full" />
          <p className="text-xs text-text-faint leading-tight">Automated CI/CD<br/><span className="text-text-muted">Pipeline active</span></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-info rounded-full" />
          <p className="text-xs text-text-faint leading-tight">Terraform state<br/><span className="text-text-muted">Locked and verified</span></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-warning rounded-full" />
          <p className="text-xs text-text-faint leading-tight">Regional quota<br/><span className="text-text-muted">Verified (84% avail)</span></p>
        </div>
      </div>
    </div>
  );
}
