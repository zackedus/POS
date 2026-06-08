'use client';

import Link from 'next/link';
import { formatCurrencyIDR, CREDIT_TERMS_DAYS_OPTIONS, isValidIndonesianMobilePhone } from '@barokah/shared';
import { Button, CurrencyInput } from '@barokah/ui';
import type { PaymentMode } from './pos-types';
import {
  PosDeliverySelector,
  type DeliverySelection,
} from '@/components/pos/PosDeliverySelector';
import { usePosCheckoutContext } from '@/hooks/usePosCheckoutContext';
import { FINANCE_CUSTOMER_REQUIRED_MESSAGE } from '@/lib/pos-finance-payment';

const paymentLabels: Record<PaymentMode, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer',
  QRIS: 'QRIS',
  SPLIT: 'Split',
  CREDIT: 'Tempo',
  DEPOSIT: 'Deposit',
};

const directPaymentModes: PaymentMode[] = ['CASH', 'TRANSFER', 'QRIS'];
const financePaymentModes: PaymentMode[] = ['CREDIT', 'DEPOSIT'];

function sectionCardStyle(accent?: string) {
  return {
    border: `1px solid ${accent ?? '#e2e8f0'}`,
    borderRadius: 12,
    padding: '0.75rem',
    background: '#fff',
    display: 'grid' as const,
    gap: '0.5rem',
  };
}

function sectionTitleStyle() {
  return {
    margin: 0,
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
  };
}

function financePanelColor(status: 'ok' | 'warning' | 'over'): { bg: string; border: string; accent: string } {
  if (status === 'over') return { bg: '#fef2f2', border: '#fecaca', accent: '#b91c1c' };
  if (status === 'warning') return { bg: '#fffbeb', border: '#fcd34d', accent: '#b45309' };
  return { bg: '#eff6ff', border: '#bfdbfe', accent: '#1e40af' };
}

export interface PosCheckoutContextPanelProps {
  total: number;
  paymentMode: PaymentMode;
  onPaymentModeChange: (mode: PaymentMode) => void;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerMemberCode: string;
  memberScanInput: string;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onMemberScanChange: (value: string) => void;
  onOpenCustomerPicker: () => void;
  onClearCustomer?: () => void;
  loyaltyPointsPreview: number | null;
  loyaltyRedeemEnabled: boolean;
  loyaltyRedeemValueIdr: number;
  customerPointsBalance: number | null;
  customerReceivableOutstanding: number | null;
  customerDepositBalance: number | null;
  customerCreditLimit: number | null;
  customerCreditAvailable: number | null;
  loyaltyPointsToRedeem: string;
  onLoyaltyPointsToRedeemChange: (value: string) => void;
  loyaltyRedeemDiscount: number;
  deliveryEnabled: boolean;
  onDeliveryEnabledChange: (enabled: boolean) => void;
  deliverySelection: DeliverySelection | null;
  onDeliverySelectionChange: (selection: DeliverySelection | null) => void;
  deliveryNotes: string;
  onDeliveryNotesChange: (notes: string) => void;
  isOnline: boolean;
  hasCreditApprovalToken: boolean;
  onRequestCreditApproval: () => void;
  onOpenReceivablePayment: () => void;
  defaultCreditTermsDays: number;
  creditTermsDays: number;
  onCreditTermsDaysChange: (days: number) => void;
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
  processingFinance: boolean;
  holding: boolean;
  qrisPending: boolean;
  activeShift: boolean;
  checkoutBlocked: boolean;
  onCheckoutCash: () => void;
  onHoldTransaction: () => void;
  onCheckoutNonCash: (mode: 'TRANSFER' | 'QRIS' | 'CREDIT' | 'DEPOSIT') => void;
  onCheckoutSplit: () => void;
  onRetrySplit: () => void;
  hasLastSplitAttempt: boolean;
  onCheckoutDepositPlusCredit: () => void;
}

export function PosCheckoutContextPanel(props: PosCheckoutContextPanelProps) {
  const {
    total,
    paymentMode,
    onPaymentModeChange,
    customerId,
    customerName,
    customerPhone,
    customerMemberCode,
    memberScanInput,
    onCustomerNameChange,
    onCustomerPhoneChange,
    onMemberScanChange,
    onOpenCustomerPicker,
    onClearCustomer,
    loyaltyPointsPreview,
    loyaltyRedeemEnabled,
    loyaltyRedeemValueIdr,
    customerPointsBalance,
    customerReceivableOutstanding,
    customerDepositBalance,
    customerCreditLimit,
    customerCreditAvailable,
    loyaltyPointsToRedeem,
    onLoyaltyPointsToRedeemChange,
    loyaltyRedeemDiscount,
    deliveryEnabled,
    onDeliveryEnabledChange,
    deliverySelection,
    onDeliverySelectionChange,
    deliveryNotes,
    onDeliveryNotesChange,
    isOnline,
    hasCreditApprovalToken,
    onRequestCreditApproval,
    onOpenReceivablePayment,
    defaultCreditTermsDays,
    creditTermsDays,
    onCreditTermsDaysChange,
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
    processingFinance,
    holding,
    qrisPending,
    activeShift,
    checkoutBlocked,
    onCheckoutCash,
    onHoldTransaction,
    onCheckoutNonCash,
    onCheckoutSplit,
    onRetrySplit,
    hasLastSplitAttempt,
    onCheckoutDepositPlusCredit,
  } = props;

  const ctx = usePosCheckoutContext({
    customerId,
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
  });

  const financeColors = financePanelColor(ctx.creditLimitStatus);
  const shiftGateBlocked = !activeShift && isOnline;
  const checkoutActionBlocked = checkoutBlocked || shiftGateBlocked || !ctx.deliveryValid;

  function renderModeButton(mode: PaymentMode, group: 'direct' | 'finance' | 'split') {
    if (group === 'finance' && !ctx.canUseFinancePayment && ctx.isWalkIn) {
      return (
        <button
          key={mode}
          type="button"
          aria-disabled
          title={FINANCE_CUSTOMER_REQUIRED_MESSAGE}
          onClick={() => onPaymentModeChange(mode)}
          style={{
            minHeight: 44,
            minWidth: 72,
            padding: '0 0.75rem',
            borderRadius: 8,
            border: '1px dashed #cbd5e1',
            background: '#f8fafc',
            color: '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.8125rem',
          }}
        >
          {paymentLabels[mode]}
        </button>
      );
    }

    const active = paymentMode === mode;
    return (
      <button
        key={mode}
        type="button"
        aria-pressed={active}
        onClick={() => onPaymentModeChange(mode)}
        style={{
          minHeight: 44,
          minWidth: 72,
          padding: '0 0.75rem',
          borderRadius: 8,
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: active ? '#16a34a' : '#e2e8f0',
          background: active ? '#f0fdf4' : '#fff',
          color: active ? '#15803d' : '#334155',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '0.8125rem',
        }}
      >
        {paymentLabels[mode]}
      </button>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '0.65rem', marginTop: '0.75rem' }}>
      {/* ── Pelanggan ── */}
      <section style={sectionCardStyle('#dbeafe')} aria-label="Pelanggan">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <h3 style={sectionTitleStyle()}>Pelanggan</h3>
          {ctx.customerLinked ? (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.45rem',
                borderRadius: 999,
                background: '#dcfce7',
                color: '#166534',
              }}
            >
              Terdaftar
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.45rem',
                borderRadius: 999,
                background: '#f1f5f9',
                color: '#64748b',
              }}
            >
              Walk-in
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          <Button type="button" variant="secondary" onClick={onOpenCustomerPicker} style={{ minHeight: 44, flex: 1 }}>
            Pilih Pelanggan
          </Button>
          {ctx.customerLinked && onClearCustomer ? (
            <Button type="button" variant="ghost" onClick={onClearCustomer} style={{ minHeight: 44 }}>
              Walk-in
            </Button>
          ) : null}
        </div>

        <input
          type="text"
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          placeholder="Nama (opsional walk-in)"
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
          onChange={(e) => onCustomerPhoneChange(e.target.value)}
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
        <input
          type="text"
          value={memberScanInput}
          onChange={(e) => onMemberScanChange(e.target.value)}
          placeholder="Scan QR / ketik MBR-…"
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

        {ctx.isWalkIn && isValidIndonesianMobilePhone(customerPhone) ? (
          <p role="status" style={{ margin: 0, fontSize: '0.8125rem', color: '#475569' }}>
            No. HP belum terdaftar. Checkout tunai/transfer/QRIS tetap bisa — pilih pelanggan dari daftar
            untuk tempo, deposit, atau pengiriman.
          </p>
        ) : null}

        {ctx.customerLinked ? (
          <div
            role="status"
            style={{
              padding: '0.65rem',
              borderRadius: 8,
              background: financeColors.bg,
              border: `1px solid ${financeColors.border}`,
              fontSize: '0.8125rem',
            }}
          >
            <strong style={{ color: financeColors.accent }}>{customerName.trim() || 'Pelanggan'}</strong>
            {customerMemberCode ? (
              <span style={{ marginLeft: 6, fontFamily: 'monospace', color: '#1d4ed8' }}>
                {customerMemberCode}
              </span>
            ) : null}
            <div style={{ display: 'grid', gap: '0.2rem', marginTop: '0.35rem', color: '#1e3a5f' }}>
              <div>
                Kredit tersedia:{' '}
                <strong
                  style={{
                    color:
                      ctx.creditLimitStatus === 'over'
                        ? '#b91c1c'
                        : ctx.creditLimitStatus === 'warning'
                          ? '#b45309'
                          : '#166534',
                  }}
                >
                  {customerCreditLimit === 0
                    ? 'Tidak diizinkan'
                    : customerCreditAvailable != null
                      ? formatCurrencyIDR(customerCreditAvailable)
                      : '—'}
                </strong>
              </div>
              <div>
                Saldo deposit: <strong>{formatCurrencyIDR(customerDepositBalance ?? 0)}</strong>
              </div>
              {(customerReceivableOutstanding ?? 0) > 0 ? (
                <>
                  <div>
                    Piutang: <strong>{formatCurrencyIDR(customerReceivableOutstanding ?? 0)}</strong>
                  </div>
                  {customerId ? (
                    <Link
                      href={`/dashboard/customers/${customerId}?tab=piutang`}
                      style={{ fontSize: '0.75rem', color: '#2563eb' }}
                    >
                      Detail piutang →
                    </Link>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    style={{ minHeight: 40, fontSize: '0.8125rem', marginTop: 4 }}
                    onClick={onOpenReceivablePayment}
                  >
                    Terima Pembayaran Piutang
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {ctx.customerLinked && loyaltyPointsPreview != null && loyaltyPointsPreview > 0 ? (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#166534' }}>
            Estimasi poin: <strong>+{loyaltyPointsPreview}</strong>
          </p>
        ) : null}

        {loyaltyRedeemEnabled && (customerPointsBalance ?? 0) > 0 ? (
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8125rem' }}>
            Tukar poin (saldo: {customerPointsBalance})
            <input
              type="number"
              min={0}
              max={customerPointsBalance ?? 0}
              value={loyaltyPointsToRedeem}
              onChange={(e) => onLoyaltyPointsToRedeemChange(e.target.value)}
              placeholder="0"
              aria-label="Jumlah poin ditukar"
              style={{
                minHeight: 44,
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
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
      </section>

      {/* ── Pengiriman ── */}
      <section style={sectionCardStyle('#e0f2fe')} aria-label="Pengiriman">
        <h3 style={sectionTitleStyle()}>Pengiriman</h3>
        {!ctx.canUseDelivery && ctx.isWalkIn ? (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
            Walk-in — ambil di toko. Pilih pelanggan untuk opsi kirim.
          </p>
        ) : (
          <PosDeliverySelector
            enabled={deliveryEnabled}
            onEnabledChange={onDeliveryEnabledChange}
            customerId={customerId}
            customerName={customerName}
            selection={deliverySelection}
            onSelectionChange={onDeliverySelectionChange}
            notes={deliveryNotes}
            onNotesChange={onDeliveryNotesChange}
            isOnline={isOnline}
          />
        )}
        {ctx.deliveryBlockedReason ? (
          <p role="alert" style={{ margin: 0, fontSize: '0.8125rem', color: '#b45309' }}>
            {ctx.deliveryBlockedReason}
          </p>
        ) : null}
      </section>

      {/* ── Pembayaran ── */}
      <section style={sectionCardStyle('#dcfce7')} aria-label="Pembayaran">
        <h3 style={sectionTitleStyle()}>Pembayaran</h3>

        <div style={{ display: 'grid', gap: '0.45rem' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Bayar Langsung</p>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {directPaymentModes.map((mode) => renderModeButton(mode, 'direct'))}
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
            Kredit &amp; Deposit {ctx.isWalkIn ? '(perlu pelanggan)' : ''}
          </p>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {financePaymentModes.map((mode) => renderModeButton(mode, 'finance'))}
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Kombinasi</p>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {renderModeButton('SPLIT', 'split')}
          </div>
        </div>

        {ctx.preCheckoutBlockMessage ? (
          <p role="alert" style={{ margin: 0, fontSize: '0.8125rem', color: '#b45309' }}>
            {ctx.preCheckoutBlockMessage}
          </p>
        ) : null}

        {ctx.showCreditTerms ? (
          <div
            style={{
              padding: '0.65rem',
              borderRadius: 8,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              fontSize: '0.8125rem',
            }}
          >
            <strong style={{ color: '#166534' }}>Jatuh tempo</strong>
            <select
              value={creditTermsDays}
              onChange={(e) => onCreditTermsDaysChange(Number(e.target.value))}
              aria-label="Jatuh tempo"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 6,
                padding: '0.45rem 0.5rem',
                borderRadius: 6,
                border: '1px solid #86efac',
                minHeight: 44,
              }}
            >
              {CREDIT_TERMS_DAYS_OPTIONS.map((days) => (
                <option key={days} value={days}>
                  {days} hari{days === defaultCreditTermsDays ? ' (default toko)' : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {paymentMode === 'CREDIT' && ctx.creditOverLimit ? (
          hasCreditApprovalToken ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#166534' }}>
              Persetujuan manager diterima — checkout tempo diizinkan.
            </p>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={onRequestCreditApproval}
              style={{ minHeight: 44, width: '100%' }}
            >
              Minta Persetujuan Manager
            </Button>
          )
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
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button
                type="button"
                disabled={checkingOut || checkoutActionBlocked}
                onClick={onCheckoutCash}
                style={{ minHeight: 48, flex: '1 1 auto' }}
              >
                {checkingOut ? 'Memproses…' : 'Checkout Tunai'}
              </Button>
              <Button type="button" variant="secondary" disabled={holding} onClick={onHoldTransaction} style={{ minHeight: 48 }}>
                {holding ? 'Menyimpan…' : 'Hold'}
              </Button>
            </div>
          </>
        ) : null}

        {paymentMode === 'TRANSFER' || paymentMode === 'QRIS' ? (
          <>
            <label style={{ display: 'grid', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.875rem' }}>
                Referensi {paymentMode === 'QRIS' ? 'QRIS' : 'transfer'} (opsional)
              </span>
              <input
                value={nonCashReference}
                onChange={(e) => onNonCashReferenceChange(e.target.value)}
                type="text"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.6rem', minHeight: 44 }}
              />
            </label>
            <Button
              type="button"
              disabled={processingFinance || qrisPending || checkoutActionBlocked}
              onClick={() => onCheckoutNonCash(paymentMode)}
              style={{ minHeight: 48, width: '100%' }}
            >
              {processingFinance
                ? 'Memproses…'
                : qrisPending && paymentMode === 'QRIS'
                  ? 'Menunggu QRIS…'
                  : `Checkout ${paymentLabels[paymentMode]}`}
            </Button>
          </>
        ) : null}

        {paymentMode === 'DEPOSIT' && ctx.customerLinked ? (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <div
              style={{
                padding: '0.65rem',
                borderRadius: 8,
                background: ctx.depositFullCheckout ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${ctx.depositFullCheckout ? '#bbf7d0' : '#fcd34d'}`,
                fontSize: '0.8125rem',
              }}
            >
              Saldo deposit: <strong>{formatCurrencyIDR(customerDepositBalance ?? 0)}</strong>
              {!ctx.depositFullCheckout && ctx.depositApplyAmount > 0 ? (
                <p style={{ margin: '0.25rem 0 0' }}>
                  Terpakai {formatCurrencyIDR(ctx.depositApplyAmount)} — kurang{' '}
                  {formatCurrencyIDR(ctx.depositShortfall)}
                </p>
              ) : null}
            </div>
            {ctx.depositFullCheckout ? (
              <Button
                type="button"
                disabled={processingFinance || checkoutActionBlocked}
                onClick={() => onCheckoutNonCash('DEPOSIT')}
                style={{ minHeight: 48, width: '100%' }}
              >
                {processingFinance ? 'Memproses…' : `Checkout Deposit (${formatCurrencyIDR(total)})`}
              </Button>
            ) : ctx.depositPlusCreditAvailable ? (
              <Button
                type="button"
                variant="secondary"
                disabled={processingFinance || checkoutActionBlocked}
                onClick={onCheckoutDepositPlusCredit}
                style={{ minHeight: 44, width: '100%' }}
              >
                {processingFinance
                  ? 'Memproses…'
                  : `Deposit ${formatCurrencyIDR(ctx.depositApplyAmount)} + Tempo ${formatCurrencyIDR(ctx.depositShortfall)}`}
              </Button>
            ) : null}
          </div>
        ) : null}

        {paymentMode === 'CREDIT' && ctx.customerLinked ? (
          <Button
            type="button"
            disabled={processingFinance || checkoutActionBlocked || ctx.creditCheckoutBlocked}
            onClick={() => onCheckoutNonCash('CREDIT')}
            style={{ minHeight: 48, width: '100%' }}
          >
            {processingFinance ? 'Memproses…' : `Checkout Tempo (${formatCurrencyIDR(total)})`}
          </Button>
        ) : null}

        {paymentMode === 'SPLIT' ? (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Split (Tunai + Transfer)</p>
            <CurrencyInput label="Nominal Tunai" value={splitCashAmount} onChange={onSplitCashAmountChange} fullWidth />
            <CurrencyInput
              label="Nominal Transfer"
              value={splitTransferAmount}
              onChange={onSplitTransferAmountChange}
              fullWidth
            />
            <label style={{ display: 'grid', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.875rem' }}>Referensi transfer (opsional)</span>
              <input
                value={transferReference}
                onChange={(e) => onTransferReferenceChange(e.target.value)}
                type="text"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.55rem', minHeight: 44 }}
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
              disabled={processingFinance || splitInvalid || shiftGateBlocked}
              onClick={onCheckoutSplit}
              style={{ minHeight: 48 }}
            >
              {processingFinance ? 'Memproses…' : 'Checkout Split'}
            </Button>
            {hasLastSplitAttempt ? (
              <Button type="button" variant="ghost" disabled={processingFinance} onClick={onRetrySplit}>
                Coba Lagi Split Terakhir
              </Button>
            ) : null}
          </div>
        ) : null}

        {shiftGateBlocked ? (
          <p style={{ margin: 0, color: '#b45309', fontSize: '0.875rem' }}>
            Shift belum aktif — buka shift di menu atas.
          </p>
        ) : null}
      </section>
    </div>
  );
}
