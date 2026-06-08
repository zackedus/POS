'use client';

import { formatCurrencyIDR, parseQuantityInput } from '@barokah/shared';
import { Button, QuantityInput } from '@barokah/ui';
import type { CartMarginWarning, CartStockIssue } from '@/lib/cart-margin';
import { evaluateCartLineStock } from '@/lib/pos-stock-display';
import type { RecentTransactionSummary, ReceiptResponse } from '@/lib/transactions';
import { ReceiptPanel } from '@/components/pos/ReceiptPanel';
import { PosAccordionSection } from '@/components/pos/PosAccordionSection';
import { PosCheckoutContextPanel } from '@/components/pos/PosCheckoutContextPanel';
import type { DeliverySelection } from '@/components/pos/PosDeliverySelector';
import type { CartItem, HeldTransactionSummary, PaymentMode, ProductGridItem } from './pos-types';

import {
  formatPromoTargetingLabel,
  isPromoApplicableToCart,
  type PromoCartLine,
} from '@/lib/promo-checkout-api';
import type { PromoRuleView } from '@/lib/promotions-api';

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
  onClearCustomer?: () => void;
  onRequestCreditApproval?: () => void;
  hasCreditApprovalToken?: boolean;
  onCheckoutDepositPlusCredit?: () => void;
  onOpenReceivablePayment?: () => void;
  defaultCreditTermsDays?: number;
  creditTermsDays?: number;
  onCreditTermsDaysChange?: (days: number) => void;
  deliveryEnabled?: boolean;
  onDeliveryEnabledChange?: (enabled: boolean) => void;
  deliverySelection?: DeliverySelection | null;
  onDeliverySelectionChange?: (selection: DeliverySelection | null) => void;
  deliveryNotes?: string;
  onDeliveryNotesChange?: (notes: string) => void;
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
  loyaltyEarnRateIdr: _loyaltyEarnRateIdr = 10_000,
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
  onClearCustomer,
  onRequestCreditApproval,
  hasCreditApprovalToken = false,
  onCheckoutDepositPlusCredit,
  onOpenReceivablePayment,
  defaultCreditTermsDays = 30,
  creditTermsDays = defaultCreditTermsDays,
  onCreditTermsDaysChange,
  deliveryEnabled = false,
  onDeliveryEnabledChange,
  deliverySelection = null,
  onDeliverySelectionChange,
  deliveryNotes = '',
  onDeliveryNotesChange,
}: PosCartPanelProps) {
  const hasCartItems = cart.length > 0;
  const stepperStyle = { minHeight: 44, minWidth: 44, padding: 0, fontSize: '1.125rem' };
  const checkoutContextReady =
    onCustomerNameChange &&
    onCustomerPhoneChange &&
    onOpenCustomerPicker &&
    onRequestCreditApproval &&
    onCheckoutDepositPlusCredit &&
    onOpenReceivablePayment &&
    onCreditTermsDaysChange &&
    onMemberScanChange &&
    onLoyaltyPointsToRedeemChange &&
    onDeliveryEnabledChange &&
    onDeliverySelectionChange &&
    onDeliveryNotesChange;

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

      {hasCartItems && checkoutContextReady ? (
        <PosCheckoutContextPanel
          total={total}
          paymentMode={paymentMode}
          onPaymentModeChange={onPaymentModeChange}
          customerId={customerId}
          customerName={customerName}
          customerPhone={customerPhone}
          customerMemberCode={customerMemberCode}
          memberScanInput={memberScanInput}
          onCustomerNameChange={onCustomerNameChange}
          onCustomerPhoneChange={onCustomerPhoneChange}
          onMemberScanChange={onMemberScanChange}
          onOpenCustomerPicker={onOpenCustomerPicker}
          onClearCustomer={onClearCustomer}
          loyaltyPointsPreview={loyaltyPointsPreview ?? null}
          loyaltyRedeemEnabled={loyaltyRedeemEnabled}
          loyaltyRedeemValueIdr={loyaltyRedeemValueIdr}
          customerPointsBalance={customerPointsBalance}
          customerReceivableOutstanding={customerReceivableOutstanding}
          customerDepositBalance={customerDepositBalance}
          customerCreditLimit={customerCreditLimit}
          customerCreditAvailable={customerCreditAvailable}
          loyaltyPointsToRedeem={loyaltyPointsToRedeem}
          onLoyaltyPointsToRedeemChange={onLoyaltyPointsToRedeemChange}
          loyaltyRedeemDiscount={loyaltyRedeemDiscount}
          deliveryEnabled={deliveryEnabled}
          onDeliveryEnabledChange={onDeliveryEnabledChange}
          deliverySelection={deliverySelection}
          onDeliverySelectionChange={onDeliverySelectionChange}
          deliveryNotes={deliveryNotes}
          onDeliveryNotesChange={onDeliveryNotesChange}
          isOnline={isOnline}
          hasCreditApprovalToken={hasCreditApprovalToken}
          onRequestCreditApproval={onRequestCreditApproval}
          onOpenReceivablePayment={onOpenReceivablePayment}
          defaultCreditTermsDays={defaultCreditTermsDays}
          creditTermsDays={creditTermsDays}
          onCreditTermsDaysChange={onCreditTermsDaysChange}
          cashReceived={cashReceived}
          onCashReceivedChange={onCashReceivedChange}
          nonCashReference={nonCashReference}
          onNonCashReferenceChange={onNonCashReferenceChange}
          splitCashAmount={splitCashAmount}
          onSplitCashAmountChange={onSplitCashAmountChange}
          splitTransferAmount={splitTransferAmount}
          onSplitTransferAmountChange={onSplitTransferAmountChange}
          transferReference={transferReference}
          onTransferReferenceChange={onTransferReferenceChange}
          splitHint={splitHint}
          splitInvalid={splitInvalid}
          splitAmountsMismatch={splitAmountsMismatch}
          splitHasValue={splitHasValue}
          checkingOut={checkingOut}
          processingFinance={processingSplit}
          holding={holding}
          qrisPending={qrisPending}
          activeShift={activeShift}
          checkoutBlocked={checkoutBlockedByStock}
          onCheckoutCash={onCheckoutCash}
          onHoldTransaction={onHoldTransaction}
          onCheckoutNonCash={onCheckoutNonCash}
          onCheckoutSplit={onCheckoutSplit}
          onRetrySplit={onRetrySplit}
          hasLastSplitAttempt={hasLastSplitAttempt}
          onCheckoutDepositPlusCredit={onCheckoutDepositPlusCredit}
        />
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
