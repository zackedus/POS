import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HydrationSafeMount } from './HydrationSafeMount';

describe('HydrationSafeMount', () => {
  it('renders children after client mount', async () => {
    render(
      <HydrationSafeMount fallback={<span role="status">Menunggu…</span>}>
        <div data-testid="client-content">Loaded</div>
      </HydrationSafeMount>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('client-content')).toHaveTextContent('Loaded');
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders children when no fallback is provided', async () => {
    render(
      <HydrationSafeMount>
        <div data-testid="client-only">Ready</div>
      </HydrationSafeMount>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('client-only')).toHaveTextContent('Ready');
    });
  });
});
