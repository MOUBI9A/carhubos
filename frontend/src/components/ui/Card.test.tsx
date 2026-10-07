import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Card } from './Card';

describe('Card semantics', () => {
  it('keeps noninteractive cards as containers', () => {
    render(<Card>Summary</Card>);
    expect(screen.getByText('Summary').tagName).toBe('DIV');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opts into a native button without submitting its surrounding form', () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn();
    render(<form onSubmit={onSubmit}><Card as="button" onClick={onClick}>Open details</Card></form>);
    const button = screen.getByRole('button', { name: 'Open details' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('text-start', 'focus-visible:outline-primary');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
