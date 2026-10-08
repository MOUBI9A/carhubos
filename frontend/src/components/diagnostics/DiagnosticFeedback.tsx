'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { diagnosticError } from './useDiagnostics';

export const diagnosticInput = 'w-full rounded-xl border border-hairline bg-surface-raised px-3 py-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50';

export function DiagnosticError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useTranslations('diagnostics');
  const parsed = diagnosticError(error);
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm space-y-3">
      <p className="flex items-start gap-2 text-foreground"><AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0 mt-0.5 text-danger" />{t(`errors.${parsed.kind}`)}</p>
      {parsed.kind === 'invalid' && parsed.message && <p className="text-text-muted break-words">{parsed.message}</p>}
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><RefreshCw aria-hidden="true" className="h-4 w-4" />{t('retry')}</Button>}
    </div>
  );
}
