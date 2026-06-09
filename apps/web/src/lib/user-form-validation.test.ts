import { describe, expect, it } from 'vitest';
import {
  validateAccessStep,
  validateIdentityStep,
} from '@/lib/user-form-validation';

describe('user-form-validation', () => {
  it('requires strong matching passwords on create', () => {
    const errors = validateIdentityStep(
      {
        fullName: 'Budi Kasir',
        email: 'budi@toko.test',
        phone: '',
        password: 'short',
        confirmPassword: 'short',
      },
      { requirePassword: true },
    );
    expect(errors.password).toBeTruthy();
  });

  it('rejects invalid phone format', () => {
    const errors = validateIdentityStep(
      {
        fullName: 'Budi Kasir',
        email: 'budi@toko.test',
        phone: '123',
        password: 'Kasir123',
        confirmPassword: 'Kasir123',
      },
      { requirePassword: true },
    );
    expect(errors.phone).toContain('08');
  });

  it('requires exactly one outlet for cashier', () => {
    const errors = validateAccessStep({
      role: 'CASHIER',
      outletIds: ['a', 'b'],
    });
    expect(errors.outletIds).toContain('satu cabang');
  });

  it('passes valid identity and access', () => {
    const identity = validateIdentityStep(
      {
        fullName: 'Budi Kasir',
        email: 'budi@toko.test',
        phone: '081234567890',
        password: 'Kasir123',
        confirmPassword: 'Kasir123',
      },
      { requirePassword: true },
    );
    const access = validateAccessStep({
      role: 'CASHIER',
      outletIds: ['outlet-1'],
    });
    expect(identity).toEqual({});
    expect(access).toEqual({});
  });
});
