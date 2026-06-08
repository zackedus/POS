'use client';

import Link from 'next/link';
import { formatCurrencyIDR, parseQuantityInput, CREDIT_TERMS_DAYS_OPTIONS } from '@barokah/shared';
import { Button, CurrencyInput, QuantityInput } from '@barokah/ui';
import type { CartMarginWarning, CartStockIssue } from '@/lib/cart-margin';
import { evaluateCartLineStock } from '@/lib/pos-stock-display';
import type { RecentTransactionSummary, ReceiptResponse } from '@/lib/transactions';
import { ReceiptPanel } from '@/components/pos/ReceiptPanel';
import { PosAccordionSection } from '@/components/pos/PosAccordionSection';
import type { CartItem, HeldTransactionSummary, PaymentMode, ProductGridItem } from './pos-types';
import {
  canCheckoutDepositPlusCredit,
  canCheckoutFullDeposit,
  computeDepositApplyAmount,
  computeDepositShortfall,
  FINANCE_CUSTOMER_REQUIRED_MESSAGE,
  getCreditLimitStatus,
  isCustomerLinkedForFinance,
  needsCustomerPickerForFinance,
} from '@/lib/pos-finance-payment';

import {
  formatPromoTargetingLabel,
  isPromoApplicableToCart,
  type PromoCartLine,
} from '@/lib/promo-checkout-api';
import type { PromoRuleView } from '@/lib/promotions-api';

type SplitMethod = 'CASH' | 'TRANSFER' | 'QRIS' | 'EWALLET' | 'CARD';

interface SplitMethodOption {
  method: SplitMethod;
  label: string;
  enabled: boolean;
}

const splitMethodOptions: SplitMethodOption[] = [
  { method: 'CASH', label: 'Cash', enabled: true },
  { method: 'TRANSFER', label: 'Transfer', enabled: true },
  { method: 'QRIS', label: 'QRIS', enabled: true },
  { method: 'EWALLET', label: 'E-Wallet', enabled: false },
  { method: 'CARD', label: 'Kartu', enabled: false },
];

const paymentLabels: Record<PaymentMode, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer',
  QRIS: 'QRIS',
  SPLIT: 'Split',
  CREDIT: 'Tempo',
  DEPOSIT: 'Deposit',
};

export interface PosCartPanelProps {
  cart: CartItem[];
  products: ProductGridItem[];
  subtotal: number;
  promoDiscountAmount: number;
  loyaltyRedeemDiscount?: number;
  taxAmount?: number;
  discountAmount: number;
  total: number;
  activePromos: PromoRuleView[];
  promoCartLines?: PromoCartLine[];
  selectedPromoId: string | null;
  onPromoChange: (promoId: string | null) => void;
  appliedPromoName?: string | null;
  stockIssues: CartStockIssue[];
  marginWarnings: CartMarginWarning[];
  checkoutBlockedByStock: boolean;
  checkoutStockHint: string;
  qrisPending?: boolean;
  paymentMode: PaymentMode;
  onPaymentModeChange: (mode: PaymentMode) => void;
  cashReceived: string;
  onCashReceivedChange: (value: string) => void;
  nonCashReference: string;
  onNonCashReferenceChange: (value: string) => void;
  splitCashAmount: string;
  onSplitCashAmountChange: (value: string) => void;
  splitTransferAmount: string;
  onSplitTransferAmountChange: (value: string) => void;
  transferReference: string;
  onTransferReferenceChange: (value: string) => void;
  splitHint: string;
  splitInvalid: boolean;
  splitAmountsMismatch: boolean;
  splitHasValue: boolean;
  checkingOut: boolean;
  processingSplit: boolean;
  holding: boolean;
  recallingId: string | null;
  activeShift: boolean;
  isOnline: boolean;
  success: string | null;
  onCheckoutCash: () => void;
  onHoldTransaction: () => void;
  onCheckoutNonCash: (mode: 'TRANSFER' | 'QRIS' | 'CREDIT' | 'DEPOSIT') => void;
  onCheckoutSplit: () => void;
  onRetrySplit: () => void;
  hasLastSplitAttempt: boolean;
  onStepQty: (productId: string, direction: 1 | -1, sellUnitId?: string) => void;
  onUpdateQty: (productId: string, quantity: number, sellUnitId?: string) => void;
  onUpdateCartSellUnit: (productId: string, sellUnitId: string) => void;
  recentTransactions: RecentTransactionSummary[];
  loadingRecent: boolean;
  onOpenReceipt: (transactionId: string) => void;
  loadingReceiptId: string | null;
  onVoidTransaction: (trx: RecentTransactionSummary) => void;
  heldTransactions: HeldTransactionSummary[];
  loadingHeld: boolean;
  onRecallTransaction: (heldId: string) => void;
  receiptPreview: ReceiptResponse | null;
  onPrintReceipt: () => void;
  onConnectPrinter?: () => void;
  onThermalPrint?: () => void;
  thermalStatus?: string | null;
  onCloseReceipt: () => void;
  customerName?: string;
  customerPhone?: string;
  customerMemberCode?: string;
  memberScanInput?: string;
  onMemberScanChange?: (value: string) => void;
  customerId?: string | null;
  onCustomerNameChange?: (value: string) => void;
  onCustomerPhoneChange?: (value: string) => void;
  loyaltyPointsPreview?: number | null;
  loyaltyEarnRateIdr?: number;
  loyaltyRedeemEnabled?: boolean;
  loyaltyRedeemValueIdr?: number;
  customerPointsBalance?: number | null;
  customerReceivableOutstanding?: number | null;
  customerDepositBalance?: number | null;
  customerCreditLimit?: number | null;
  customerCreditAvailable?: number | null;
  loyaltyPointsToRedeem?: string;
  onLoyaltyPointsToRedeemChange?: (value: string) => void;
  onOpenCustomerPicker?: () => void;
  onRequestCreditApproval?: () => void;
  hasCreditApprovalToken?: boolean;
  onCheckoutDepositPlusCredit?: () => void;
  onOpenReceivablePayment?: () => void;
  defaultCreditTermsDays?: number;
  creditTermsDays?: number;
  onCreditTermsDaysChange?: (days: number) => void;
}

const standardPaymentModes: PaymentMode[] = ['CASH', 'TRANSFER', 'QRIS'];
const financePaymentModes: PaymentMode[] = ['CREDIT', 'DEPOSIT'];

function financePanelColor(status: 'ok' | 'warning' | 'over'): { bg: string; border: string; accent: string } {
  if (status === 'over') {
    return { bg: '#fef2f2', border: '#fecaca', accent: '#b91c1c' };
  }
  if (status === 'warning') {
    return { bg: '#fffbeb', border: '#fcd34d', accent: '#b45309' };
  }
  return { bg: '#eff6ff', border: '#bfdbfe', accent: '#1e40af' };
}

export function PosCartPanel({
  cart,
  products,
  subtotal,
  promoDiscountAmount,
  loyaltyRedeemDiscount = 0,
  taxAmount = 0,
  discountAmount,
  total,
  activePromos,
  promoCartLines = [],
  selectedPromoId,
  onPromoChange,
  appliedPromoName,
  stockIssues,
  marginWarnings,
  checkoutBlockedByStock,
  checkoutStockHint,
  qrisPending = false,
  paymentMode,
  onPaymentModeChange,
  cashReceived,
  onCashReceivedChange,
  nonCashReference,
  onNonCashReferenceChange,
  splitCashAmount,
  onSplitCashAmountChange,
  splitTransferAmount,
  onSplitTransferAmountChange,
  transferReference,
  onTransferReferenceChange,
  splitHint,
  splitInvalid,
  splitAmountsMismatch,
  splitHasValue,
  checkingOut,
  processingSplit,
  holding,
  recallingId,
  activeShift,
  isOnline,
  success,
  onCheckoutCash,
  onHoldTransaction,
  onCheckoutNonCash,
  onCheckoutSplit,
  onRetrySplit,
  hasLastSplitAttempt,
  onStepQty,
  onUpdateQty,
  onUpdateCartSellUnit,
  recentTransactions,
  loadingRecent,
  onOpenReceipt,
  loadingReceiptId,
  onVoidTransaction,
  heldTransactions,
  loadingHeld,
  onRecallTransaction,
  receiptPreview,
  onPrintReceipt,
  onConnectPrinter,
  onThermalPrint,
  thermalStatus,
  onCloseReceipt,
  customerName = '',
  customerPhone = '',
  customerMemberCode = '',
  memberScanInput = '',
  onMemberScanChange,
  customerId = null,
  onCustomerNameChange,
  onCustomerPhoneChange,
  loyaltyPointsPreview = null,
  loyaltyEarnRateIdr = 10_000,
  loyaltyRedeemEnabled = false,
  loyaltyRedeemValueIdr = 1_000,
  customerPointsBalance = null,
  customerReceivableOutstanding = null,
  customerDepositBalance = null,
  customerCreditLimit = null,
  customerCreditAvailable = null,
  loyaltyPointsToRedeem = '',
  onLoyaltyPointsToRedeemChange,
  onOpenCustomerPicker,
  onRequestCreditApproval,
  hasCreditApprovalToken = false,
  onCheckoutDepositPlusCredit,
  onOpenReceivablePayment,
  defaultCreditTermsDays = 30,
  creditTermsDays = defaultCreditTermsDays,
  onCreditTermsDaysChange,
}: PosCartPanelProps) {
  const hasCartItems = cart.length > 0;
  const customerLinked = isCustomerLinkedForFinance(customerId);
  const depositApplyAmount = computeDepositApplyAmount(customerDepositBalance ?? 0, total);
  const depositShortfall = computeDepositShortfall(customerDepositBalance ?? 0, total);
  const creditLimitStatus = getCreditLimitStatus({
    creditLimit: customerCreditLimit,
    creditAvailable: customerCreditAvailable,
    receivableOutstanding: customerReceivableOutstanding ?? 0,
    additionalCreditAmount: paymentMode === 'CREDIT' ? total : depositShortfall,
  });
  const creditOverLimit = paymentMode === 'CREDIT' && creditLimitStatus === 'over';
  const creditCheckoutBlocked =
    paymentMode === 'CREDIT' &&
    (!customerLinked || customerCreditLimit === 0 || (creditOverLimit && !hasCreditApprovalToken));
  const depositFullCheckout = canCheckoutFullDeposit(customerDepositBalance, total);
  const depositPlusCreditAvailable = canCheckoutDepositPlusCredit({
    depositBalance: customerDepositBalance,
    cartTotal: total,
    creditLimit: customerCreditLimit,
    creditAvailable: customerCreditAvailable,
    receivableOutstanding: customerReceivableOutstanding ?? 0,
    hasCreditApprovalToken,
  });
  const financePanelColors = financePanelColor(creditLimitStatus);
  const stepperStyle = { minHeight: 44, minWidth: 44, padding: 0, fontSize: '1.125rem' };

  function renderPaymentModeButton(mode: PaymentMode) {
    const active = paymentMode === mode;
    const needsCustomer = needsCustomerPickerForFinance(mode, customerId);
    return (
      <button
        key={mode}
        type="button"
        aria-pressed={active}
        title={needsCustomer ? FINANCE_CUSTOMER_REQUIRED_MESSAGE : undefined}
        onClick={() => onPaymentModeChange(mode)}
        style={{
          minHeight: 48,
          minWidth: 72,
          padding: '0 1rem',
          borderRadius: 8,
          borderWidth: 2,
          borderStyle: needsCustomer && !active ? 'dashed' : 'solid',
          borderColor: active ? '#16a34a' : needsCustomer ? '#cbd5e1' : '#e2e8f0',
          background: active ? '#f0fdf4' : '#fff',
          color: active ? '#15803d' : needsCustomer ? '#64748b' : '#334155',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {paymentLabels[mode]}
      </button>
    );
  }

  return (
    <aside
      style={{
        padding: '0.75rem 1rem 1rem',
        background: '#fff',
        borderLeft: '1px solid #e2e8f0',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Keranjang</h2>
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{cart.length} item</span>
      </div>

      {checkoutBlockedByStock ? (
        <div
          role="alert"
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            borderRadius: 10,
            background: '#fef2f2',
            border: '2px solid #f87171',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          <strong>Stok tidak mencukupi</strong>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>{checkoutStockHint}</p>
          <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
            {stockIssues.map((issue) => (
              <li key={issue.productId}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {marginWarnings.length > 0 ? (
        <div
          role="alert"
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            borderRadius: 10,
            background: '#fffbeb',
            border: '2px solid #fbbf24',
            color: '#78350f',
            fontSize: '0.875rem',
          }}
        >
          <strong>Margin di bawah modal</strong>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
            Harga jual lebih rendah dari modal — transaksi tetap bisa dilanjutkan.
          </p>
          <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
            {marginWarnings.map((warning) => (
              <li key={warning.productId}>{warning.productName}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!hasCartItems ? (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '1.25rem 1rem',
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.875rem',
          }}
        >
          <p style={{ margin: 0 }}>Belum ada item.</p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem' }}>Tap produk di katalog untuk mulai transaksi.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.65rem', marginTop: '0.75rem' }}>
          {cart.map((item) => {
            const product = products.find((row) => row.id === item.productId);
            const lineStock = evaluateCartLineStock({
              productId: item.productId,
              productName: item.name,
              stockQty: product?.stockQty,
              baseUnitId: item.baseUnitId,
              baseUnitSymbol: product?.unit?.symbol ?? item.unitSymbol,
              lineQty: item.quantity,
              sellUnitId: item.sellUnitId,
              sellUnitSymbol: item.unitSymbol,
              unitConversions: item.unitConversions,
              cart,
            });

            return (
              <div
                key={`${item.productId}-${item.sellUnitId ?? 'base'}`}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '0.65rem',
                  background: '#fafafa',
                }}
              >
                <strong style={{ fontSize: '0.875rem' }}>{item.name}</strong>
                <p style={{ margin: '0.15rem 0 0.35rem', color: '#334155', fontSize: '0.8125rem' }}>
                  {formatCurrencyIDR(item.price)} × {item.quantity}
                  {item.unitSymbol ? ` ${item.unitSymbol}` : ''}
                </p>
                {item.sellUnits && item.sellUnits.length > 1 ? (
                  <label style={{ display: 'grid', gap: '0.2rem', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                    Satuan
                    <select
                      value={item.sellUnitId ?? ''}
                      onChange={(event) => onUpdateCartSellUnit(item.productId, event.target.value)}
                      style={{
                        minHeight: 44,
                        padding: '0.35rem 0.5rem',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                      }}
                    >
                      <option value="">Satuan dasar ({item.unitSymbol})</option>
                      {item.sellUnits
                        .filter((unit) => unit.symbol !== item.unitSymbol)
                        .map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.symbol})
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onStepQty(item.productId, -1, item.sellUnitId)}
                    style={stepperStyle}
                    aria-label={`Kurangi ${item.name}`}
                  >
                    −
                  </Button>
                  <QuantityInput
                    value={String(item.quantity)}
                    onChange={(value) =>
                      onUpdateQty(item.productId, parseQuantityInput(value || String(item.orderStep)), item.sellUnitId)
                    }
                    placeholder="1"
                    style={{ width: 72, minHeight: 44, padding: '0.35rem 0.5rem', fontSize: '0.9375rem' }}
                    aria-label={`Jumlah ${item.name}`}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onStepQty(item.productId, 1, item.sellUnitId)}
                    style={stepperStyle}
                    aria-label={`Tambah ${item.name}`}
                  >
                    +
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onUpdateQty(item.productId, 0, item.sellUnitId)}
                    style={{ minHeight: 44 }}
                  >
                    Hapus
                  </Button>
                </div>
                {lineStock.availableLabel ? (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#166534' }}>
                    {lineStock.availableLabel}
                  </p>
                ) : null}
                {lineStock.warning ? (
                  <p role="alert" style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#b91c1c' }}>
                    {lineStock.warning}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {hasCartItems && onCustomerNameChange && onCustomerPhoneChange ? (
        <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Pelanggan (opsional)</span>
            {onOpenCustomerPicker ? (
              <Button type="button" variant="secondary" onClick={onOpenCustomerPicker} style={{ minHeight: 36 }}>
                Pilih dari Daftar
              </Button>
            ) : null}
          </div>
          <input
            type="text"
            value={customerName}
            onChange={(event) => onCustomerNameChange(event.target.value)}
            placeholder="Nama pelanggan"
            aria-label="Nama pelanggan"
            style={{
              minHeight: 44,
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
            }}
          />
          <input
            type="tel"
            value={customerPhone}
            onChange={(event) => onCustomerPhoneChange(event.target.value)}
            placeholder="08xxxxxxxxxx"
            aria-label="No. HP pelanggan"
            style={{
              minHeight: 44,
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
            }}
          />
          {onMemberScanChange ? (
            <input
              type="text"
              value={memberScanInput}
              onChange={(event) => onMemberScanChange(event.target.value)}
              placeholder="Scan QR / ketik kode MBR-…"
              aria-label="Scan kartu member"
              style={{
                minHeight: 44,
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
              }}
            />
          ) : null}
          {customerLinked ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#166534' }}>
              Pelanggan terhubung: <strong>{customerName.trim() || '—'}</strong>
              {customerMemberCode ? (
                <span style={{ marginLeft: 6, fontFamily: 'monospace', color: '#1d4ed8' }}>
                  ({customerMemberCode})
                </span>
              ) : null}
            </p>
          ) : customerPhone.trim().length >= 8 ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#b45309' }}>
              No. HP belum terdaftar — daftar pelanggan di dashboard untuk tempo/deposit.
            </p>
          ) : null}
          {customerLinked && loyaltyPointsPreview != null && loyaltyPointsPreview > 0 ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#166534' }}>
              Estimasi poin didapat: <strong>+{loyaltyPointsPreview}</strong> (1 poin / Rp{' '}
              {loyaltyEarnRateIdr.toLocaleString('id-ID')})
            </p>
          ) : null}
          {loyaltyRedeemEnabled &&
          customerPointsBalance != null &&
          customerPointsBalance > 0 &&
          onLoyaltyPointsToRedeemChange ? (
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8125rem' }}>
              Tukar poin (saldo: {customerPointsBalance})
              <input
                type="number"
                min={0}
                max={customerPointsBalance}
                value={loyaltyPointsToRedeem}
                onChange={(event) => onLoyaltyPointsToRedeemChange(event.target.value)}
                placeholder="0"
                aria-label="Jumlah poin ditukar"
                style={{
                  minHeight: 44,
                  padding: '0.5rem 0.75rem',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                }}
              />
              {loyaltyRedeemDiscount > 0 ? (
                <span style={{ color: '#166534' }}>
                  Diskon poin: −{formatCurrencyIDR(loyaltyRedeemDiscount)} (1 poin = Rp{' '}
                  {loyaltyRedeemValueIdr.toLocaleString('id-ID')})
                </span>
              ) : null}
            </label>
          ) : null}
          {customerLinked ? (
            <div
              role="status"
              style={{
                marginTop: '0.35rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 8,
                background: financePanelColors.bg,
                border: `1px solid ${financePanelColors.border}`,
                fontSize: '0.8125rem',
                color: '#1e3a5f',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '0.35rem', color: financePanelColors.accent }}>
                Info Keuangan Pelanggan
              </strong>
              {customerMemberCode ? (
                <div style={{ fontFamily: 'monospace', marginBottom: '0.25rem' }}>
                  Kode member: <strong>{customerMemberCode}</strong>
                </div>
              ) : null}
              <div style={{ display: 'grid', gap: '0.2rem' }}>
                <div>
                  Saldo poin:{' '}
                  <strong style={{ color: '#16a34a' }}>
                    {(customerPointsBalance ?? 0).toLocaleString('id-ID')}
                  </strong>
                </div>
                <div>
                  Limit kredit:{' '}
                  <strong style={{ color: customerCreditLimit === 0 ? '#b91c1c' : undefined }}>
                    {customerCreditLimit === 0
                      ? 'Tidak diizinkan tempo'
                      : customerCreditLimit != null
                        ? formatCurrencyIDR(customerCreditLimit)
                        : 'Unlimited'}
                  </strong>
                </div>
                <div style={{ color: creditLimitStatus !== 'ok' ? financePanelColors.accent : undefined }}>
                  Piutang outstanding:{' '}
                  <strong>{formatCurrencyIDR(customerReceivableOutstanding ?? 0)}</strong>
                </div>
                {customerLinked && customerId && (customerReceivableOutstanding ?? 0) > 0 ? (
                  <Link
                    href={`/dashboard/customers/${customerId}?tab=piutang`}
                    style={{ fontSize: '0.75rem', color: '#2563eb' }}
                  >
                    Detail piutang di dashboard →
                  </Link>
                ) : null}
                {(customerReceivableOutstanding ?? 0) > 0 && onOpenReceivablePayment ? (
                  <Button
                    type="button"
                    variant="secondary"
                    style={{ marginTop: '0.35rem', fontSize: '0.8125rem', minHeight: 36 }}
                    onClick={onOpenReceivablePayment}
                  >
                    Terima Pembayaran Piutang
                  </Button>
                ) : null}
                <div>
                  Saldo deposit: <strong>{formatCurrencyIDR(customerDepositBalance ?? 0)}</strong>
                </div>
                {customerCreditLimit !== 0 && customerCreditAvailable != null ? (
                  <div
                    style={{
                      color:
                        creditLimitStatus === 'over'
                          ? '#b91c1c'
                          : creditLimitStatus === 'warning'
                            ? '#b45309'
                            : '#166534',
                    }}
                  >
                    Kredit tersedia: <strong>{formatCurrencyIDR(customerCreditAvailable)}</strong>
                    {creditLimitStatus === 'warning' ? ' (mendekati limit)' : null}
                    {creditLimitStatus === 'over' ? ' (melebihi limit)' : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasCartItems && activePromos.length > 0 ? (
        <label style={{ display: 'grid', gap: '0.35rem', marginTop: '0.75rem', fontSize: '0.8125rem' }}>
          Promo (opsional)
          <select
            value={selectedPromoId === 'none' ? 'none' : selectedPromoId ?? 'auto'}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'auto') {
                onPromoChange(null);
                return;
              }
              if (value === 'none') {
                onPromoChange('none');
                return;
              }
              onPromoChange(value);
            }}
            style={{
              minHeight: 44,
              padding: '0.35rem 0.5rem',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
            }}
          >
            <option value="auto">Otomatis — promo terbaik</option>
            <option value="none">Tanpa promo</option>
            {activePromos.map((promo) => {
              const applicable =
                promoCartLines.length > 0 && isPromoApplicableToCart(promo, promoCartLines);
              const target = formatPromoTargetingLabel(promo);
              return (
                <option key={promo.id} value={promo.id} disabled={!applicable}>
                  {applicable ? '✓ ' : '○ '}
                  {promo.name} ({target})
                </option>
              );
            })}
          </select>
          {promoCartLines.length > 0 ? (
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
              {activePromos.filter((promo) => isPromoApplicableToCart(promo, promoCartLines)).length}{' '}
              promo cocok dengan keranjang
            </span>
          ) : null}
          {appliedPromoName && promoDiscountAmount > 0 ? (
            <span style={{ color: '#166534' }}>
              {appliedPromoName}: −{formatCurrencyIDR(promoDiscountAmount)}
            </span>
          ) : selectedPromoId && selectedPromoId !== 'none' && promoDiscountAmount <= 0 ? (
            <span style={{ color: '#b45309' }}>Promo terpilih belum memenuhi syarat keranjang.</span>
          ) : null}
        </label>
      ) : null}

      <p
        style={{
          color: '#0f172a',
          marginTop: '0.875rem',
          padding: hasCartItems ? '0.875rem' : '0.5rem 0',
          borderRadius: hasCartItems ? 10 : 0,
          background: hasCartItems ? '#f0fdf4' : 'transparent',
          border: hasCartItems ? '1px solid #bbf7d0' : 'none',
          fontSize: hasCartItems ? '1.125rem' : '0.9375rem',
          fontVariantNumeric: 'tabular-nums',
        }}
        aria-live="polite"
      >
        {discountAmount > 0 || taxAmount > 0 ? (
          <>
            <span style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', fontWeight: 400 }}>
              Subtotal {formatCurrencyIDR(subtotal)}
            </span>
            {promoDiscountAmount > 0 ? (
              <span style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', fontWeight: 400 }}>
                Diskon promo −{formatCurrencyIDR(promoDiscountAmount)}
              </span>
            ) : null}
            {loyaltyRedeemDiscount > 0 ? (
              <span style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', fontWeight: 400 }}>
                Diskon poin −{formatCurrencyIDR(loyaltyRedeemDiscount)}
              </span>
            ) : null}
            {taxAmount > 0 ? (
              <span style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', fontWeight: 400 }}>
                PPN {formatCurrencyIDR(taxAmount)}
              </span>
            ) : null}
            <strong>Total: {formatCurrencyIDR(total)}</strong>
          </>
        ) : (
          <strong>Total: {formatCurrencyIDR(total)}</strong>
        )}
      </p>

      {hasCartItems ? (
        <>
          <div aria-label="Metode pembayaran" style={{ display: 'grid', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div>
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                Bayar Langsung
              </p>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {standardPaymentModes.map(renderPaymentModeButton)}
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                Kredit &amp; Deposit <span style={{ fontWeight: 400 }}>(perlu pelanggan)</span>
              </p>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {financePaymentModes.map(renderPaymentModeButton)}
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                Kombinasi
              </p>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {renderPaymentModeButton('SPLIT')}
              </div>
            </div>
          </div>
          {!customerLinked && (paymentMode === 'CREDIT' || paymentMode === 'DEPOSIT') ? (
            <p style={{ fontSize: '0.8125rem', color: '#b45309', marginBottom: '0.75rem' }}>
              {FINANCE_CUSTOMER_REQUIRED_MESSAGE}
            </p>
          ) : null}

          {paymentMode === 'CASH' ? (
            <>
              <CurrencyInput
                label="Tunai diterima (IDR)"
                value={cashReceived}
                onChange={onCashReceivedChange}
                placeholder="150.000"
                fullWidth
                style={{ minHeight: 44 }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <Button
                  type="button"
                  disabled={checkingOut || checkoutBlockedByStock || (!activeShift && isOnline)}
                  onClick={onCheckoutCash}
                  style={{ minHeight: 48, flex: '1 1 auto' }}
                >
                  {checkingOut ? 'Memproses checkout…' : 'Checkout Tunai'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={holding}
                  onClick={onHoldTransaction}
                  style={{ minHeight: 48 }}
                >
                  {holding ? 'Menyimpan hold…' : 'Hold Transaksi'}
                </Button>
              </div>
            </>
          ) : null}

          {paymentMode === 'TRANSFER' || paymentMode === 'QRIS' ? (
            <>
              <label style={{ display: 'grid', gap: '0.3rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.875rem' }}>
                  Referensi {paymentMode === 'QRIS' ? 'QRIS' : 'transfer'} (opsional)
                </span>
                <input
                  value={nonCashReference}
                  onChange={(event) => onNonCashReferenceChange(event.target.value)}
                  type="text"
                  style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.6rem', minHeight: 44 }}
                  placeholder={paymentMode === 'QRIS' ? 'Contoh: QRIS-240602-001' : 'Contoh: TRF-240602-001'}
                />
              </label>
              <Button
                type="button"
                disabled={
                  processingSplit ||
                  qrisPending ||
                  checkoutBlockedByStock ||
                  (!activeShift && isOnline)
                }
                onClick={() => onCheckoutNonCash(paymentMode)}
                style={{ minHeight: 48, width: '100%' }}
              >
                {processingSplit
                  ? 'Memproses…'
                  : qrisPending && paymentMode === 'QRIS'
                    ? 'Menunggu QRIS…'
                    : `Checkout ${paymentMode === 'QRIS' ? 'QRIS' : 'Transfer'}`}
              </Button>
            </>
          ) : null}

          {paymentMode === 'CREDIT' || paymentMode === 'DEPOSIT' ? (
            <>
              {!customerLinked ? (
                <p style={{ fontSize: '0.8125rem', color: '#b45309', marginBottom: '0.75rem' }}>
                  {FINANCE_CUSTOMER_REQUIRED_MESSAGE}. Tap Tempo/Deposit lagi atau pilih pelanggan dari daftar.
                </p>
              ) : null}
              {paymentMode === 'CREDIT' && customerLinked ? (
                <div
                  style={{
                    marginBottom: '0.75rem',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 8,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    fontSize: '0.8125rem',
                    color: '#166534',
                  }}
                >
                  <strong>Masuk piutang:</strong> {formatCurrencyIDR(total)}
                  <label
                    style={{
                      display: 'grid',
                      gap: 4,
                      marginTop: '0.5rem',
                      fontSize: '0.8125rem',
                      color: '#14532d',
                    }}
                  >
                    Jatuh tempo
                    <select
                      value={creditTermsDays}
                      onChange={(e) => onCreditTermsDaysChange?.(Number(e.target.value))}
                      style={{
                        padding: '0.45rem 0.5rem',
                        borderRadius: 6,
                        border: '1px solid #86efac',
                        fontSize: '0.8125rem',
                        minHeight: 40,
                      }}
                    >
                      {CREDIT_TERMS_DAYS_OPTIONS.map((days) => (
                        <option key={days} value={days}>
                          {days} hari
                          {days === defaultCreditTermsDays ? ' (default toko)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
              {paymentMode === 'DEPOSIT' && customerLinked ? (
                <div
                  style={{
                    marginBottom: '0.75rem',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 8,
                    background: depositFullCheckout ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${depositFullCheckout ? '#bbf7d0' : '#fcd34d'}`,
                    fontSize: '0.8125rem',
                    color: depositFullCheckout ? '#166534' : '#92400e',
                  }}
                >
                  <div>
                    Saldo deposit: <strong>{formatCurrencyIDR(customerDepositBalance ?? 0)}</strong>
                  </div>
                  <div>
                    Total belanja: <strong>{formatCurrencyIDR(total)}</strong>
                  </div>
                  {depositFullCheckout ? (
                    <div style={{ marginTop: '0.25rem' }}>
                      Akan dipotong dari deposit: <strong>{formatCurrencyIDR(total)}</strong>
                    </div>
                  ) : depositApplyAmount > 0 ? (
                    <>
                      <div style={{ marginTop: '0.25rem' }}>
                        Deposit terpakai: <strong>{formatCurrencyIDR(depositApplyAmount)}</strong>
                      </div>
                      <div>
                        Kurang: <strong>{formatCurrencyIDR(depositShortfall)}</strong>
                      </div>
                    </>
                  ) : (
                    <div style={{ marginTop: '0.25rem', color: '#b91c1c' }}>
                      Saldo deposit kosong — tidak bisa bayar dengan deposit.
                    </div>
                  )}
                </div>
              ) : null}
              {paymentMode === 'CREDIT' && customerCreditLimit === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.75rem' }}>
                  Pelanggan ini tidak diizinkan transaksi tempo (limit kredit = 0).
                </p>
              ) : null}
              {paymentMode === 'CREDIT' && customerCreditLimit !== 0 && creditOverLimit ? (
                <>
                  <p style={{ fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.75rem' }}>
                    Transaksi tempo melebihi limit kredit tersedia (
                    {formatCurrencyIDR(customerCreditAvailable ?? 0)}). Outstanding:{' '}
                    {formatCurrencyIDR(customerReceivableOutstanding ?? 0)}
                    {customerCreditLimit != null ? ` / Limit: ${formatCurrencyIDR(customerCreditLimit)}` : ''}.
                  </p>
                  {hasCreditApprovalToken ? (
                    <p style={{ fontSize: '0.8125rem', color: '#166534', marginBottom: '0.75rem' }}>
                      Persetujuan manager diterima — checkout tempo diizinkan untuk transaksi ini.
                    </p>
                  ) : onRequestCreditApproval ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onRequestCreditApproval}
                      style={{ minHeight: 44, width: '100%', marginBottom: '0.75rem' }}
                    >
                      Minta Persetujuan Manager
                    </Button>
                  ) : null}
                </>
              ) : null}
              {paymentMode === 'DEPOSIT' && !depositFullCheckout && depositShortfall > 0 ? (
                <>
                  <p style={{ fontSize: '0.8125rem', color: '#b91c1c', marginBottom: '0.75rem' }}>
                    Saldo deposit tidak mencukupi untuk total belanja. Kurang{' '}
                    {formatCurrencyIDR(depositShortfall)}.
                  </p>
                  {depositPlusCreditAvailable && onCheckoutDepositPlusCredit ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={processingSplit || checkoutBlockedByStock || (!activeShift && isOnline)}
                      onClick={onCheckoutDepositPlusCredit}
                      style={{ minHeight: 44, width: '100%', marginBottom: '0.75rem' }}
                    >
                      {processingSplit
                        ? 'Memproses…'
                        : `Pakai Deposit ${formatCurrencyIDR(depositApplyAmount)} + Tempo ${formatCurrencyIDR(depositShortfall)}`}
                    </Button>
                  ) : customerCreditLimit === 0 ? (
                    <p style={{ fontSize: '0.8125rem', color: '#b45309', marginBottom: '0.75rem' }}>
                      Pelanggan tidak diizinkan tempo — gunakan metode bayar lain untuk sisa{' '}
                      {formatCurrencyIDR(depositShortfall)}.
                    </p>
                  ) : depositShortfall > (customerCreditAvailable ?? 0) && !hasCreditApprovalToken ? (
                    <>
                      <p style={{ fontSize: '0.8125rem', color: '#b45309', marginBottom: '0.75rem' }}>
                        Sisa tempo {formatCurrencyIDR(depositShortfall)} melebihi kredit tersedia.
                      </p>
                      {onRequestCreditApproval ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={onRequestCreditApproval}
                          style={{ minHeight: 44, width: '100%', marginBottom: '0.75rem' }}
                        >
                          Minta Persetujuan Manager (Sisa Tempo)
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}
              {paymentMode === 'DEPOSIT' && depositFullCheckout ? (
                <Button
                  type="button"
                  disabled={
                    processingSplit ||
                    checkoutBlockedByStock ||
                    (!activeShift && isOnline) ||
                    !customerLinked
                  }
                  onClick={() => onCheckoutNonCash('DEPOSIT')}
                  style={{ minHeight: 48, width: '100%' }}
                >
                  {processingSplit
                    ? 'Memproses…'
                    : `Checkout Pakai Deposit (${formatCurrencyIDR(total)})`}
                </Button>
              ) : paymentMode === 'CREDIT' ? (
                <Button
                  type="button"
                  disabled={
                    processingSplit ||
                    checkoutBlockedByStock ||
                    (!activeShift && isOnline) ||
                    creditCheckoutBlocked
                  }
                  onClick={() => onCheckoutNonCash('CREDIT')}
                  style={{ minHeight: 48, width: '100%' }}
                >
                  {processingSplit ? 'Memproses…' : `Checkout Tempo (Piutang ${formatCurrencyIDR(total)})`}
                </Button>
              ) : null}
            </>
          ) : null}

          {paymentMode === 'SPLIT' ? (
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Split Payment (Cash + Transfer)</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {splitMethodOptions.map((option) => (
                  <span
                    key={option.method}
                    style={{
                      border: `1px solid ${option.enabled ? '#86efac' : '#cbd5e1'}`,
                      borderRadius: 999,
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.75rem',
                      color: option.enabled ? '#15803d' : '#64748b',
                      background: option.enabled ? '#f0fdf4' : '#f8fafc',
                    }}
                  >
                    {option.label} {option.enabled ? 'aktif' : 'menunggu backend'}
                  </span>
                ))}
              </div>
              <CurrencyInput
                label="Nominal Cash (IDR)"
                value={splitCashAmount}
                onChange={onSplitCashAmountChange}
                placeholder="50.000"
                fullWidth
              />
              <CurrencyInput
                label="Nominal Transfer (IDR)"
                value={splitTransferAmount}
                onChange={onSplitTransferAmountChange}
                placeholder="75.000"
                fullWidth
              />
              <label style={{ display: 'grid', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.875rem' }}>Referensi Transfer (opsional)</span>
                <input
                  value={transferReference}
                  onChange={(event) => onTransferReferenceChange(event.target.value)}
                  type="text"
                  style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.55rem', minHeight: 44 }}
                  placeholder="Contoh: TRF-240602-001"
                />
              </label>
              <p
                style={{
                  margin: 0,
                  color: splitAmountsMismatch || !splitHasValue ? '#b45309' : '#166534',
                  fontSize: '0.85rem',
                }}
              >
                {splitHint}
              </p>
              <Button
                type="button"
                variant="secondary"
                disabled={processingSplit || splitInvalid || (!activeShift && isOnline)}
                onClick={onCheckoutSplit}
                style={{ minHeight: 48 }}
              >
                {processingSplit ? 'Memproses split payment…' : 'Checkout Split'}
              </Button>
              {hasLastSplitAttempt ? (
                <Button type="button" variant="ghost" disabled={processingSplit} onClick={onRetrySplit}>
                  Coba Lagi Split Terakhir
                </Button>
              ) : null}
            </div>
          ) : null}

          {!activeShift && isOnline ? (
            <p style={{ marginTop: '0.5rem', color: '#b45309', fontSize: '0.875rem' }}>
              Shift belum aktif — buka shift di menu atas sebelum checkout.
            </p>
          ) : null}
        </>
      ) : null}

      {success ? <p style={{ marginTop: '0.75rem', color: '#166534', fontSize: '0.875rem' }}>{success}</p> : null}

      {receiptPreview ? (
        <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
          <h3 style={{ marginTop: 0, fontSize: '0.9375rem' }}>Struk Digital</h3>
          <ReceiptPanel
            receipt={receiptPreview.receipt}
            escpos={receiptPreview.escpos}
            onPrint={onPrintReceipt}
            onConnectPrinter={onConnectPrinter}
            onThermalPrint={onThermalPrint}
            thermalStatus={thermalStatus}
            onClose={onCloseReceipt}
          />
        </div>
      ) : null}

      <PosAccordionSection title="Transaksi Terakhir" badge={recentTransactions.length} defaultOpen={false}>
        {loadingRecent ? <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Memuat transaksi…</p> : null}
        {!loadingRecent && recentTransactions.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Belum ada transaksi selesai.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            {recentTransactions.map((trx) => (
              <div
                key={trx.id}
                style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.55rem 0.65rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.8125rem' }}>{trx.receiptNo}</strong>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: trx.status === 'VOID' ? '#b91c1c' : '#166534',
                    }}
                  >
                    {trx.status}
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0', color: '#334155', fontSize: '0.8125rem' }}>
                  {formatCurrencyIDR(trx.total)} · {trx.cashierName}
                </p>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={loadingReceiptId === trx.id}
                    onClick={() => onOpenReceipt(trx.id)}
                    style={{ minHeight: 40, fontSize: '0.8125rem' }}
                  >
                    {loadingReceiptId === trx.id ? 'Memuat…' : 'Lihat Struk'}
                  </Button>
                  {trx.status === 'COMPLETED' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onVoidTransaction(trx)}
                      style={{ minHeight: 40, fontSize: '0.8125rem' }}
                    >
                      Void
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </PosAccordionSection>

      <PosAccordionSection title="Daftar Hold" badge={heldTransactions.length} defaultOpen={false}>
        {loadingHeld ? <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Memuat hold…</p> : null}
        {!loadingHeld && heldTransactions.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Belum ada transaksi hold aktif.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            {heldTransactions.map((held) => (
              <div
                key={held.id}
                style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.55rem 0.65rem' }}
              >
                <strong style={{ fontSize: '0.8125rem' }}>{held.label || 'Hold tanpa label'}</strong>
                <p style={{ margin: '0.2rem 0', color: '#334155', fontSize: '0.8125rem' }}>
                  {held.itemCount} item · {formatCurrencyIDR(held.total)}
                </p>
                <p style={{ margin: '0 0 0.35rem', color: '#64748b', fontSize: '0.8rem' }}>
                  Berlaku sampai{' '}
                  {new Date(held.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={recallingId === held.id}
                  onClick={() => onRecallTransaction(held.id)}
                  style={{ minHeight: 40, fontSize: '0.8125rem' }}
                >
                  {recallingId === held.id ? 'Memproses recall…' : 'Recall'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </PosAccordionSection>
    </aside>
  );
}
