'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MARKETPLACE_ORDER_CHANNELS } from '@barokah/shared';
import { Button, Input, colors } from '@barokah/ui';
import { PosShiftBar } from '@/components/pos/PosShiftBar';
import { PosFulfillmentQueue } from '@/components/pos/PosFulfillmentQueue';
import { mapApiError } from '@/lib/api-client';
import { fetchMe, tokenStorage, type AuthUser } from '@/lib/auth';
import {
  createMarketplaceOrder,
  fetchFulfillmentQueue,
  type FulfillmentOrder,
} from '@/lib/online-orders-api';
import { fetchProductGrid } from '@/lib/catalog-api';
import { fetchActiveShift, type ShiftSummary } from '@/lib/shifts-api';
import { useDeliveryBadge } from '@/hooks/useDeliveryBadge';
import { useOnlineOrderBadge, ONLINE_ORDERS_POLL_MS } from '@/hooks/useOnlineOrderBadge';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { createClientRequestId } from '@/lib/offline-queue';
import type { ProductGridItem } from '@/components/pos/pos-types';

type MarketplaceChannel = 'TOKOPEDIA' | 'SHOPEE' | 'OTHER';

interface LineItemDraft {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
}

export default function MarketplaceOrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftSummary | null>(null);
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [channel, setChannel] = useState<MarketplaceChannel>('TOKOPEDIA');
  const [externalOrderRef, setExternalOrderRef] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'PICKUP' | 'DELIVERY'>('DELIVERY');
  const [street, setStreet] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<ProductGridItem[]>([]);
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);

  const { outlets, selectedOutletId, needsOutletPick, setSelectedOutletId } = useOutletSelection();
  const shiftOutletMismatch = Boolean(
    selectedOutletId && activeShift?.outletId && activeShift.outletId !== selectedOutletId,
  );

  const onlineOrderCount = useOnlineOrderBadge(Boolean(user), {
    outletId: selectedOutletId ?? undefined,
    channel: 'WEB',
  });
  const marketplaceOrderCount = useOnlineOrderBadge(Boolean(user), {
    outletId: selectedOutletId ?? undefined,
    channel: 'MARKETPLACE',
  });
  const deliveryCount = useDeliveryBadge(Boolean(user), selectedOutletId);

  useEffect(() => {
    void fetchMe()
      .then(setUser)
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    void fetchActiveShift(selectedOutletId ?? undefined)
      .then(setActiveShift)
      .catch(() => setActiveShift(null));
  }, [selectedOutletId]);

  const load = useCallback(
    async (silent = false) => {
      if (!selectedOutletId && needsOutletPick) {
        setOrders([]);
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
      }
      try {
        const items = await fetchFulfillmentQueue(selectedOutletId ?? undefined, MARKETPLACE_ORDER_CHANNELS);
        setOrders(items);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        setError(mapApiError(err, 'Gagal memuat antrian marketplace.'));
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [selectedOutletId, needsOutletPick],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load(true);
    }, ONLINE_ORDERS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!productQuery.trim() || !selectedOutletId) {
      setProductResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchProductGrid({ outletId: selectedOutletId, q: productQuery.trim() })
        .then((result) => setProductResults(result.items.slice(0, 8)))
        .catch(() => setProductResults([]));
    }, 300);
    return () => window.clearInterval(timer);
  }, [productQuery, selectedOutletId]);

  const selectedOutletLabel = outlets.find((o) => o.id === selectedOutletId)?.label;

  const canSubmit = useMemo(() => {
    if (!selectedOutletId || !externalOrderRef.trim() || !customerName.trim() || !customerPhone.trim()) {
      return false;
    }
    if (lineItems.length === 0) return false;
    if (fulfillmentType === 'DELIVERY' && (!street.trim() || !district.trim() || !city.trim())) {
      return false;
    }
    return true;
  }, [
    selectedOutletId,
    externalOrderRef,
    customerName,
    customerPhone,
    lineItems.length,
    fulfillmentType,
    street,
    district,
    city,
  ]);

  function addProduct(product: ProductGridItem) {
    setLineItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
        },
      ];
    });
    setProductQuery('');
    setProductResults([]);
  }

  function resetForm() {
    setChannel('TOKOPEDIA');
    setExternalOrderRef('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNotes('');
    setFulfillmentType('DELIVERY');
    setStreet('');
    setDistrict('');
    setCity('');
    setPostalCode('');
    setLineItems([]);
    setFormError(null);
  }

  async function handleSubmit() {
    if (!selectedOutletId || !canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await createMarketplaceOrder({
        outletId: selectedOutletId,
        clientRequestId: createClientRequestId(),
        channel,
        externalOrderRef: externalOrderRef.trim(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNotes: customerNotes.trim() || undefined,
        fulfillmentType,
        ...(fulfillmentType === 'DELIVERY'
          ? {
              deliveryAddress: {
                street: street.trim(),
                district: district.trim(),
                city: city.trim(),
                postalCode: postalCode.trim() || undefined,
              },
            }
          : {}),
        items: lineItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      resetForm();
      setShowForm(false);
      await load(true);
    } catch (err) {
      setFormError(mapApiError(err, 'Gagal mencatat order marketplace.'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    tokenStorage.clear();
    router.replace('/login');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
      {user ? (
        <PosShiftBar
          userName={user.fullName}
          activeShift={activeShift}
          onlineOrderCount={onlineOrderCount}
          marketplaceOrderCount={marketplaceOrderCount}
          deliveryCount={deliveryCount}
          outlets={outlets}
          selectedOutletId={selectedOutletId}
          needsOutletPick={needsOutletPick}
          shiftOutletMismatch={shiftOutletMismatch}
          onOutletChange={setSelectedOutletId}
          onLogout={handleLogout}
        />
      ) : null}

      <div style={{ padding: '1rem', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <div
          role="note"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: 8,
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            color: '#92400e',
            fontSize: '0.875rem',
          }}
        >
          <strong>Fase 2 — Scaffold Marketplace.</strong> Entri manual order Tokopedia/Shopee. Integrasi API otomatis
          direncanakan Fase 3 (ADR-003).
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Order Marketplace</h1>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: colors.light.text.secondary }}>
              Catat order marketplace → Konfirmasi → Disiapkan → Kirim/Selesai
              {selectedOutletLabel ? ` · ${selectedOutletLabel}` : ''}
            </p>
            {lastUpdated ? (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
                Pembaruan otomatis setiap {ONLINE_ORDERS_POLL_MS / 1000} detik · terakhir{' '}
                {lastUpdated.toLocaleTimeString('id-ID')}
              </p>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => setShowForm((v) => !v)} style={{ minHeight: 44 }}>
              {showForm ? 'Tutup Form' : '+ Catat Order'}
            </Button>
            <Link href="/dashboard/deliveries" style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Antrian pengiriman</Button>
            </Link>
            <Button variant="secondary" onClick={() => void load()}>
              Muat ulang
            </Button>
          </div>
        </div>

        {showForm ? (
          <div
            style={{
              marginBottom: '1rem',
              padding: '1rem',
              borderRadius: 12,
              border: `1px solid ${colors.light.border.default}`,
              background: colors.light.bg.base,
            }}
          >
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Entri Manual Order Marketplace</h2>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
                Channel
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as MarketplaceChannel)}
                  style={{ minHeight: 44, borderRadius: 8, padding: '0 0.5rem' }}
                >
                  <option value="TOKOPEDIA">Tokopedia</option>
                  <option value="SHOPEE">Shopee</option>
                  <option value="OTHER">Marketplace Lain</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
                No. Order Marketplace
                <Input value={externalOrderRef} onChange={(e) => setExternalOrderRef(e.target.value)} placeholder="INV/123456" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
                Nama Pelanggan
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
                No. HP
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08…" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
                Tipe
                <select
                  value={fulfillmentType}
                  onChange={(e) => setFulfillmentType(e.target.value as 'PICKUP' | 'DELIVERY')}
                  style={{ minHeight: 44, borderRadius: 8, padding: '0 0.5rem' }}
                >
                  <option value="DELIVERY">Antar ke alamat</option>
                  <option value="PICKUP">Pickup di toko</option>
                </select>
              </label>
            </div>

            {fulfillmentType === 'DELIVERY' ? (
              <div
                style={{
                  marginTop: '0.75rem',
                  display: 'grid',
                  gap: '0.75rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                }}
              >
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem', gridColumn: '1 / -1' }}>
                  Alamat Jalan
                  <Input value={street} onChange={(e) => setStreet(e.target.value)} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
                  Kecamatan
                  <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
                  Kota
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
                  Kode Pos (opsional)
                  <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </label>
              </div>
            ) : null}

            <div style={{ marginTop: '0.75rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
                Cari Produk (SKU/nama)
                <Input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Ketik SKU atau nama…" />
              </label>
              {productResults.length > 0 ? (
                <ul style={{ margin: '0.5rem 0 0', padding: 0, listStyle: 'none', border: `1px solid ${colors.light.border.default}`, borderRadius: 8 }}>
                  {productResults.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.5rem 0.75rem',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          minHeight: 44,
                        }}
                      >
                        {product.name} · {product.sku}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {lineItems.length > 0 ? (
              <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.1rem', fontSize: '0.875rem' }}>
                {lineItems.map((item) => (
                  <li key={item.productId} style={{ marginBottom: 4 }}>
                    {item.productName} · qty{' '}
                    <input
                      type="number"
                      min={0.001}
                      step={0.001}
                      value={item.quantity}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        setLineItems((prev) =>
                          prev.map((row) => (row.productId === item.productId ? { ...row, quantity: qty } : row)),
                        );
                      }}
                      style={{ width: 72, minHeight: 36 }}
                    />{' '}
                    <button type="button" onClick={() => setLineItems((prev) => prev.filter((r) => r.productId !== item.productId))}>
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem', marginTop: '0.75rem' }}>
              Catatan (opsional)
              <Input value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} />
            </label>

            {formError ? (
              <p style={{ color: colors.semantic.error, fontSize: '0.875rem', marginTop: '0.75rem' }}>{formError}</p>
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <Button disabled={!canSubmit || submitting} onClick={() => void handleSubmit()} style={{ minHeight: 44 }}>
                {submitting ? 'Menyimpan…' : 'Simpan & Masuk Antrian'}
              </Button>
              <Button variant="secondary" onClick={resetForm} style={{ minHeight: 44 }}>
                Reset
              </Button>
            </div>
          </div>
        ) : null}

        {needsOutletPick ? (
          <div
            role="alert"
            style={{
              padding: '0.75rem',
              marginBottom: '0.75rem',
              borderRadius: 8,
              background: '#fff7ed',
              color: '#9a3412',
              border: '1px solid #fed7aa',
            }}
          >
            Pilih cabang aktif di header untuk melihat order marketplace cabang tersebut.
          </div>
        ) : null}

        <PosFulfillmentQueue
          orders={orders}
          loading={loading}
          error={error}
          needsOutletPick={needsOutletPick}
          selectedOutletId={selectedOutletId}
          showChannelBadge
          emptyTitle="Belum ada order marketplace yang perlu disiapkan"
          emptyDescription="Catat order manual dari Tokopedia/Shopee via tombol Catat Order. Stok langsung terpotong saat disimpan (asumsi sudah dibayar di marketplace)."
          onReload={() => void load(true)}
        />
      </div>
    </div>
  );
}
