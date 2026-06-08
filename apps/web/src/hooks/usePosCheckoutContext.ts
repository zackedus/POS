'use client';

import { useMemo } from 'react';
import type { PaymentMode } from '@/components/pos/pos-types';
import type { DeliverySelection } from '@/components/pos/PosDeliverySelector';
import { isDeliverySelectionValid } from '@/components/pos/PosDeliverySelector';
import {
  canCheckoutDepositPlusCredit,
  canCheckoutFullDeposit,
  computeDepositApplyAmount,
  computeDepositShortfall,
  FINANCE_CUSTOMER_REQUIRED_MESSAGE,
  getCreditLimitStatus,
  isCustomerLinkedForFinance,
  isFinancePaymentMode,
  needsCustomerPickerForFinance,
  type CreditLimitStatus,
} from '@/lib/pos-finance-payment';
import { isWalkInDeliveryEligible } from '@/lib/pos-checkout-delivery';

export interface PosCheckoutContextInput {
  customerId: string | null;
  walkInCustomerName?: string;
  walkInCustomerPhone?: string;
  customerDepositBalance: number | null;
  customerCreditLimit: number | null;
  customerCreditAvailable: number | null;
  customerReceivableOutstanding: number | null;
  paymentMode: PaymentMode;
  total: number;
  hasCreditApprovalToken: boolean;
  deliveryEnabled: boolean;
  deliverySelection: DeliverySelection | null;
  isOnline: boolean;
}

export interface PosCheckoutContext {
  customerLinked: boolean;
  isWalkIn: boolean;
  isWalkInDeliveryEligible: boolean;
  creditLimitStatus: CreditLimitStatus;
  depositApplyAmount: number;
  depositShortfall: number;
  depositFullCheckout: boolean;
  depositPlusCreditAvailable: boolean;
  creditOverLimit: boolean;
  creditCheckoutBlocked: boolean;
  financeCustomerRequired: boolean;
  deliveryBlockedReason: string | null;
  deliveryValid: boolean;
  canUseFinancePayment: boolean;
  canUseDelivery: boolean;
  preCheckoutBlockMessage: string | null;
  showCreditTerms: boolean;
}

export function usePosCheckoutContext(input: PosCheckoutContextInput): PosCheckoutContext {
  const {
    customerId,
    walkInCustomerName = '',
    walkInCustomerPhone = '',
    customerDepositBalance,
    customerCreditLimit,
    customerCreditAvailable,
    customerReceivableOutstanding,
    paymentMode,
    total,
    hasCreditApprovalToken,
    deliveryEnabled,
    deliverySelection,
    isOnline,
  } = input;

  return useMemo(() => {
    const customerLinked = isCustomerLinkedForFinance(customerId);
    const isWalkIn = !customerLinked;
    const walkInDeliveryEligible = isWalkInDeliveryEligible(walkInCustomerName, walkInCustomerPhone);
    const depositBalance = customerDepositBalance ?? 0;
    const receivableOutstanding = customerReceivableOutstanding ?? 0;
    const depositApplyAmount = computeDepositApplyAmount(depositBalance, total);
    const depositShortfall = computeDepositShortfall(depositBalance, total);
    const additionalCreditAmount =
      paymentMode === 'CREDIT' ? total : paymentMode === 'DEPOSIT' ? depositShortfall : 0;

    const creditLimitStatus = getCreditLimitStatus({
      creditLimit: customerCreditLimit,
      creditAvailable: customerCreditAvailable,
      receivableOutstanding,
      additionalCreditAmount,
    });

    const creditOverLimit =
      (paymentMode === 'CREDIT' || (paymentMode === 'DEPOSIT' && depositShortfall > 0)) &&
      creditLimitStatus === 'over';

    const creditCheckoutBlocked =
      paymentMode === 'CREDIT' &&
      (!customerLinked || customerCreditLimit === 0 || (creditOverLimit && !hasCreditApprovalToken));

    const depositFullCheckout = canCheckoutFullDeposit(customerDepositBalance, total);
    const depositPlusCreditAvailable = canCheckoutDepositPlusCredit({
      depositBalance: customerDepositBalance,
      cartTotal: total,
      creditLimit: customerCreditLimit,
      creditAvailable: customerCreditAvailable,
      receivableOutstanding,
      hasCreditApprovalToken,
    });

    const financeCustomerRequired =
      isFinancePaymentMode(paymentMode) && needsCustomerPickerForFinance(paymentMode, customerId);

    const canUseFinancePayment = customerLinked;
    const canUseDelivery = (customerLinked || walkInDeliveryEligible) && isOnline;

    let deliveryBlockedReason: string | null = null;
    if (deliveryEnabled) {
      if (!isOnline) {
        deliveryBlockedReason = 'Pengiriman tidak tersedia saat offline.';
      } else if (!customerLinked && !walkInDeliveryEligible) {
        deliveryBlockedReason = 'Isi nama (min. 2 karakter) dan no. HP pelanggan walk-in untuk pengiriman.';
      } else if (!isDeliverySelectionValid(deliverySelection)) {
        deliveryBlockedReason = 'Lengkapi alamat pengiriman (min. 3 karakter jalan, 2 karakter kota).';
      }
    }

    const deliveryValid = !deliveryEnabled || deliveryBlockedReason === null;

    let preCheckoutBlockMessage: string | null = null;
    if (financeCustomerRequired) {
      preCheckoutBlockMessage = FINANCE_CUSTOMER_REQUIRED_MESSAGE;
    } else if (!deliveryValid && deliveryBlockedReason) {
      preCheckoutBlockMessage = deliveryBlockedReason;
    } else if (paymentMode === 'DEPOSIT' && customerLinked && !depositFullCheckout && depositShortfall > 0) {
      if (!depositPlusCreditAvailable && customerCreditLimit === 0) {
        preCheckoutBlockMessage = `Saldo deposit kurang ${depositShortfall.toLocaleString('id-ID')} — pelanggan tidak diizinkan tempo.`;
      } else if (
        !depositPlusCreditAvailable &&
        depositShortfall > (customerCreditAvailable ?? 0) &&
        !hasCreditApprovalToken
      ) {
        preCheckoutBlockMessage = 'Sisa tempo melebihi kredit tersedia — minta persetujuan manager.';
      }
    } else if (creditCheckoutBlocked && paymentMode === 'CREDIT') {
      if (customerCreditLimit === 0) {
        preCheckoutBlockMessage = 'Pelanggan tidak diizinkan transaksi tempo.';
      } else if (creditOverLimit && !hasCreditApprovalToken) {
        preCheckoutBlockMessage = 'Transaksi tempo melebihi limit kredit — minta persetujuan manager.';
      }
    }

    const showCreditTerms =
      customerLinked &&
      (paymentMode === 'CREDIT' ||
        (paymentMode === 'DEPOSIT' && !depositFullCheckout && depositShortfall > 0));

    return {
      customerLinked,
      isWalkIn,
      isWalkInDeliveryEligible: walkInDeliveryEligible,
      creditLimitStatus,
      depositApplyAmount,
      depositShortfall,
      depositFullCheckout,
      depositPlusCreditAvailable,
      creditOverLimit,
      creditCheckoutBlocked,
      financeCustomerRequired,
      deliveryBlockedReason,
      deliveryValid,
      canUseFinancePayment,
      canUseDelivery,
      preCheckoutBlockMessage,
      showCreditTerms,
    };
  }, [
    customerId,
    walkInCustomerName,
    walkInCustomerPhone,
    customerDepositBalance,
    customerCreditLimit,
    customerCreditAvailable,
    customerReceivableOutstanding,
    paymentMode,
    total,
    hasCreditApprovalToken,
    deliveryEnabled,
    deliverySelection,
    isOnline,
  ]);
}
