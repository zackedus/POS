'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrencyIDR, formatEmptyStockMessage, isValidSellQuantity, parseCurrencyInput, previewLoyaltyPointsEarned, computePosTax, previewLoyaltyRedeemDiscount } from '@barokah/shared';
import { PosCartPanel } from '@/components/pos/PosCartPanel';
import { PosProductGrid } from '@/components/pos/PosProductGrid';
import { PosShiftBar } from '@/components/pos/PosShiftBar';
import { PosUnitPickerModal } from '@/components/pos/PosUnitPickerModal';
import { VoidTransactionModal } from '@/components/pos/VoidTransactionModal';
import type { CartItem, HeldTransactionSummary, PaymentMode, ProductGridItem } from '@/components/pos/pos-types';
import { hasMultipleSellUnits, resolveDisplaySellUnit } from '@/components/pos/pos-ui-utils';
import { apiConfig } from '@/lib/api';
import { authFetch, fetchMe, tokenStorage, type AuthUser } from '@/lib/auth';
import {
  fetchRecentTransactions,
  fetchTransactionReceipt,
  TransactionApiError,
  type RecentTransactionSummary,
  type ReceiptResponse,
} from '@/lib/transactions';
import { connectWebUsbThermalPrinter, printEscPosWebUsb, printReceiptBrowser } from '@/lib/thermal-print';
import { createClientRequestId } from '@/lib/offline-queue';
import {
  CATALOG_CATEGORIES_STALE_MS,
  CATALOG_GRID_STALE_MS,
  fetchCategorySummary,
  fetchProductGrid,
  POS_SERVER_FILTER_THRESHOLD,
} from '@/lib/catalog-api';
import { loadCatalogCache, saveCatalogCache } from '@/lib/catalog-cache';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useOfflinePos } from '@/hooks/useOfflinePos';
import { OfflineBanner } from '@/components/pos/OfflineBanner';
import { SyncConflictModal } from '@/components/pos/SyncConflictModal';
import { QrisPaymentModal } from '@/components/pos/QrisPaymentModal';
import { initiateQrisPayment, type QrisInitiateResult } from '@/lib/qris-payment';
import { useOnlineOrderBadge } from '@/hooks/useOnlineOrderBadge';
import { fetchActiveShift, type ShiftSummary } from '@/lib/shifts-api';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { fetchCartValidation, type CartMarginWarning, type CartStockIssue } from '@/lib/cart-margin';
import { fetchActivePromos, previewPromoLocally, type PromoValidationResult } from '@/lib/promo-checkout-api';
import { fetchTenantSettings } from '@/lib/settings-api';
import { lookupCustomerByPhone } from '@/lib/customers-api';
import type { PromoRuleView } from '@/lib/promotions-api';
import { mapRecallItemsToCart } from '@/lib/recall-cart';
import { evaluateAddToCartStock, resolveStockErrorMessage } from '@/lib/stock-errors';
import { isOutOfStock } from '@/lib/pos-stock-display';

function buildOutletScope(outletId: string | null): { outletId?: string } {
  return outletId ? { outletId } : {};
}

function mapCartItemsForCheckout(cart: CartItem[]) {
  return cart.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    ...(item.sellUnitId ? { sellUnitId: item.sellUnitId } : {}),
  }));
}

interface HeldTransactionDetail {
  id: string;
  label?: string | null;
  total: number;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    sellUnitId?: string;
    unitSymbol?: string;
  }>;
}

interface CheckoutResponse {
  id: string;
  receiptNo: string;
  total: number;
  cashReceived: number;
  change: number;
  hasNegativeMargin?: boolean;
  marginWarnings?: CartMarginWarning[];
}

interface CheckoutSplitResponse {
  id: string;
  receiptNo: string;
  total: number;
  payments: Partial<Record<'CASH' | 'TRANSFER' | 'QRIS' | 'E_WALLET' | 'CARD', number>>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; message?: string; value?: unknown }>;
  };
}

class ApiRequestError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
    this.name = 'ApiRequestError';
  }
}

export default function PosPage() {
  const router = useRouter();
  const {
    isOnline,
    pendingCount,
    pendingHoldCount,
    conflictCount,
    conflicts,
    dismissedConflictIds,
    syncing,
    syncMessage,
    syncNow,
    resolveConflict,
    queueCashCheckout,
    queueSplitCheckout,
    queueHoldBill,
  } = useOfflinePos();
  const [catalogCached, setCatalogCached] = useState(false);
  const [products, setProducts] = useState<ProductGridItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashReceived, setCashReceived] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingHeld, setLoadingHeld] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [processingSplit, setProcessingSplit] = useState(false);
  const [holding, setHolding] = useState(false);
  const [recallingId, setRecallingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [qrisSession, setQrisSession] = useState<QrisInitiateResult | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftSummary | null>(null);
  const [onlineOrderToast, setOnlineOrderToast] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [nonCashReference, setNonCashReference] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [unitPickerProduct, setUnitPickerProduct] = useState<ProductGridItem | null>(null);
  const [heldTransactions, setHeldTransactions] = useState<HeldTransactionSummary[]>([]);
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitTransferAmount, setSplitTransferAmount] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [lastSplitAttempt, setLastSplitAttempt] = useState<{
    cashAmount: number;
    transferAmount: number;
    transferReference?: string;
  } | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<null | (() => void)>(null);
  const [activePromos, setActivePromos] = useState<PromoRuleView[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [lastFailedActionLabel, setLastFailedActionLabel] = useState<string | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionSummary[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<ReceiptResponse | null>(null);
  const [thermalStatus, setThermalStatus] = useState<string | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<RecentTransactionSummary | null>(null);
  const [marginWarnings, setMarginWarnings] = useState<CartMarginWarning[]>([]);
  const [stockIssues, setStockIssues] = useState<CartStockIssue[]>([]);
  const [stockAlert, setStockAlert] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loyaltyPointsEnabled, setLoyaltyPointsEnabled] = useState(true);
  const [loyaltyEarnRateIdr, setLoyaltyEarnRateIdr] = useState(10_000);
  const [loyaltyRedeemEnabled, setLoyaltyRedeemEnabled] = useState(false);
  const [loyaltyRedeemValueIdr, setLoyaltyRedeemValueIdr] = useState(1_000);
  const [loyaltyRedeemMaxPercent, setLoyaltyRedeemMaxPercent] = useState(50);
  const [ppnEnabled, setPpnEnabled] = useState(false);
  const [ppnRatePercent, setPpnRatePercent] = useState(11);
  const [customerPointsBalance, setCustomerPointsBalance] = useState<number | null>(null);
  const [customerReceivableOutstanding, setCustomerReceivableOutstanding] = useState<number | null>(null);
  const [customerDepositBalance, setCustomerDepositBalance] = useState<number | null>(null);
  const [customerCreditAvailable, setCustomerCreditAvailable] = useState<number | null>(null);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState('');

  useEffect(() => {
    void fetchTenantSettings()
      .then((settings) => {
        setLoyaltyPointsEnabled(settings.loyaltyPointsEnabled);
        setLoyaltyEarnRateIdr(settings.loyaltyEarnRateIdr);
        setLoyaltyRedeemEnabled(settings.loyaltyRedeemEnabled);
        setLoyaltyRedeemValueIdr(settings.loyaltyRedeemValueIdr);
        setLoyaltyRedeemMaxPercent(settings.loyaltyRedeemMaxPercent);
        setPpnEnabled(settings.ppnEnabled);
        setPpnRatePercent(settings.ppnRatePercent);
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  useEffect(() => {
    const phone = customerPhone.trim();
    if (!/^08\d{8,11}$/.test(phone)) {
      setCustomerPointsBalance(null);
      setCustomerReceivableOutstanding(null);
      setCustomerDepositBalance(null);
      setCustomerCreditAvailable(null);
      setLoyaltyPointsToRedeem('');
      return;
    }
    let cancelled = false;
    void lookupCustomerByPhone(phone)
      .then((customer) => {
        if (cancelled) return;
        setCustomerPointsBalance(customer?.points ?? 0);
        setCustomerReceivableOutstanding(customer?.receivableOutstanding ?? 0);
        setCustomerDepositBalance(customer?.depositBalance ?? 0);
        setCustomerCreditAvailable(customer?.creditAvailable ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setCustomerPointsBalance(null);
          setCustomerReceivableOutstanding(null);
          setCustomerDepositBalance(null);
          setCustomerCreditAvailable(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [customerPhone]);

  function buildCustomerCheckoutPayload() {
    const name = customerName.trim();
    const phone = customerPhone.trim();
    if (!name && !phone) {
      return {};
    }
    const payload: Record<string, string | number> = {};
    if (name.length >= 2 && /^08\d{8,11}$/.test(phone)) {
      payload.customerName = name;
      payload.customerPhone = phone;
    }
    const pointsToRedeem = parseInt(loyaltyPointsToRedeem, 10);
    if (loyaltyRedeemEnabled && Number.isFinite(pointsToRedeem) && pointsToRedeem > 0) {
      payload.loyaltyPointsToRedeem = pointsToRedeem;
    }
    return payload;
  }

  useEffect(() => {
    const visible = conflicts.filter((c) => !dismissedConflictIds.includes(c.id));
    if (visible.length > 0 && isOnline) {
      setConflictModalOpen(true);
    }
  }, [conflicts, dismissedConflictIds, isOnline]);

  async function handleConnectThermalPrinter() {
    const result = await connectWebUsbThermalPrinter();
    setThermalStatus(result.message);
  }

  async function handleThermalPrint() {
    if (!receiptPreview) {
      setThermalStatus('Tidak ada struk untuk dicetak.');
      return;
    }
    const result = await printEscPosWebUsb(receiptPreview.receipt);
    setThermalStatus(result.message);
  }

  const { outlets, selectedOutletId, needsOutletPick, setSelectedOutletId } = useOutletSelection();
  const activeOutletId = selectedOutletId;
  const shiftOutletMismatch = Boolean(
    activeOutletId && activeShift?.outletId && activeShift.outletId !== activeOutletId,
  );
  const onlineOrderCount = useOnlineOrderBadge(isOnline && Boolean(user), {
    outletId: activeOutletId ?? undefined,
    onCountIncrease: (_nextCount, delta) => {
      setOnlineOrderToast(
        delta === 1 ? 'Order web baru masuk antrian' : `${delta} order web baru masuk antrian`,
      );
      window.setTimeout(() => setOnlineOrderToast(null), 6000);
    },
    onRealtimePaid: (orderNo) => {
      setOnlineOrderToast(`Pembayaran order ${orderNo} diterima`);
      window.setTimeout(() => setOnlineOrderToast(null), 6000);
    },
  });
  const useServerCatalogFilter = catalogTotal > POS_SERVER_FILTER_THRESHOLD;

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'summary'],
    queryFn: fetchCategorySummary,
    enabled: isOnline && Boolean(user),
    staleTime: CATALOG_CATEGORIES_STALE_MS,
  });

  const productsQuery = useQuery({
    queryKey: [
      'products',
      'grid',
      activeOutletId ?? 'all',
      useServerCatalogFilter ? selectedCategoryId : null,
      useServerCatalogFilter ? debouncedSearch.trim() : null,
    ],
    queryFn: () =>
      fetchProductGrid({
        outletId: activeOutletId ?? undefined,
        categoryId: useServerCatalogFilter ? selectedCategoryId ?? undefined : undefined,
        q: useServerCatalogFilter && debouncedSearch.trim() ? debouncedSearch : undefined,
        withMeta: true,
      }),
    enabled: isOnline && Boolean(user),
    staleTime: CATALOG_GRID_STALE_MS,
  });

  const categoryChips = useMemo(() => {
    const rows = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
    return rows
      .filter((category) => category.productCount > 0)
      .map((category) => ({ id: category.id, name: category.name }));
  }, [categoriesQuery.data]);

  function handleLogout() {
    tokenStorage.clear();
    router.replace('/login');
  }

  function parsePositiveIdrInput(value: string): number {
    const parsed = parseCurrencyInput(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.floor(parsed);
  }

  function hasFractionalRupiahInput(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }
    if (trimmed.includes(',')) {
      return true;
    }
    return /\.\d{1,2}$/.test(trimmed.replace(/^Rp\s*/i, '').replace(/\s/g, ''));
  }

  function buildSplitRequestData() {
    return {
      cashAmount: parsePositiveIdrInput(splitCashAmount),
      transferAmount: parsePositiveIdrInput(splitTransferAmount),
      transferReference: transferReference.trim() || undefined,
    };
  }

  function getSplitErrorMessage(code?: string, fallback?: string) {
    if (code === 'PAYMENT_TOTAL_MISMATCH') {
      return 'Nominal split tidak sama dengan total belanja. Samakan nominal lalu coba lagi.';
    }
    if (code === 'PAYMENT_METHOD_DUPLICATED') {
      return 'Metode pembayaran split tidak boleh duplikat. Gunakan kombinasi metode yang berbeda.';
    }
    if (code === 'INVALID_PAYMENT_METHOD') {
      return 'Metode pembayaran tidak dikenali sistem. Pilih metode yang didukung.';
    }
    if (code === 'PAYMENT_AMOUNT_INVALID') {
      return 'Nominal pembayaran tidak valid. Pastikan semua nominal lebih dari nol.';
    }
    if (code === 'VALIDATION_FAILED') {
      return fallback ?? 'Data pembayaran belum valid. Periksa kembali form lalu coba lagi.';
    }
    if (code === 'PAYMENT_METHOD_NOT_SUPPORTED') {
      return 'Metode split payment belum didukung backend. Gunakan metode yang tersedia lalu coba lagi.';
    }
    if (code === 'INSUFFICIENT_STOCK') {
      return fallback ?? 'Stok tidak mencukupi. Periksa keranjang lalu coba lagi.';
    }
    if (code === 'SHIFT_NOT_OPEN') {
      return 'Shift belum aktif. Buka shift terlebih dahulu lalu ulangi checkout split.';
    }
    if (code === 'INVALID_INPUT') {
      return fallback ?? 'Data split payment tidak valid. Periksa nominal cash/transfer lalu coba lagi.';
    }
    return fallback ?? 'Checkout split payment gagal. Silakan coba lagi.';
  }

  function getOperationErrorMessage(operation: 'cash' | 'hold' | 'recall', code?: string, fallback?: string) {
    if (code === 'SHIFT_NOT_OPEN') {
      return 'Shift belum aktif. Buka shift terlebih dahulu sebelum melanjutkan transaksi.';
    }
    if (code === 'INSUFFICIENT_STOCK') {
      return fallback ?? 'Stok tidak mencukupi. Periksa keranjang lalu coba lagi.';
    }
    if (code === 'VALIDATION_FAILED') {
      return fallback ?? 'Data transaksi belum valid. Periksa form lalu coba lagi.';
    }
    if (operation === 'cash') {
      return fallback ?? 'Checkout tunai gagal. Periksa koneksi/jumlah tunai lalu coba lagi.';
    }
    if (operation === 'hold') {
      return fallback ?? 'Gagal menyimpan hold transaksi. Coba lagi setelah koneksi stabil.';
    }
    return fallback ?? 'Recall gagal. Cek stok terbaru lalu coba recall ulang.';
  }

  function isNetworkError(err: unknown) {
    return err instanceof TypeError && err.message.toLowerCase().includes('fetch');
  }

  function setNetworkAwareError(defaultMessage: string, err: unknown) {
    if (!navigator.onLine || isNetworkError(err)) {
      setError('Koneksi jaringan bermasalah. Periksa internet lalu tekan "Coba Lagi".');
      return;
    }
    setError(defaultMessage);
  }

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const promoCartLines = useMemo(
    () =>
      cart.map((item) => {
        const product = products.find((row) => row.id === item.productId);
        return {
          productId: item.productId,
          categoryId: product?.categoryId ?? product?.category?.id ?? null,
          lineSubtotal: item.price * item.quantity,
        };
      }),
    [cart, products],
  );
  const promoPreview = useMemo((): PromoValidationResult => {
    if (cart.length === 0 || activePromos.length === 0 || selectedPromoId === 'none') {
      return { applicable: false, discountAmount: 0, subtotalAfter: subtotal, subtotalBefore: subtotal };
    }
    return previewPromoLocally(activePromos, promoCartLines, selectedPromoId);
  }, [cart, activePromos, selectedPromoId, subtotal, promoCartLines]);
  const discountAmount = promoPreview.discountAmount;
  const promoDiscountAmount = discountAmount;
  const loyaltyRedeemPreview = useMemo(() => {
    const pointsRequested = parseInt(loyaltyPointsToRedeem, 10);
    if (
      !loyaltyRedeemEnabled ||
      !Number.isFinite(pointsRequested) ||
      pointsRequested <= 0 ||
      customerPointsBalance == null
    ) {
      return { pointsRedeemed: 0, discountIdr: 0 };
    }
    return previewLoyaltyRedeemDiscount(
      pointsRequested,
      customerPointsBalance,
      subtotal,
      promoDiscountAmount,
      {
        enabled: loyaltyRedeemEnabled,
        pointValueIdr: loyaltyRedeemValueIdr,
        maxPercentOfNet: loyaltyRedeemMaxPercent,
      },
    );
  }, [
    customerPointsBalance,
    loyaltyPointsToRedeem,
    loyaltyRedeemEnabled,
    loyaltyRedeemMaxPercent,
    loyaltyRedeemValueIdr,
    promoDiscountAmount,
    subtotal,
  ]);
  const loyaltyRedeemDiscount = loyaltyRedeemPreview.discountIdr;
  const totalDiscount = promoDiscountAmount + loyaltyRedeemDiscount;
  const taxPreview = useMemo(
    () =>
      computePosTax({
        subtotal,
        discount: totalDiscount,
        ppnEnabled,
        ppnRatePercent,
      }),
    [ppnEnabled, ppnRatePercent, subtotal, totalDiscount],
  );
  const taxAmount = taxPreview.tax;
  const total = taxPreview.total;
  const loyaltyPointsPreview = useMemo(() => {
    const name = customerName.trim();
    const phone = customerPhone.trim();
    if (!loyaltyPointsEnabled || name.length < 2 || !/^08\d{8,11}$/.test(phone)) {
      return null;
    }
    return previewLoyaltyPointsEarned(subtotal, totalDiscount, {
      enabled: loyaltyPointsEnabled,
      earnRateIdr: loyaltyEarnRateIdr,
    });
  }, [customerName, customerPhone, totalDiscount, loyaltyEarnRateIdr, loyaltyPointsEnabled, subtotal]);
  const checkoutPromoRuleId =
    selectedPromoId === 'none' || !promoPreview.applicable ? undefined : promoPreview.promoRuleId;
  const splitCash = parsePositiveIdrInput(splitCashAmount);
  const splitTransfer = parsePositiveIdrInput(splitTransferAmount);
  const splitTotal = splitCash + splitTransfer;
  const splitCashRawInvalid =
    splitCashAmount.trim().length > 0 && hasFractionalRupiahInput(splitCashAmount);
  const splitTransferRawInvalid =
    splitTransferAmount.trim().length > 0 && hasFractionalRupiahInput(splitTransferAmount);
  const splitRawInvalid = splitCashRawInvalid || splitTransferRawInvalid;
  const splitHasValue = splitCash > 0 || splitTransfer > 0;
  const splitAmountsMismatch = cart.length > 0 && splitHasValue && splitTotal !== total;
  const checkoutBlockedByStock = stockIssues.length > 0;
  const checkoutBlockedByOutlet = needsOutletPick || shiftOutletMismatch || !activeOutletId;
  const checkoutOutletHint = needsOutletPick
    ? 'Pilih cabang aktif sebelum checkout.'
    : shiftOutletMismatch
      ? 'Shift aktif tidak sesuai cabang terpilih. Buka shift di cabang ini.'
      : 'Cabang aktif belum dipilih.';
  const checkoutBlocked = checkoutBlockedByStock || checkoutBlockedByOutlet;
  const checkoutStockHint =
    stockIssues[0]?.message ?? 'Stok tidak mencukupi. Sesuaikan jumlah di keranjang sebelum checkout.';
  const checkoutBlockHint = checkoutBlockedByOutlet ? checkoutOutletHint : checkoutStockHint;
  const splitInvalid =
    cart.length === 0 || !splitHasValue || splitAmountsMismatch || splitRawInvalid || checkoutBlocked;
  const splitHint =
    cart.length === 0
      ? 'Tambahkan item ke keranjang sebelum split payment.'
      : checkoutBlocked
        ? checkoutBlockHint
      : splitRawInvalid
        ? 'Nominal split harus angka bulat >= 0 (contoh: 50.000).'
      : !splitHasValue
        ? 'Isi nominal cash atau transfer terlebih dahulu.'
        : splitAmountsMismatch
          ? `Total split harus sama dengan total keranjang (selisih ${formatCurrencyIDR(Math.abs(total - splitTotal))}).`
          : `Total split sesuai: ${formatCurrencyIDR(splitTotal)}.`;
  async function loadRecentTransactions() {
    setLoadingRecent(true);
    try {
      const rows = await fetchRecentTransactions({ limit: 8, outletId: activeOutletId ?? undefined });
      setRecentTransactions(rows);
    } catch (err) {
      if (err instanceof TransactionApiError) {
        setError(err.message);
      }
    } finally {
      setLoadingRecent(false);
    }
  }

  async function openReceipt(transactionId: string) {
    setLoadingReceiptId(transactionId);
    setError(null);
    try {
      const data = await fetchTransactionReceipt(transactionId);
      setReceiptPreview(data);
    } catch (err) {
      setReceiptPreview(null);
      setError(err instanceof Error ? err.message : 'Gagal memuat struk.');
    } finally {
      setLoadingReceiptId(null);
    }
  }

  async function loadHeldTransactions() {
    setLoadingHeld(true);
    try {
      const params = activeOutletId ? `?outletId=${encodeURIComponent(activeOutletId)}` : '';
      const heldRes = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/held${params}`);
      const heldJson = (await heldRes.json()) as ApiEnvelope<HeldTransactionSummary[]>;
      if (!heldRes.ok || !heldJson.success || !heldJson.data) {
        throw new Error(heldJson.error?.message ?? 'Gagal memuat transaksi hold.');
      }
      setHeldTransactions(heldJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat transaksi hold.');
    } finally {
      setLoadingHeld(false);
    }
  }

  useEffect(() => {
    async function loadContext() {
      setError(null);
      setCatalogCached(false);
      try {
        const userProfile = await fetchMe();
        setUser(userProfile);

        if (isOnline) {
          const [shift, promos] = await Promise.all([
            fetchActiveShift(activeOutletId ?? undefined).catch(() => null),
            fetchActivePromos().catch(() => [] as PromoRuleView[]),
          ]);
          setActiveShift(shift);
          setActivePromos(promos);
        } else {
          setActiveShift(null);
          setActivePromos([]);
        }

        if (!isOnline) {
          const cached = await loadCatalogCache();
          if (cached?.products?.length) {
            setProducts(cached.products as ProductGridItem[]);
            setCatalogCached(true);
            setCatalogTotal(cached.products.length);
          } else {
            throw new Error(
              'Tidak ada katalog tersimpan. Buka kasir sekali saat online untuk cache produk.',
            );
          }
          setHeldTransactions([]);
          setRecentTransactions([]);
          return;
        }

        const heldParams = activeOutletId ? `?outletId=${encodeURIComponent(activeOutletId)}` : '';
        const [heldRes, recentRows] = await Promise.all([
          authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/held${heldParams}`),
          fetchRecentTransactions({ limit: 8, outletId: activeOutletId ?? undefined }).catch(() => []),
        ]);
        const heldJson = (await heldRes.json()) as ApiEnvelope<HeldTransactionSummary[]>;
        if (!heldRes.ok || !heldJson.success || !heldJson.data) {
          throw new Error(heldJson.error?.message ?? 'Gagal memuat transaksi hold.');
        }

        setHeldTransactions(heldJson.data);
        setRecentTransactions(recentRows);
      } catch (err) {
        if (!isOnline) {
          const cached = await loadCatalogCache();
          if (cached?.products?.length) {
            setProducts(cached.products as ProductGridItem[]);
            setCatalogCached(true);
            setCatalogTotal(cached.products.length);
            setError(null);
            return;
          }
        }
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat POS.');
      }
    }

    void loadContext();
  }, [isOnline, activeOutletId]);

  useEffect(() => {
    if (!isOnline) {
      setLoadingProducts(false);
      return;
    }
    setLoadingProducts(productsQuery.isFetching);
    if (productsQuery.data?.items) {
      setProducts(productsQuery.data.items);
    }
    if (productsQuery.data?.total != null) {
      setCatalogTotal(productsQuery.data.total);
    }
    if (productsQuery.error) {
      setError(productsQuery.error instanceof Error ? productsQuery.error.message : 'Gagal memuat katalog produk.');
    }
  }, [isOnline, productsQuery.data, productsQuery.error, productsQuery.isFetching]);

  useEffect(() => {
    if (!isOnline || !productsQuery.data?.items?.length) return;
    const isBaselineFetch = !selectedCategoryId && !debouncedSearch.trim();
    if (isBaselineFetch) {
      void saveCatalogCache(productsQuery.data.items);
    }
  }, [isOnline, productsQuery.data, selectedCategoryId, debouncedSearch]);

  useEffect(() => {
    if (!isOnline || cart.length === 0) {
      setMarginWarnings([]);
      setStockIssues([]);
      return;
    }
    let cancelled = false;
    void fetchCartValidation(mapCartItemsForCheckout(cart), activeOutletId ?? undefined).then((validation) => {
      if (!cancelled) {
        setMarginWarnings(validation.marginWarnings);
        setStockIssues(validation.stockIssues);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cart, isOnline, activeOutletId]);

  function resolveOrderStep(product: ProductGridItem, sellUnitId?: string): number {
    if (sellUnitId && product.sellUnits) {
      const alt = product.sellUnits.find((u) => u.id === sellUnitId);
      if (alt?.sellStep && alt.sellStep > 0) return alt.sellStep;
    }
    return product.orderStep && product.orderStep > 0 ? product.orderStep : 1;
  }

  function buildCartConversions(product: ProductGridItem) {
    if (!product.sellUnits?.length) return [];
    return product.sellUnits.map((u) => ({
      unitId: u.id,
      conversionToBase: u.conversionToBase ?? 1,
      isPurchaseUnit: false,
      isSellUnit: true,
      sellStep: u.sellStep,
      minQty: u.minQty,
    }));
  }

  function resolveSellUnitSelection(product: ProductGridItem, sellUnitId?: string) {
    if (sellUnitId) {
      const unit = product.sellUnits?.find((row) => row.id === sellUnitId);
      if (unit) {
        return { sellUnitId: unit.id, unitSymbol: unit.symbol, price: unit.price };
      }
    }
    return resolveDisplaySellUnit(product);
  }

  function handleProductClick(product: ProductGridItem) {
    if (isOutOfStock(product.stockQty)) {
      const message = formatEmptyStockMessage(product.name);
      setStockAlert(message);
      setError(message);
      return;
    }
    if (hasMultipleSellUnits(product)) {
      setUnitPickerProduct(product);
      return;
    }
    addToCart(product);
  }

  function addToCart(product: ProductGridItem, sellUnitId?: string) {
    setSuccess(null);
    setStockAlert(null);
    const sellDefault = resolveSellUnitSelection(product, sellUnitId);
    const step = resolveOrderStep(product, sellDefault.sellUnitId);
    const unitConversions = buildCartConversions(product);
    const existing = cart.find(
      (item) => item.productId === product.id && item.sellUnitId === sellDefault.sellUnitId,
    );
    const nextQty = existing
      ? Number((existing.quantity + step).toFixed(3))
      : product.moq && product.moq > 0
        ? product.moq
        : step;

    const stockCheck = evaluateAddToCartStock({
      productId: product.id,
      productName: product.name,
      stockQty: product.stockQty,
      baseUnitId: product.unit?.id,
      baseUnitSymbol: product.unit?.symbol,
      lineQty: nextQty,
      sellUnitId: sellDefault.sellUnitId,
      sellUnitSymbol: sellDefault.unitSymbol ?? product.unit?.symbol,
      unitConversions,
      cart,
    });

    if (!stockCheck.ok) {
      setStockAlert(stockCheck.message);
      setError(stockCheck.message);
      return;
    }

    setCart((prev) => {
      const current = prev.find(
        (item) => item.productId === product.id && item.sellUnitId === sellDefault.sellUnitId,
      );
      if (current) {
        return prev.map((item) =>
          item.productId === product.id && item.sellUnitId === sellDefault.sellUnitId
            ? { ...item, quantity: nextQty }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: sellDefault.price,
          quantity: nextQty,
          unitSymbol: sellDefault.unitSymbol ?? product.unit?.symbol,
          sellUnitId: sellDefault.sellUnitId,
          orderStep: step,
          moq: product.moq,
          baseUnitId: product.unit?.id,
          sellUnits: product.sellUnits,
          unitConversions,
        },
      ];
    });
  }

  function updateCartSellUnit(productId: string, sellUnitId: string) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const unit = item.sellUnits?.find((u) => u.id === sellUnitId);
        const step = unit?.sellStep && unit.sellStep > 0 ? unit.sellStep : item.orderStep;
        const moq = unit?.minQty && unit.minQty > 0 ? unit.minQty : step;
        return {
          ...item,
          sellUnitId: sellUnitId || undefined,
          unitSymbol: unit?.symbol ?? item.unitSymbol,
          price: unit?.price ?? item.price,
          orderStep: step,
          quantity: moq,
        };
      }),
    );
  }

  function updateQty(productId: string, quantity: number, sellUnitId?: string) {
    if (quantity <= 0) {
      setStockAlert(null);
      setCart((prev) =>
        prev.filter((item) => !(item.productId === productId && item.sellUnitId === sellUnitId)),
      );
      return;
    }
    const target = cart.find((item) => item.productId === productId && item.sellUnitId === sellUnitId);
    if (!target) {
      return;
    }
    const product = products.find((row) => row.id === productId);
    const stockCheck = evaluateAddToCartStock({
      productId,
      productName: target.name,
      stockQty: product?.stockQty,
      baseUnitId: target.baseUnitId,
      baseUnitSymbol: product?.unit?.symbol ?? target.unitSymbol,
      lineQty: quantity,
      sellUnitId,
      sellUnitSymbol: target.unitSymbol,
      unitConversions: target.unitConversions,
      cart: cart.filter((item) => !(item.productId === productId && item.sellUnitId === sellUnitId)),
    });
    if (!stockCheck.ok) {
      setStockAlert(stockCheck.message);
      setError(stockCheck.message);
      return;
    }
    setStockAlert(null);
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId || item.sellUnitId !== sellUnitId) return item;
        const baseId = item.baseUnitId ?? '';
        const valid = isValidSellQuantity(
          quantity,
          item.sellUnitId,
          baseId,
          item.moq ?? item.orderStep,
          item.orderStep,
          item.unitConversions ?? [],
        );
        if (!valid) return item;
        return { ...item, quantity: Number(quantity.toFixed(3)) };
      }),
    );
  }

  function stepQty(productId: string, direction: 1 | -1, sellUnitId?: string) {
    const target = cart.find((item) => item.productId === productId && item.sellUnitId === sellUnitId);
    if (!target) {
      return;
    }
    const next = Number((target.quantity + direction * target.orderStep).toFixed(3));
    if (direction > 0) {
      updateQty(productId, Math.max(target.orderStep, next), sellUnitId);
      return;
    }
    if (next < target.orderStep) {
      updateQty(productId, 0, sellUnitId);
      return;
    }
    setStockAlert(null);
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.sellUnitId === sellUnitId
          ? { ...item, quantity: next }
          : item,
      ),
    );
  }

  async function handleCheckoutCash() {
    if (cart.length === 0 || checkoutBlockedByOutlet) {
      if (checkoutBlockedByOutlet) {
        setError(checkoutOutletHint);
      }
      return;
    }

    const cartItems = mapCartItemsForCheckout(cart);
    const cashReceivedValue = parseCurrencyInput(cashReceived);

    if (!isOnline) {
      setCheckingOut(true);
      setError(null);
      setSuccess(null);
      try {
        const requestId = await queueCashCheckout({
          items: cartItems,
          cashReceived: cashReceivedValue,
        });
        setSuccess(
          `Transaksi offline tersimpan (antrean). ID: ${requestId.slice(0, 8)}… — akan disinkronkan saat online.`,
        );
        setCart([]);
        setCashReceived('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi offline.');
      } finally {
        setCheckingOut(false);
      }
      return;
    }

    setCheckingOut(true);
    setError(null);
    setSuccess(null);
    setLastFailedAction(null);
    setLastFailedActionLabel(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/checkout-cash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          cashReceived: cashReceivedValue,
          clientRequestId: createClientRequestId(),
          ...buildOutletScope(activeOutletId),
          ...(checkoutPromoRuleId ? { promoRuleId: checkoutPromoRuleId } : {}),
          ...buildCustomerCheckoutPayload(),
        }),
      });
      const json = (await res.json()) as ApiEnvelope<CheckoutResponse>;
      if (!res.ok || !json.success || !json.data) {
        throw new ApiRequestError(
          resolveStockErrorMessage(json.error) ??
            getOperationErrorMessage('cash', json.error?.code, json.error?.message),
          json.error?.code,
        );
      }

      setSuccess(
        `Checkout berhasil (${json.data.receiptNo}). Kembalian: ${formatCurrencyIDR(json.data.change)}.${
          json.data.hasNegativeMargin ? ' Perhatian: ada item dengan margin negatif.' : ''
        }`,
      );
      setCart([]);
      setCashReceived('');
      setLoyaltyPointsToRedeem('');
      await loadRecentTransactions();
      void openReceipt(json.data.id);
    } catch (err) {
      const action = () => {
        void handleCheckoutCash();
      };
      setLastFailedAction(() => action);
      setLastFailedActionLabel('Retry Checkout Tunai');
      if (err instanceof ApiRequestError) {
        setNetworkAwareError(getOperationErrorMessage('cash', err.code, err.message), err);
      } else if (err instanceof Error) {
        setNetworkAwareError(err.message, err);
      } else {
        setError(getOperationErrorMessage('cash', undefined));
      }
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleHoldTransaction() {
    if (cart.length === 0 || checkoutBlockedByOutlet) {
      if (checkoutBlockedByOutlet) {
        setError(checkoutOutletHint);
      }
      return;
    }

    const holdItems = mapCartItemsForCheckout(cart);
    const holdLabel = `Hold ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

    if (!isOnline) {
      setHolding(true);
      setError(null);
      setSuccess(null);
      try {
        const requestId = await queueHoldBill({ items: holdItems, label: holdLabel });
        setCart([]);
        setCashReceived('');
        setSuccess(
          `Hold offline tersimpan (antrean). ID: ${requestId.slice(0, 8)}… — disinkronkan saat online.`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan hold offline.');
      } finally {
        setHolding(false);
      }
      return;
    }

    setHolding(true);
    setError(null);
    setSuccess(null);
    setLastFailedAction(null);
    setLastFailedActionLabel(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: holdItems,
          label: holdLabel,
          clientRequestId: createClientRequestId(),
          ...buildOutletScope(activeOutletId),
        }),
      });
      const json = (await res.json()) as ApiEnvelope<HeldTransactionDetail>;
      if (!res.ok || !json.success || !json.data) {
        throw new ApiRequestError(
          resolveStockErrorMessage(json.error) ??
            getOperationErrorMessage('hold', json.error?.code, json.error?.message),
          json.error?.code,
        );
      }
      setCart([]);
      setCashReceived('');
      setLoyaltyPointsToRedeem('');
      setSuccess('Hold berhasil disimpan. Lanjutkan dari panel Daftar Hold kapan saja.');
      await loadHeldTransactions();
    } catch (err) {
      const action = () => {
        void handleHoldTransaction();
      };
      setLastFailedAction(() => action);
      setLastFailedActionLabel('Retry Hold');
      if (err instanceof ApiRequestError) {
        setNetworkAwareError(getOperationErrorMessage('hold', err.code, err.message), err);
      } else if (err instanceof Error) {
        setNetworkAwareError(err.message, err);
      } else {
        setError(getOperationErrorMessage('hold', undefined));
      }
    } finally {
      setHolding(false);
    }
  }

  async function handleRecallTransaction(heldId: string) {
    setRecallingId(heldId);
    setError(null);
    setSuccess(null);
    setLastFailedAction(null);
    setLastFailedActionLabel(null);
    try {
      const recallParams = activeOutletId ? `?outletId=${encodeURIComponent(activeOutletId)}` : '';
      const res = await authFetch(
        `${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/held/${heldId}${recallParams}`,
        {
        method: 'DELETE',
        },
      );
      const json = (await res.json()) as ApiEnvelope<HeldTransactionDetail>;
      if (!res.ok || !json.success || !json.data) {
        throw new ApiRequestError(
          resolveStockErrorMessage(json.error) ??
            getOperationErrorMessage('recall', json.error?.code, json.error?.message),
          json.error?.code,
        );
      }
      setCart(mapRecallItemsToCart(json.data.items, products) as CartItem[]);
      setSuccess('Recall berhasil. Item hold sudah kembali ke keranjang dan siap checkout.');
      await loadHeldTransactions();
    } catch (err) {
      const action = () => {
        void handleRecallTransaction(heldId);
      };
      setLastFailedAction(() => action);
      setLastFailedActionLabel('Retry Recall');
      if (err instanceof ApiRequestError) {
        setNetworkAwareError(getOperationErrorMessage('recall', err.code, err.message), err);
      } else if (err instanceof Error) {
        setNetworkAwareError(err.message, err);
      } else {
        setError(getOperationErrorMessage('recall', undefined));
      }
    } finally {
      setRecallingId(null);
    }
  }

  async function submitCheckoutSplit(splitData: {
    cashAmount: number;
    transferAmount: number;
    transferReference?: string;
  }) {
    const cartItems = mapCartItemsForCheckout(cart);
    const payments = [
      { method: 'CASH', amount: splitData.cashAmount },
      { method: 'TRANSFER', amount: splitData.transferAmount, reference: splitData.transferReference },
    ];

    if (!isOnline) {
      setProcessingSplit(true);
      setError(null);
      setSuccess(null);
      try {
        const requestId = await queueSplitCheckout({ items: cartItems, payments });
        setSuccess(
          `Split payment offline tersimpan (antrean). ID: ${requestId.slice(0, 8)}… — akan disinkronkan saat online.`,
        );
        setCart([]);
        setCashReceived('');
        setSplitCashAmount('');
        setSplitTransferAmount('');
        setTransferReference('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan split payment offline.');
      } finally {
        setProcessingSplit(false);
      }
      return;
    }

    setProcessingSplit(true);
    setError(null);
    setSuccess(null);
    setLastFailedAction(null);
    setLastFailedActionLabel(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/checkout-split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          payments,
          clientRequestId: createClientRequestId(),
          ...buildOutletScope(activeOutletId),
          ...(checkoutPromoRuleId ? { promoRuleId: checkoutPromoRuleId } : {}),
          ...buildCustomerCheckoutPayload(),
        }),
      });
      const json = (await res.json()) as ApiEnvelope<CheckoutSplitResponse>;
      if (!res.ok || !json.success || !json.data) {
        setLastSplitAttempt(splitData);
        throw new ApiRequestError(
          resolveStockErrorMessage(json.error) ??
            getSplitErrorMessage(json.error?.code, json.error?.message),
          json.error?.code,
        );
      }

      setSuccess(
        `Checkout split berhasil (${json.data.receiptNo}). Cash: ${formatCurrencyIDR(json.data.payments.CASH ?? 0)}, Transfer: ${formatCurrencyIDR(json.data.payments.TRANSFER ?? 0)}.`,
      );
      setCart([]);
      setCashReceived('');
      setLoyaltyPointsToRedeem('');
      setSplitCashAmount('');
      setSplitTransferAmount('');
      setTransferReference('');
      setLastSplitAttempt(null);
      await loadRecentTransactions();
      void openReceipt(json.data.id);
    } catch (err) {
      const action = () => {
        void submitCheckoutSplit(splitData);
      };
      setLastFailedAction(() => action);
      setLastFailedActionLabel('Retry Split');
      if (err instanceof ApiRequestError) {
        setNetworkAwareError(getSplitErrorMessage(err.code, err.message), err);
      } else if (err instanceof Error) {
        setNetworkAwareError(err.message, err);
      } else {
        setError('Terjadi kesalahan saat checkout split payment.');
      }
    } finally {
      setProcessingSplit(false);
    }
  }

  async function handleCheckoutSplit() {
    if (cart.length === 0) {
      return;
    }
    await submitCheckoutSplit(buildSplitRequestData());
  }

  const handleQrisPaid = useCallback(
    ({ transactionId, receiptNo, total: paidTotal }: { transactionId: string; receiptNo: string; total: number }) => {
      setQrisSession(null);
      setSuccess(`Checkout QRIS berhasil (${receiptNo}). Total: ${formatCurrencyIDR(paidTotal)}.`);
      setCart([]);
      setNonCashReference('');
      setLoyaltyPointsToRedeem('');
      void loadRecentTransactions();
      void openReceipt(transactionId);
    },
    [activeOutletId],
  );

  async function handleCheckoutNonCash(method: 'TRANSFER' | 'QRIS' | 'CREDIT' | 'DEPOSIT') {
    if (cart.length === 0 || total <= 0) {
      return;
    }

    if (checkoutBlockedByOutlet) {
      setError(checkoutOutletHint);
      return;
    }

    if (method === 'QRIS' && qrisSession) {
      return;
    }

    const cartItems = mapCartItemsForCheckout(cart);

    if (method === 'QRIS' && isOnline) {
      setProcessingSplit(true);
      setError(null);
      setSuccess(null);
      try {
        const session = await initiateQrisPayment({
          items: cartItems,
          clientRequestId: createClientRequestId(),
          outletId: activeOutletId ?? undefined,
          ...(checkoutPromoRuleId ? { promoRuleId: checkoutPromoRuleId } : {}),
        });
        setQrisSession(session);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memulai QRIS.');
      } finally {
        setProcessingSplit(false);
      }
      return;
    }

    const payments = [
      {
        method,
        amount: total,
        reference: nonCashReference.trim() || undefined,
      },
    ];

    if (!isOnline) {
      setProcessingSplit(true);
      setError(null);
      setSuccess(null);
      try {
        const requestId = await queueSplitCheckout({ items: cartItems, payments });
        setSuccess(
          `Pembayaran ${method} offline tersimpan (antrean). ID: ${requestId.slice(0, 8)}… — akan disinkronkan saat online.`,
        );
        setCart([]);
        setNonCashReference('');
      } catch (err) {
        setError(err instanceof Error ? err.message : `Gagal menyimpan pembayaran ${method} offline.`);
      } finally {
        setProcessingSplit(false);
      }
      return;
    }

    setProcessingSplit(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/checkout-split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          payments,
          clientRequestId: createClientRequestId(),
          ...buildOutletScope(activeOutletId),
          ...(checkoutPromoRuleId ? { promoRuleId: checkoutPromoRuleId } : {}),
          ...buildCustomerCheckoutPayload(),
        }),
      });
      const json = (await res.json()) as ApiEnvelope<CheckoutSplitResponse>;
      if (!res.ok || !json.success || !json.data) {
        throw new ApiRequestError(
          getSplitErrorMessage(json.error?.code, json.error?.message),
          json.error?.code,
        );
      }

      setSuccess(`Checkout ${method} berhasil (${json.data.receiptNo}). Total: ${formatCurrencyIDR(json.data.total)}.`);
      setCart([]);
      setNonCashReference('');
      setLoyaltyPointsToRedeem('');
      await loadRecentTransactions();
      void openReceipt(json.data.id);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setNetworkAwareError(getSplitErrorMessage(err.code, err.message), err);
      } else if (err instanceof Error) {
        setNetworkAwareError(err.message, err);
      } else {
        setError(`Checkout ${method} gagal. Silakan coba lagi.`);
      }
    } finally {
      setProcessingSplit(false);
    }
  }

  function retrySplitWithLastAttempt() {
    if (!lastSplitAttempt || processingSplit) {
      return;
    }
    setSplitCashAmount(String(lastSplitAttempt.cashAmount));
    setSplitTransferAmount(String(lastSplitAttempt.transferAmount));
    setTransferReference(lastSplitAttempt.transferReference ?? '');
    void submitCheckoutSplit(lastSplitAttempt);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {user ? (
        <PosShiftBar
          userName={user.fullName}
          activeShift={activeShift}
          onlineOrderCount={onlineOrderCount}
          outlets={outlets}
          selectedOutletId={activeOutletId}
          needsOutletPick={needsOutletPick}
          shiftOutletMismatch={shiftOutletMismatch}
          onOutletChange={setSelectedOutletId}
          onLogout={handleLogout}
        />
      ) : null}
      {onlineOrderToast ? (
        <div
          role="status"
          style={{
            padding: '0.625rem 1rem',
            background: '#ECFDF5',
            borderBottom: '1px solid #6EE7B7',
            color: '#065F46',
            fontSize: '0.875rem',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {onlineOrderToast}
        </div>
      ) : null}
      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        pendingHoldCount={pendingHoldCount}
        conflictCount={conflictCount}
        conflicts={conflicts}
        dismissedConflictIds={dismissedConflictIds}
        syncing={syncing}
        syncMessage={syncMessage}
        catalogCached={catalogCached}
        onSyncNow={() => {
          void syncNow().then((summary) => {
            if (summary && (summary.synced.length > 0 || summary.holdSynced?.length)) {
              void loadRecentTransactions();
              void loadHeldTransactions();
            }
          });
        }}
        onResolveConflict={(conflict, action) => {
          void resolveConflict(conflict, action);
        }}
      />
      <SyncConflictModal
        open={conflictModalOpen}
        conflicts={conflicts}
        dismissedIds={dismissedConflictIds}
        syncing={syncing}
        onClose={() => setConflictModalOpen(false)}
        onResolve={(conflict, action) => {
          void resolveConflict(conflict, action);
        }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 380px)',
          flex: 1,
          minHeight: 0,
        }}
      >
        <PosProductGrid
          products={products}
          search={search}
          onSearchChange={setSearch}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
          categories={categoryChips}
          useServerFilter={useServerCatalogFilter}
          loading={loadingProducts}
          stockAlert={stockAlert}
          error={error}
          errorRetry={
            lastFailedAction
              ? { label: lastFailedActionLabel ?? 'Coba Lagi', onClick: lastFailedAction }
              : null
          }
          onProductClick={handleProductClick}
        />

        <PosCartPanel
          cart={cart}
          products={products}
          subtotal={subtotal}
          promoDiscountAmount={promoDiscountAmount}
          loyaltyRedeemDiscount={loyaltyRedeemDiscount}
          taxAmount={taxAmount}
          discountAmount={totalDiscount}
          total={total}
          activePromos={activePromos}
          promoCartLines={promoCartLines}
          selectedPromoId={selectedPromoId}
          onPromoChange={setSelectedPromoId}
          appliedPromoName={promoPreview.promoName}
          stockIssues={stockIssues}
          marginWarnings={marginWarnings}
          checkoutBlockedByStock={checkoutBlocked}
          checkoutStockHint={checkoutBlockHint}
          qrisPending={Boolean(qrisSession)}
          paymentMode={paymentMode}
          onPaymentModeChange={setPaymentMode}
          cashReceived={cashReceived}
          onCashReceivedChange={setCashReceived}
          nonCashReference={nonCashReference}
          onNonCashReferenceChange={setNonCashReference}
          splitCashAmount={splitCashAmount}
          onSplitCashAmountChange={setSplitCashAmount}
          splitTransferAmount={splitTransferAmount}
          onSplitTransferAmountChange={setSplitTransferAmount}
          transferReference={transferReference}
          onTransferReferenceChange={setTransferReference}
          splitHint={splitHint}
          splitInvalid={splitInvalid}
          splitAmountsMismatch={splitAmountsMismatch}
          splitHasValue={splitHasValue}
          checkingOut={checkingOut}
          processingSplit={processingSplit}
          holding={holding}
          recallingId={recallingId}
          activeShift={Boolean(activeShift)}
          isOnline={isOnline}
          success={success}
          onCheckoutCash={() => void handleCheckoutCash()}
          onHoldTransaction={() => void handleHoldTransaction()}
          onCheckoutNonCash={(mode) => void handleCheckoutNonCash(mode)}
          onCheckoutSplit={() => void handleCheckoutSplit()}
          onRetrySplit={retrySplitWithLastAttempt}
          hasLastSplitAttempt={Boolean(lastSplitAttempt)}
          onStepQty={stepQty}
          onUpdateQty={updateQty}
          onUpdateCartSellUnit={updateCartSellUnit}
          recentTransactions={recentTransactions}
          loadingRecent={loadingRecent}
          onOpenReceipt={(id) => void openReceipt(id)}
          loadingReceiptId={loadingReceiptId}
          onVoidTransaction={setVoidTarget}
          heldTransactions={heldTransactions}
          loadingHeld={loadingHeld}
          onRecallTransaction={(id) => void handleRecallTransaction(id)}
          receiptPreview={receiptPreview}
          onPrintReceipt={() => printReceiptBrowser('barokah-receipt-print')}
          onConnectPrinter={() => void handleConnectThermalPrinter()}
          onThermalPrint={() => void handleThermalPrint()}
          thermalStatus={thermalStatus}
          onCloseReceipt={() => setReceiptPreview(null)}
          customerName={customerName}
          customerPhone={customerPhone}
          onCustomerNameChange={setCustomerName}
          onCustomerPhoneChange={setCustomerPhone}
          loyaltyPointsPreview={loyaltyPointsPreview}
          loyaltyEarnRateIdr={loyaltyEarnRateIdr}
          loyaltyRedeemEnabled={loyaltyRedeemEnabled}
          loyaltyRedeemValueIdr={loyaltyRedeemValueIdr}
          customerPointsBalance={customerPointsBalance}
          customerReceivableOutstanding={customerReceivableOutstanding}
          customerDepositBalance={customerDepositBalance}
          customerCreditAvailable={customerCreditAvailable}
          loyaltyPointsToRedeem={loyaltyPointsToRedeem}
          onLoyaltyPointsToRedeemChange={setLoyaltyPointsToRedeem}
        />
      </div>

      <PosUnitPickerModal
        product={unitPickerProduct}
        onClose={() => setUnitPickerProduct(null)}
        onSelect={(sellUnitId) => {
          if (unitPickerProduct) {
            addToCart(unitPickerProduct, sellUnitId);
          }
        }}
      />

      {voidTarget && user ? (
        <VoidTransactionModal
          transaction={voidTarget}
          userRole={user.role}
          onClose={() => setVoidTarget(null)}
          onSuccess={(message) => {
            const voidedId = voidTarget.id;
            setSuccess(message);
            setVoidTarget(null);
            void loadRecentTransactions();
            if (receiptPreview?.receipt.transactionId === voidedId) {
              void openReceipt(voidedId);
            }
          }}
        />
      ) : null}

      <QrisPaymentModal session={qrisSession} onClose={() => setQrisSession(null)} onPaid={handleQrisPaid} />
    </div>
  );
}


