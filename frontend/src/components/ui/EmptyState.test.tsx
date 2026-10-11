import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';
import { describe, it, expect } from 'vitest';

describe('EmptyState Component', () => {
  it('renders title and icon correctly', () => {
    render(<EmptyState icon={AlertCircle} title="Aucun véhicule trouvé" />);
    expect(screen.getByText('Aucun véhicule trouvé')).toBeInTheDocument();
  });

  it('renders optional description when provided', () => {
    render(
      <EmptyState
        icon={AlertCircle}
        title="Aucun dossier"
        description="Veuillez ajuster vos critères de recherche."
      />,
    );
    expect(screen.getByText('Veuillez ajuster vos critères de recherche.')).toBeInTheDocument();
  });

  it('renders optional action node', () => {
    render(
      <EmptyState
        icon={AlertCircle}
        title="Flotte vide"
        action={<button>Ajouter un véhicule</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Ajouter un véhicule' })).toBeInTheDocument();
  });
});
