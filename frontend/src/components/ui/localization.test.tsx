import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Combobox } from './Combobox';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from './dialog';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';
import ar from '../../../messages/ar.json';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: { children: ReactNode }) => <div>{children}</div> },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
}));

const catalogs = { en, fr, ar };

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: vi.fn(), configurable: true });
});

afterAll(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

describe.each(['en', 'fr', 'ar'] as const)('shared controls in %s', (locale) => {
  const messages = catalogs[locale];

  it('localizes combobox defaults, search and empty state', () => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Combobox options={[]} value="" onChange={vi.fn()} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: messages.common.selectOption }));
    expect(screen.getByRole('textbox', { name: messages.common.filterOptions })).toHaveAttribute('placeholder', messages.common.filterOptions);
    expect(screen.getByText(messages.common.noMatches)).toBeInTheDocument();
  });

  it('localizes both dialog close controls', () => {
    const onOpenChange = vi.fn();
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogTitle>{messages.common.confirm}</DialogTitle>
            <DialogFooter showCloseButton />
          </DialogContent>
        </Dialog>
      </NextIntlClientProvider>,
    );
    const closeButtons = screen.getAllByRole('button', { name: messages.common.close });
    expect(closeButtons).toHaveLength(2);
    fireEvent.click(closeButtons[0]);
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});
