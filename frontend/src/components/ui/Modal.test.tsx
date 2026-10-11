import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';
import { describe, it, expect, vi } from 'vitest';

describe('Modal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        Modal Content
      </Modal>,
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('renders title, description and children when isOpen is true', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Dossier de Sinistre"
        description="Détails de l'incident déclaré"
      >
        Corps du dialogue
      </Modal>,
    );

    expect(screen.getByText('Dossier de Sinistre')).toBeInTheDocument();
    expect(screen.getByText("Détails de l'incident déclaré")).toBeInTheDocument();
    expect(screen.getByText('Corps du dialogue')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Fermeture Test">
        Contenu
      </Modal>,
    );

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Escape Test">
        Contenu
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
