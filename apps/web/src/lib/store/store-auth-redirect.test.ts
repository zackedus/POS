import { describe, expect, it } from 'vitest';
import { getPostAuthRedirectUrl, shortCustomerName } from './store-auth-redirect';

describe('store-auth-redirect', () => {
  it('defaults to account page when no query param', () => {
    const params = new URLSearchParams();
    expect(getPostAuthRedirectUrl('toko-a', params)).toBe('/store/toko-a/account');
  });

  it('prefers redirect over returnUrl', () => {
    const params = new URLSearchParams({
      redirect: '/store/toko-a/checkout',
      returnUrl: '/store/toko-a/cart',
    });
    expect(getPostAuthRedirectUrl('toko-a', params)).toBe('/store/toko-a/checkout');
  });

  it('falls back to account for external paths', () => {
    const params = new URLSearchParams({ redirect: 'https://evil.test/phish' });
    expect(getPostAuthRedirectUrl('toko-a', params)).toBe('/store/toko-a/account');
  });

  it('shortens long customer names', () => {
    expect(shortCustomerName('Budi Santoso Wijaya')).toBe('Budi');
    expect(shortCustomerName('Constantinople Alexander')).toBe('Constantino…');
  });
});
