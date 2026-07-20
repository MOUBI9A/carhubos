import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinancialBrain from './page';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { NextIntlClientProvider } from 'next-intl';
import api from '@/lib/api';
import messages from '../../../../../messages/en.json';

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
  invoice: {
    booking: {
      customer: { firstName: 'Sara', lastName: 'L.' },
      car: { brand: 'Renault', model: 'Clio' },
    },
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </ToastProvider>,
  );
};

describe('FinancialBrain Page', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/expenses') return Promise.resolve({ data: [mockExpense] });
      if (url === '/payments/pending') return Promise.resolve({ data: [mockPendingPayment] });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
  });

  it('loads and renders expenses from the API', async () => {
    renderWithProviders(<FinancialBrain />);
    expect(await screen.findByText('Office rent')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/expenses');
    expect(api.get).toHaveBeenCalledWith('/payments/pending');
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
});
