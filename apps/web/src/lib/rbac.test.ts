import { describe, expect, it } from 'vitest';
import { canAccessAnyTenantOutlet, canViewCostPrice } from './rbac';

describe('rbac', () => {
  it('allows cost visibility for owner and manager only', () => {
    expect(canViewCostPrice('OWNER')).toBe(true);
    expect(canViewCostPrice('MANAGER')).toBe(true);
    expect(canViewCostPrice('CASHIER')).toBe(false);
    expect(canViewCostPrice('INVENTORY')).toBe(false);
  });

  it('allows tenant-wide outlet switching for owner and manager only', () => {
    expect(canAccessAnyTenantOutlet('OWNER')).toBe(true);
    expect(canAccessAnyTenantOutlet('MANAGER')).toBe(true);
    expect(canAccessAnyTenantOutlet('CASHIER')).toBe(false);
  });
});
