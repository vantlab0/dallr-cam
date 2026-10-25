import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/ui/Overlay';

function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setOpen(false);
      }}
      title="Integration notes"
      description="A test dialog"
      footer={<button type="button">Done</button>}
    >
      <label>
        Prompt
        <input aria-label="Prompt" />
      </label>
    </Modal>
  );
}

describe('Modal', () => {
  it('renders an accessible dialog, locks scrolling and restores on close', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'Integration notes' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('A test dialog')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
