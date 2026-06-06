import { describe, expect, it } from 'vitest';
import { canViewCostPrice } from './rbac';

describe('rbac', () => {
  it('allows cost visibility for owner and manager only', () => {
    expect(canViewCostPrice('OWNER')).toBe(true);
    expect(canViewCostPrice('MANAGER')).toBe(true);
    expect(canViewCostPrice('CASHIER')).toBe(false);
    expect(canViewCostPrice('INVENTORY')).toBe(false);
  });
});
