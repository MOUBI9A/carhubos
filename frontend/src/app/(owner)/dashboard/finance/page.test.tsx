import { render, screen, fireEvent } from '@testing-library/react';
import FinancialBrain from './page';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider } from '@/lib/contexts/ToastContext';

// Wrap with provider
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      {ui}
    </ToastProvider>
  );
};

describe('FinancialBrain Page', () => {
  it('renders the financial dashboard correctly', () => {
    renderWithProviders(<FinancialBrain />);
    expect(screen.getByText('Financial Brain')).toBeInTheDocument();
    expect(screen.getByText('Financial Ledger')).toBeInTheDocument();
  });

  it('allows adding an expense', () => {
    renderWithProviders(<FinancialBrain />);
    
    // Open modal
    const addButton = screen.getByText('Add Expense');
    fireEvent.click(addButton);
    
    // Modal should be open
    expect(screen.getByText('Deduct Agency Liquidity')).toBeInTheDocument();
    
    // Fill form
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '1500' } });
    
    const categorySelect = screen.getByRole('combobox');
    fireEvent.change(categorySelect, { target: { value: 'Real Estate / Rent' } });
    
    // Submit
    const submitButton = screen.getByText('Confirm Expenditure');
    fireEvent.click(submitButton);
    
    // Check if added to ledger
    expect(screen.getByText('Expense: Real Estate / Rent')).toBeInTheDocument();
    expect(screen.getByText(/1,500/)).toBeInTheDocument();
  });

  it('switches between history and pending tabs', () => {
    renderWithProviders(<FinancialBrain />);
    
    const pendingTab = screen.getByText('PENDING');
    fireEvent.click(pendingTab);
    
    expect(screen.getByText('Deposit: Toyota Prado')).toBeInTheDocument();
    
    const historyTab = screen.getByText('HISTORY');
    fireEvent.click(historyTab);
    
    expect(screen.getByText('Rental: Dacia Logan')).toBeInTheDocument();
  });
});
