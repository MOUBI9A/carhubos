'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Database,
  Globe,
  Server,
  TrendingUp,
  Users,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

// --- Mock Data ---
const INFRA_HEALTH = [
  { region: 'US-East-1', status: 'Healthy', latency: '24ms', load: 42 },
  { region: 'EU-West-1', status: 'Healthy', latency: '31ms', load: 38 },
  { region: 'AP-Southeast-1', status: 'Warning', latency: '142ms', load: 89 },
  { region: 'SA-East-1', status: 'Healthy', latency: '45ms', load: 12 },
];

const METRICS = [
  { label: 'Global GMV', value: '$4.2M', change: '+12.5%', trending: 'up' },
  { label: 'Agency Churn', value: '0.8%', change: '-0.2%', trending: 'down' },
  { label: 'Retention', value: '99.2%', change: '+0.4%', trending: 'up' },
  { label: 'Active Tenants', value: '142', change: '+8', trending: 'up' },
];

const DB_THROUGHPUT = [40, 45, 38, 52, 60, 58, 65, 70, 68, 72, 80, 85, 82, 78, 85, 90, 95, 88, 82, 85];
const SERVER_LATENCY = [22, 24, 21, 25, 30, 28, 26, 24, 22, 23, 25, 27, 24, 22, 21, 23, 24, 25, 22, 21];

// --- Simple Visualizers ---

const MiniAreaChart = ({ data, color }: { data: number[], color: string }) => {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-[2px] h-12 w-full">
      {data.map((val, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(val / max) * 100}%` }}
          transition={{ delay: i * 0.05, duration: 0.5 }}
          className={`flex-1 rounded-t-[1px] ${color}`}
        />
      ))}
    </div>
  );
};

const PulseBar = ({ value, label, sublabel, icon: Icon, color }: any) => (
  <Card variant="flat" className="flex items-center gap-4">
    <div className="p-3 rounded-xl bg-surface-raised border border-hairline">
      <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="eyebrow text-text-faint">{label}</span>
        <span className="text-xs font-semibold font-mono tabular text-foreground">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value.replace('%', '') / 100) * 100}%` }}
          className={`h-full ${color}`}
        />
      </div>
      <p className="text-[10px] text-text-faint mt-1">{sublabel}</p>
    </div>
  </Card>
);

export default function PulsePage() {
  const t = useTranslations('adminPages');
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Badge variant="outline" className="mb-2">
            System Level: God Mode
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t('globalPulse')}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time multi-tenant infrastructure oversight
          </p>
        </motion.div>

        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            Export Logs
          </Button>
          <Button size="sm">
            <Zap className="w-3 h-3 fill-current" />
            Live Sync
          </Button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {METRICS.map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="relative overflow-hidden group">
              <div className="absolute top-0 end-0 p-4">
                {metric.trending === 'up' ? (
                  <ArrowUpRight className="w-4 h-4 text-success" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-danger" />
                )}
              </div>
              <CardDescription>{metric.label}</CardDescription>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-semibold font-mono tabular text-foreground">{metric.value}</span>
                <span className={`text-xs font-medium font-mono tabular ${metric.trending === 'up' ? 'text-success' : 'text-danger'}`}>
                  {metric.change}
                </span>
              </div>
              <div className="mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <MiniAreaChart
                  data={Array.from({ length: 20 }, () => Math.random() * 100)}
                  color="bg-primary"
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Infrastructure Health */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <CardTitle>Regional infrastructure health</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px]">4 Regions Active</Badge>
          </CardHeader>

          <div className="space-y-4 mt-6">
            {INFRA_HEALTH.map((infra) => (
              <div key={infra.region} className="flex items-center justify-between p-4 rounded-xl bg-surface border border-hairline hover:bg-surface-raised transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${infra.status === 'Healthy' ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{infra.region}</h4>
                    <p className="text-[10px] text-text-faint">Latency: <span className="font-mono tabular">{infra.latency}</span> • Uptime: <span className="font-mono tabular">99.99%</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-end">
                    <p className="eyebrow text-text-faint">Load</p>
                    <p className="text-sm font-semibold font-mono tabular text-foreground">{infra.load}%</p>
                  </div>
                  <div className="w-24 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${infra.load}%` }}
                      className={`h-full ${infra.load > 80 ? 'bg-warning' : 'bg-primary'}`}
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                    <Activity className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Real-time Throughput */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <CardTitle>DB throughput</CardTitle>
              </div>
              <CardDescription>Requests / sec</CardDescription>
            </CardHeader>
            <div className="mt-4">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-semibold font-mono tabular text-foreground">2.4k</span>
                <span className="text-[10px] font-medium text-success">Stable</span>
              </div>
              <MiniAreaChart data={DB_THROUGHPUT} color="bg-primary" />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <CardTitle>Server latency</CardTitle>
              </div>
              <CardDescription>Avg Response Time</CardDescription>
            </CardHeader>
            <div className="mt-4">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-semibold font-mono tabular text-foreground">24ms</span>
                <span className="text-[10px] font-medium text-success">-2ms improvement</span>
              </div>
              <MiniAreaChart data={SERVER_LATENCY} color="bg-primary" />
            </div>
          </Card>
        </div>
      </div>

      {/* Resource Utilization */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PulseBar
          label="S3 Storage"
          value="64%"
          sublabel="1.2TB of 2TB utilized"
          icon={Server}
          color="bg-primary"
        />
        <PulseBar
          label="Redis Cache"
          value="12%"
          sublabel="L1/L2 Cache hit rate: 94%"
          icon={Zap}
          color="bg-primary"
        />
        <PulseBar
          label="Compute Power"
          value="48%"
          sublabel="Auto-scaling: 12 Nodes active"
          icon={Activity}
          color="bg-warning"
        />
      </div>

      {/* Bottom Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-between p-6 rounded-2xl bg-surface border border-hairline"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-surface-raised border border-metal rounded-xl">
            <ShieldCheck className="w-6 h-6 text-metal" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground tracking-tight">Security Protocol Alpha</h3>
            <p className="text-text-muted text-xs">All systems operational. No unauthorized intrusion detected in last 24h.</p>
          </div>
        </div>
        <Button variant="outline">
          Run Security Audit
        </Button>
      </motion.div>
    </div>
  );
}
