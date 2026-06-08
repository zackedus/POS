import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePosCheckoutContext } from './usePosCheckoutContext';

describe('usePosCheckoutContext', () => {
  it('treats walk-in as blocking finance but allows delivery when name and phone filled', () => {
    const { result: blocked } = renderHook(() =>
      usePosCheckoutContext({
        customerId: null,
        walkInCustomerName: '',
        walkInCustomerPhone: '',
        customerDepositBalance: null,
        customerCreditLimit: null,
        customerCreditAvailable: null,
        customerReceivableOutstanding: null,
        paymentMode: 'CREDIT',
        total: 100_000,
        hasCreditApprovalToken: false,
        deliveryEnabled: true,
        deliverySelection: null,
        isOnline: true,
      }),
    );

    expect(blocked.current.isWalkIn).toBe(true);
    expect(blocked.current.financeCustomerRequired).toBe(true);
    expect(blocked.current.canUseDelivery).toBe(false);
    expect(blocked.current.deliveryBlockedReason).toContain('walk-in');

    const { result: eligible } = renderHook(() =>
      usePosCheckoutContext({
        customerId: null,
        walkInCustomerName: 'Pak Joko',
        walkInCustomerPhone: '081234567890',
        customerDepositBalance: null,
        customerCreditLimit: null,
        customerCreditAvailable: null,
        customerReceivableOutstanding: null,
        paymentMode: 'CASH',
        total: 50_000,
        hasCreditApprovalToken: false,
        deliveryEnabled: true,
        deliverySelection: {
          mode: 'manual',
          snapshot: {
            id: 'manual',
            label: 'Proyek',
            addressLine1: 'Jl. Merdeka 10',
            addressLine2: 'Kel. Sukamaju',
            city: 'Jakarta',
            province: null,
            postalCode: null,
            isDefault: false,
            createdAt: '',
            updatedAt: '',
          },
        },
        isOnline: true,
      }),
    );

    expect(eligible.current.isWalkInDeliveryEligible).toBe(true);
    expect(eligible.current.canUseDelivery).toBe(true);
    expect(eligible.current.deliveryValid).toBe(true);
  });

  it('validates delivery address when kirim enabled', () => {
    const { result } = renderHook(() =>
      usePosCheckoutContext({
        customerId: 'cust-1',
        customerDepositBalance: 0,
        customerCreditLimit: 1_000_000,
        customerCreditAvailable: 500_000,
        customerReceivableOutstanding: 0,
        paymentMode: 'CASH',
        total: 50_000,
        hasCreditApprovalToken: false,
        deliveryEnabled: true,
        deliverySelection: {
          mode: 'manual',
          snapshot: {
            id: 'manual',
            label: 'Proyek',
            addressLine1: 'Jl',
            addressLine2: null,
            city: 'J',
            province: null,
            postalCode: null,
            isDefault: false,
            createdAt: '',
            updatedAt: '',
          },
        },
        isOnline: true,
      }),
    );

    expect(result.current.deliveryValid).toBe(false);
    expect(result.current.deliveryBlockedReason).toContain('alamat');
  });

  it('shows credit terms for tempo and deposit shortfall', () => {
    const { result: tempo } = renderHook(() =>
      usePosCheckoutContext({
        customerId: 'cust-1',
        customerDepositBalance: 0,
        customerCreditLimit: 1_000_000,
        customerCreditAvailable: 500_000,
        customerReceivableOutstanding: 0,
        paymentMode: 'CREDIT',
        total: 100_000,
        hasCreditApprovalToken: false,
        deliveryEnabled: false,
        deliverySelection: null,
        isOnline: true,
      }),
    );
    expect(tempo.current.showCreditTerms).toBe(true);

    const { result: deposit } = renderHook(() =>
      usePosCheckoutContext({
        customerId: 'cust-1',
        customerDepositBalance: 30_000,
        customerCreditLimit: 1_000_000,
        customerCreditAvailable: 500_000,
        customerReceivableOutstanding: 0,
        paymentMode: 'DEPOSIT',
        total: 100_000,
        hasCreditApprovalToken: false,
        deliveryEnabled: false,
        deliverySelection: null,
        isOnline: true,
      }),
    );
    expect(deposit.current.showCreditTerms).toBe(true);
    expect(deposit.current.depositShortfall).toBe(70_000);
  });

  it('blocks tempo checkout when over limit without approval', () => {
    const { result } = renderHook(() =>
      usePosCheckoutContext({
        customerId: 'cust-1',
        customerDepositBalance: 0,
        customerCreditLimit: 1_000_000,
        customerCreditAvailable: 50_000,
        customerReceivableOutstanding: 900_000,
        paymentMode: 'CREDIT',
        total: 200_000,
        hasCreditApprovalToken: false,
        deliveryEnabled: false,
        deliverySelection: null,
        isOnline: true,
      }),
    );

    expect(result.current.creditCheckoutBlocked).toBe(true);
    expect(result.current.preCheckoutBlockMessage).toContain('persetujuan manager');
  });
});
