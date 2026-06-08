import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

describe('OpenShiftRedirect', () => {
  it('redirects to unified shift page with action=open', async () => {
    const { default: OpenShiftRedirect } = await import('./page');
    await expect(
      OpenShiftRedirect({ searchParams: Promise.resolve({ outletId: 'outlet-1' }) }),
    ).rejects.toThrow('REDIRECT:/shift?action=open&outletId=outlet-1');
  });
});

describe('CloseShiftRedirect', () => {
  it('redirects to unified shift page with action=close', async () => {
    const { default: CloseShiftRedirect } = await import('../close/page');
    expect(() => CloseShiftRedirect()).toThrow('REDIRECT:/shift?action=close');
  });
});
