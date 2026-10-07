import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { RiskAssessmentPanel } from './RiskAssessmentPanel';
import type { RiskAssessment, RiskStatus } from '../useCustomerRisk';
import en from '../../../../../messages/en.json';
import fr from '../../../../../messages/fr.json';
import ar from '../../../../../messages/ar.json';

const catalogs = { en, fr, ar };
const assessment: RiskAssessment = {
  identity: { masked: '**123', type: 'CIN' }, status: 'BLACKLISTED', riskLevel: 'CRITICAL', blocked: true,
  globalScore: 2.5, reviewCount: 2, agencyCount: 2, activeFlagCount: 1, depositMultiplier: 1.5,
  recommendation: 'Backend English recommendation',
  tags: [{ tag: 'LATE_RETURN', count: 2, sentiment: 'neg' }],
  history: ['good', 'warn', 'bad'],
  flags: [{ id: 'flag-1', reason: 'FRAUDULENT_DOCUMENTS', severity: 'CRITICAL', details: 'Agency supplied details', agencyName: 'Test Agency', agencyCity: 'Rabat', createdAt: '2026-10-01', evidenceCount: 1 }],
  latestReview: { rating: 2.5, comment: 'Customer review', agencyName: 'Test Agency', agencyCity: 'Rabat', createdAt: '2026-10-01' },
};

describe.each(['en', 'fr', 'ar'] as const)('risk assessment in %s', (locale) => {
  const messages = catalogs[locale];
  const copy = messages.riskAssessment;

  it.each(['NEW', 'TRUSTED', 'CAUTION', 'BLACKLISTED'] as RiskStatus[])('renders the %s state with localized labels', (status) => {
    const onOverrideChange = vi.fn();
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <RiskAssessmentPanel assessment={{ ...assessment, status, blocked: status === 'BLACKLISTED' }} isLoading={false} overrideReason="" onOverrideChange={onOverrideChange} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('heading', { name: copy.title })).toBeInTheDocument();
    expect(screen.getByText(copy[status], { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: copy.rentalHistory.replace('{history}', [copy.good, copy.warn, copy.bad].join(' · ')) })).toBeInTheDocument();
    if (status === 'NEW') {
      expect(screen.getByText(copy.newRecommendation)).toBeInTheDocument();
      expect(screen.queryByText(assessment.recommendation)).not.toBeInTheDocument();
    }
    if (status === 'BLACKLISTED') {
      expect(screen.getByRole('alert')).toHaveTextContent(copy.FRAUDULENT_DOCUMENTS);
      const input = screen.getByLabelText(copy.overrideRequired);
      expect(input).toHaveAttribute('placeholder', copy.overridePlaceholder);
      fireEvent.change(input, { target: { value: 'Verified by manager' } });
      expect(onOverrideChange).toHaveBeenCalledWith('Verified by manager');
    }
  });

  it('localizes loading and unavailable states', () => {
    const props = { overrideReason: '', onOverrideChange: vi.fn() };
    const { rerender } = render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <RiskAssessmentPanel {...props} isLoading />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(copy.loading)).toBeInTheDocument();
    rerender(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <RiskAssessmentPanel {...props} isLoading={false} isError />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(copy.unavailable)).toBeInTheDocument();
  });
});
