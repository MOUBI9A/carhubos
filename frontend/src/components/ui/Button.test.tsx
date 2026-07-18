import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { describe, it, expect } from 'vitest';

describe('Button Component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { container } = render(<Button variant="outline">Outline Button</Button>);
    expect(container.firstChild).toHaveClass('border-border');
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
