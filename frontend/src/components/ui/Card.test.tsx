import { render, screen, fireEvent } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { describe, it, expect, vi } from 'vitest';

describe('Card Component Family', () => {
  it('renders card with children and default styles', () => {
    render(<Card>Card Body Content</Card>);
    expect(screen.getByText('Card Body Content')).toBeInTheDocument();
  });

  it('handles click events when onClick is provided', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Interactive Card</Card>);
    fireEvent.click(screen.getByText('Interactive Card'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders header, title, and description hierarchy correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Véhicules Actifs</CardTitle>
          <CardDescription>Flotte en circulation</CardDescription>
        </CardHeader>
        <div>Contenu supplémentaire</div>
      </Card>,
    );

    expect(screen.getByText('Véhicules Actifs')).toBeInTheDocument();
    expect(screen.getByText('Flotte en circulation')).toBeInTheDocument();
    expect(screen.getByText('Contenu supplémentaire')).toBeInTheDocument();
  });
});
