import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinancialBrain from './page';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { NextIntlClientProvider } from 'next-intl';
import api from '@/lib/api';
import messages from '../../../../../messages/en.json';
import frMessages from '../../../../../messages/fr.json';
import arMessages from '../../../../../messages/ar.json';
import { formatMoney } from '@/lib/format';

// The page fetches /expenses + /payments/pending on mount — mock the axios
// instance rather than a real backend.
vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mockExpense = {
  id: 'exp-1',
  category: 'RENT',
  description: 'Office rent',
  amount: 5000,
  status: 'PAID',
  date: '2026-01-01T00:00:00.000Z',
};

const mockPendingPayment = {
  id: 'pay-1',
  amount: 1050,
  method: 'CASH',
  type: 'INCOME',
  invoice: {
    booking: {
      customer: { firstName: 'Sara', lastName: 'L.' },
      car: { brand: 'Renault', model: 'Clio' },
    },
  },
};

const mockRecentPayment = {
  id: 'pay-2',
  amount: 800,
  method: 'TRANSFER',
  type: 'INCOME',
  status: 'VERIFIED',
  invoice: {
    booking: {
      customer: { firstName: 'Omar', lastName: 'B.' },
      car: { brand: 'Dacia', model: 'Logan' },
    },
  },
};

const mockSummary = {
  total: 5000,
  byCategory: { RENT: 5000 },
  count: 1,
};

const catalogs = { en: messages, fr: frMessages, ar: arMessages };

const renderWithProviders = (ui: React.ReactElement, locale: keyof typeof catalogs = 'en') => {
  return render(
    <NextIntlClientProvider locale={locale} messages={catalogs[locale]}>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </NextIntlClientProvider>,
  );
};

describe('FinancialBrain Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/expenses') return Promise.resolve({ data: [mockExpense] });
      if (url === '/payments/pending') return Promise.resolve({ data: [mockPendingPayment] });
      if (url === '/payments/recent') return Promise.resolve({ data: [mockRecentPayment] });
      if (url === '/expenses/summary') return Promise.resolve({ data: mockSummary });
      if (url === '/bookings') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
  });

  it('loads and renders expenses from the API', async () => {
    renderWithProviders(<FinancialBrain />);
    expect(await screen.findByText('Office rent')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/expenses');
    expect(api.get).toHaveBeenCalledWith('/payments/pending');
    expect(api.get).toHaveBeenCalledWith('/payments/recent');
    expect(api.get).toHaveBeenCalledWith('/expenses/summary');
  });

  it('submits a new expense and reloads the ledger', async () => {
    renderWithProviders(<FinancialBrain />);
    await screen.findByText('Office rent');

    fireEvent.click(screen.getByText('Add expense'));
    expect(screen.getByText('Record an expense')).toBeInTheDocument();

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '1500' } });

    const form = amountInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/expenses',
        expect.objectContaining({ amount: 1500 }),
      ),
    );
  });

  it('switches to the pending tab and shows a pending payment', async () => {
    renderWithProviders(<FinancialBrain />);
    await screen.findByText('Office rent');

    fireEvent.click(screen.getByText('Pending'));
    expect(await screen.findByText('Renault Clio')).toBeInTheDocument();
    expect(screen.getByText('Sara L.')).toBeInTheDocument();
  });

  it.each(['en', 'fr', 'ar'] as const)('submits decimal expenses using canonical category codes in %s', async (locale) => {
    const copy = catalogs[locale].finance;
    renderWithProviders(<FinancialBrain />, locale);
    await screen.findByText('Office rent');
    fireEvent.click(screen.getByRole('button', { name: copy.addExpense }));
    fireEvent.change(screen.getByLabelText(copy.category), { target: { value: 'RENT' } });
    const amountInput = screen.getByLabelText(copy.amountMad);
    fireEvent.change(amountInput, { target: { value: '1500.25' } });
    fireEvent.submit(amountInput.closest('form')!);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/expenses', {
      category: 'RENT', description: 'RENT', amount: 1500.25,
    }));
    expect(await screen.findByText(copy.expenseSavedTitle)).toBeInTheDocument();
    expect(screen.getByText(copy.expenseSaved.replace('{amount}', formatMoney(1500.25, locale)), { normalizer: (text) => text })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: catalogs[locale].common.close })).toBeInTheDocument();
  });

  it('rejects negative expenses before calling the API', async () => {
    renderWithProviders(<FinancialBrain />);
    await screen.findByText('Office rent');
    fireEvent.click(screen.getByRole('button', { name: messages.finance.addExpense }));
    const amountInput = screen.getByLabelText(messages.finance.amountMad);
    fireEvent.change(amountInput, { target: { value: '-1' } });
    fireEvent.submit(amountInput.closest('form')!);
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByText(messages.finance.invalidAmount)).toBeInTheDocument();
  });

  it('offers a paid invoice for refunds and preserves payment enum values in Arabic', async () => {
    const previousGet = vi.mocked(api.get).getMockImplementation()!;
    vi.mocked(api.get).mockImplementation((url, config) => url === '/bookings'
      ? Promise.resolve({ data: [{ invoices: [{ id: 'paid-invoice', amount: 800, status: 'PAID' }], customer: { firstName: 'Sara', lastName: 'L.' } }] })
      : previousGet(url, config));
    renderWithProviders(<FinancialBrain />, 'ar');
    await screen.findByText('Office rent');
    fireEvent.click(screen.getByRole('button', { name: arMessages.finance.recordPayment }));
    await screen.findByRole('option', { name: /Sara/ });
    fireEvent.change(screen.getByLabelText(arMessages.finance.invoice), { target: { value: 'paid-invoice' } });
    fireEvent.change(screen.getByLabelText(arMessages.finance.type), { target: { value: 'REFUND' } });
    fireEvent.change(screen.getByLabelText(arMessages.finance.method), { target: { value: 'TRANSFER' } });
    const amountInput = screen.getByLabelText(arMessages.finance.amountMad);
    fireEvent.change(amountInput, { target: { value: '100.50' } });
    fireEvent.submit(amountInput.closest('form')!);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/payments', expect.objectContaining({
      invoiceId: 'paid-invoice', type: 'REFUND', method: 'TRANSFER', amount: 100.5,
    })));
    expect(await screen.findByText(arMessages.finance.refundSavedTitle)).toBeInTheDocument();
  });

  it('shows a translated error with retry instead of an empty ledger on failure', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('offline'));
    renderWithProviders(<FinancialBrain />, 'fr');
    expect(await screen.findByRole('alert')).toHaveTextContent(frMessages.finance.loadFailed);
    expect(screen.queryByText(frMessages.finance.emptyLedger)).not.toBeInTheDocument();
    const callsBeforeRetry = vi.mocked(api.get).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: frMessages.finance.retry }));
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(callsBeforeRetry));
  });
});
