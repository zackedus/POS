'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { formatNumberID } from '@barokah/shared';
import { Button, QuantityInput } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  TablePagination,
  tableStyles,
  useClientPagination,
} from '@/components/dashboard/dashboard-ui';
import { authFetch } from '@/lib/auth';
import { apiConfig } from '@/lib/api';
import {
  STOCK_ADJUST_REASON_OPTIONS,
  adjustStock,
  fetchInventory,
  fetchStockMovements,
  opnameStock,
  transferStock,
  updateMinStock,
  type InventoryRow,
  type StockAdjustReason,
  type StockMovementRow,
} from '@/lib/inventory-api';
import { mapApiError } from '@/lib/api-client';
import { lookupProductByCode } from '@/lib/catalog-api';
import { useOutletSelection } from '@/lib/outlet-selection-state';

type InventoryTab = 'stok' | 'riwayat' | 'opname' | 'transfer';

interface CategoryOption {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const { outlets, selectedOutletId, needsOutletPick } = useOutletSelection();
  const [tab, setTab] = useState<InventoryTab>('stok');
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustDirection, setAdjustDirection] = useState<'IN' | 'OUT'>('IN');
  const [adjustReason, setAdjustReason] = useState<StockAdjustReason>('OTHER');
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [opnameProductId, setOpnameProductId] = useState('');
  const [opnameActualQty, setOpnameActualQty] = useState('');
  const [opnameNotes, setOpnameNotes] = useState('');
  const [opnameScanCode, setOpnameScanCode] = useState('');
  const [opnameScanError, setOpnameScanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adjustQtyWarning, setAdjustQtyWarning] = useState<string | null>(null);
  const [transferToOutletId, setTransferToOutletId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQty, setTransferQty] = useState('1');
  const [transferNotes, setTransferNotes] = useState('');

  const selectedTransferRow = items.find((row) => row.productId === transferProductId);
  const transferUnitLabel = selectedTransferRow?.unitSymbol ?? 'satuan dasar';
  const destinationOutlets = outlets.filter((o) => o.id !== selectedOutletId);
  const selectedAdjustRow = items.find((row) => row.productId === adjustProductId);
  const selectedOpnameRow = items.find((row) => row.productId === opnameProductId);
  const adjustUnitLabel = selectedAdjustRow?.unitSymbol ?? 'satuan dasar';

  const reasonOptions = useMemo(
    () =>
      STOCK_ADJUST_REASON_OPTIONS.filter(
        (opt) => opt.direction === adjustDirection || opt.direction === 'BOTH',
      ),
    [adjustDirection],
  );

  const { page, totalPages, pageItems, setPage, totalItems, pageSize } = useClientPagination(items, 12);
  const movementsPagination = useClientPagination(movements, 15);

  const loadCategories = useCallback(async () => {
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/categories`);
      const json = (await res.json()) as { success: boolean; data?: CategoryOption[] };
      if (res.ok && json.success && json.data) {
        setCategories(json.data);
      }
    } catch {
      // non-blocking
    }
  }, []);

  const loadInventory = useCallback(async () => {
    if (needsOutletPick) {
      setLoading(false);
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchInventory({
        outletId: selectedOutletId ?? undefined,
        lowStockOnly,
        categoryId: categoryId || undefined,
        search: search || undefined,
      });
      setItems(data.items);
      setLowStockCount(data.lowStockCount);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat stok.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [needsOutletPick, selectedOutletId, lowStockOnly, categoryId, search]);

  const loadMovements = useCallback(async () => {
    if (needsOutletPick) {
      setMovements([]);
      return;
    }

    setMovementsLoading(true);
    setError(null);
    try {
      const data = await fetchStockMovements({
        outletId: selectedOutletId ?? undefined,
        limit: 100,
      });
      setMovements(data.movements);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat riwayat stok.'));
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  }, [needsOutletPick, selectedOutletId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setPage(1);
  }, [lowStockOnly, selectedOutletId, categoryId, search, setPage]);

  useEffect(() => {
    if (tab === 'stok' || tab === 'opname' || tab === 'transfer') {
      void loadInventory();
    }
    if (tab === 'riwayat') {
      void loadMovements();
    }
  }, [tab, loadInventory, loadMovements]);

  useEffect(() => {
    if (!reasonOptions.some((opt) => opt.value === adjustReason)) {
      setAdjustReason(reasonOptions[0]?.value ?? 'OTHER');
    }
  }, [adjustDirection, adjustReason, reasonOptions]);

  async function handleAdjust(e: FormEvent) {
    e.preventDefault();
    if (!adjustProductId) return;

    const qty = Number(adjustQty);
    if (qty <= 0) {
      setError('Jumlah penyesuaian harus lebih dari 0.');
      return;
    }

    if (adjustDirection === 'OUT' && selectedAdjustRow && qty > selectedAdjustRow.quantity) {
      setError(
        `Stok tidak cukup. Tersedia ${formatNumberID(selectedAdjustRow.quantity)} ${adjustUnitLabel}, diminta ${formatNumberID(qty)} ${adjustUnitLabel}.`,
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adjustStock({
        outletId: selectedOutletId ?? undefined,
        productId: adjustProductId,
        direction: adjustDirection,
        quantity: qty,
        reason: adjustReason,
        notes: adjustNotes.trim() || undefined,
      });
      setSuccess('Stok berhasil disesuaikan.');
      setAdjustNotes('');
      await loadInventory();
      if (tab === 'riwayat') await loadMovements();
    } catch (err) {
      setError(mapApiError(err, 'Gagal menyesuaikan stok.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleOpnameScan() {
    const code = opnameScanCode.trim();
    if (!code) return;
    setOpnameScanError(null);
    try {
      const product = await lookupProductByCode(code);
      const row = items.find((item) => item.productId === product.id);
      if (!row) {
        setOpnameScanError('Produk ditemukan di katalog tetapi tidak ada di stok outlet ini.');
        return;
      }
      setOpnameProductId(product.id);
      setOpnameActualQty(String(row.quantity));
      setOpnameScanCode('');
    } catch (err) {
      setOpnameScanError(mapApiError(err, 'SKU/barcode tidak ditemukan.'));
    }
  }

  async function handleOpname(e: FormEvent) {
    e.preventDefault();
    if (!opnameProductId) return;

    const actualQuantity = Number(opnameActualQty);
    if (Number.isNaN(actualQuantity) || actualQuantity < 0) {
      setError('Qty fisik harus angka ≥ 0.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await opnameStock({
        outletId: selectedOutletId ?? undefined,
        productId: opnameProductId,
        actualQuantity,
        notes: opnameNotes.trim() || undefined,
      });
      setSuccess(
        result.changed
          ? 'Opname berhasil — stok disesuaikan ke qty fisik.'
          : 'Qty fisik sama dengan sistem — tidak ada perubahan.',
      );
      setOpnameNotes('');
      await loadInventory();
      if (tab === 'riwayat') await loadMovements();
    } catch (err) {
      setError(mapApiError(err, 'Gagal menyimpan opname.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleTransfer(e: FormEvent) {
    e.preventDefault();
    if (!transferToOutletId || !transferProductId) return;

    const qty = Number(transferQty);
    if (qty <= 0) {
      setError('Jumlah transfer harus lebih dari 0.');
      return;
    }

    if (selectedTransferRow && qty > selectedTransferRow.quantity) {
      setError(
        `Stok tidak cukup. Tersedia ${formatNumberID(selectedTransferRow.quantity)} ${transferUnitLabel}, diminta ${formatNumberID(qty)} ${transferUnitLabel}.`,
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await transferStock({
        fromOutletId: selectedOutletId ?? undefined,
        toOutletId: transferToOutletId,
        productId: transferProductId,
        quantity: qty,
        notes: transferNotes.trim() || undefined,
      });
      setSuccess(
        `Transfer berhasil — ${result.productName} (${result.sku}): ${formatNumberID(result.quantity)} ${transferUnitLabel} ke cabang tujuan.`,
      );
      setTransferNotes('');
      setTransferQty('1');
      await loadInventory();
      if (tab === 'riwayat') await loadMovements();
    } catch (err) {
      setError(mapApiError(err, 'Gagal transfer stok.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleMinStockChange(row: InventoryRow, value: string) {
    const minStock = Number(value);
    if (Number.isNaN(minStock) || minStock < 0) return;

    setError(null);
    try {
      await updateMinStock(row.id, minStock);
      await loadInventory();
    } catch (err) {
      setError(mapApiError(err, 'Gagal memperbarui stok minimum.'));
    }
  }

  const tabButtonStyle = (active: boolean) => ({
    padding: '0.5rem 1rem',
    borderRadius: 8,
    border: `1px solid ${active ? '#2563eb' : '#e2e8f0'}`,
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#1d4ed8' : '#475569',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer' as const,
    fontSize: '0.875rem',
  });

  return (
    <div style={{ maxWidth: 1100, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Manajemen Stok"
        description="Pantau stok per cabang, opname, penyesuaian masuk/keluar, dan riwayat pergerakan."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (tab === 'riwayat') void loadMovements();
              else void loadInventory();
            }}
            disabled={loading || movementsLoading}
          >
            {loading || movementsLoading ? 'Memuat…' : 'Muat ulang'}
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" style={tabButtonStyle(tab === 'stok')} onClick={() => setTab('stok')}>
          Daftar Stok
        </button>
        <button type="button" style={tabButtonStyle(tab === 'opname')} onClick={() => setTab('opname')}>
          Opname
        </button>
        <button type="button" style={tabButtonStyle(tab === 'transfer')} onClick={() => setTab('transfer')}>
          Transfer Cabang
        </button>
        <button type="button" style={tabButtonStyle(tab === 'riwayat')} onClick={() => setTab('riwayat')}>
          Riwayat Mutasi
        </button>
      </div>

      {needsOutletPick ? (
        <AlertBanner variant="warning">Pilih cabang di header sebelum melihat stok.</AlertBanner>
      ) : null}
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {!needsOutletPick && tab === 'stok' && lowStockCount > 0 ? (
        <AlertBanner variant="warning">
          <strong>{lowStockCount} produk</strong> berstatus stok rendah. Segera lakukan restock atau terima barang dari
          supplier.
        </AlertBanner>
      ) : null}

      {tab === 'stok' ? (
        <section style={cardStyle()}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
            <StatusBadge label={`Stok rendah: ${lowStockCount}`} variant={lowStockCount > 0 ? 'warning' : 'success'} />
            <input
              type="search"
              placeholder="Cari SKU / nama…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 180 }}
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
            >
              <option value="">Semua kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
              Stok rendah saja
            </label>
          </div>

          {loading ? (
            <LoadingSkeleton rows={6} />
          ) : items.length === 0 ? (
            <EmptyState
              title="Tidak ada data stok"
              description={
                lowStockOnly
                  ? 'Semua stok aman — tidak ada produk di bawah minimum.'
                  : 'Belum ada inventori untuk outlet ini. Terima barang dari supplier atau sesuaikan stok manual.'
              }
              actionHref="/dashboard/purchase-orders"
              actionLabel="Order Distributor"
            />
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyles.table}>
                  <thead>
                    <tr style={tableStyles.headRow}>
                      <th style={tableStyles.th}>SKU</th>
                      <th style={tableStyles.th}>Produk / Varian</th>
                      <th style={tableStyles.th}>Stok (satuan dasar)</th>
                      <th style={tableStyles.th}>Min</th>
                      <th style={tableStyles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((row) => (
                      <tr
                        key={row.id}
                        style={{
                          ...tableStyles.row,
                          background: row.isLowStock ? '#fffbeb' : undefined,
                        }}
                      >
                        <td style={tableStyles.td}>{row.sku}</td>
                        <td style={tableStyles.td}>
                          {row.displayName}
                          {row.categoryName ? (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                              {row.categoryName}
                            </span>
                          ) : null}
                        </td>
                        <td style={{ ...tableStyles.td, fontVariantNumeric: 'tabular-nums', fontWeight: row.isLowStock ? 600 : 400 }}>
                          {formatNumberID(row.quantity)} {row.unitSymbol ?? ''}
                          {row.purchaseEquivalent ? (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                              ≈ {formatNumberID(row.purchaseEquivalent.quantity, 2)} {row.purchaseEquivalent.unitSymbol}
                            </span>
                          ) : null}
                        </td>
                        <td style={tableStyles.td}>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            defaultValue={row.minStock}
                            onBlur={(e) => void handleMinStockChange(row, e.target.value)}
                            style={{ width: 80, padding: '0.25rem 0.4rem', borderRadius: 6, border: '1px solid #e2e8f0' }}
                            aria-label={`Stok minimum ${row.productName}`}
                          />
                        </td>
                        <td style={tableStyles.td}>
                          <StatusBadge
                            label={row.isLowStock ? 'Stok rendah' : 'Aman'}
                            variant={row.isLowStock ? 'error' : 'success'}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
            </>
          )}
        </section>
      ) : null}

      {tab === 'stok' ? (
        <section style={cardStyle()}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Penyesuaian Stok Manual</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#64748b' }}>
            Semua qty dalam <strong>satuan dasar</strong> produk (contoh: kg, sak, liter). Untuk multi-satuan, konversi
            otomatis ditampilkan di daftar stok.
          </p>
          <form onSubmit={(e) => void handleAdjust(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 520 }}>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Produk
              <select
                value={adjustProductId}
                onChange={(e) => setAdjustProductId(e.target.value)}
                required
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
              >
                <option value="">Pilih produk…</option>
                {items.map((row) => (
                  <option key={row.productId} value={row.productId}>
                    {row.sku} — {row.displayName}
                    {row.unitSymbol ? ` (${row.unitSymbol})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                Arah
                <select
                  value={adjustDirection}
                  onChange={(e) => setAdjustDirection(e.target.value as 'IN' | 'OUT')}
                  style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                >
                  <option value="IN">Masuk (+)</option>
                  <option value="OUT">Keluar (-)</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem', minWidth: 200 }}>
                Alasan
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value as StockAdjustReason)}
                  style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                >
                  {reasonOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <QuantityInput
                label={`Jumlah (${adjustUnitLabel})`}
                value={adjustQty}
                onChange={(value) => {
                  setAdjustQty(value);
                  const qty = Number(value);
                  if (adjustDirection === 'OUT' && selectedAdjustRow && qty > selectedAdjustRow.quantity) {
                    setAdjustQtyWarning(
                      `Melebihi stok tersedia (${formatNumberID(selectedAdjustRow.quantity)} ${adjustUnitLabel})`,
                    );
                  } else {
                    setAdjustQtyWarning(null);
                  }
                }}
                placeholder="0,5"
                error={adjustQtyWarning ?? undefined}
                style={{ width: 160, padding: '0.5rem' }}
              />
            </div>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Catatan (opsional)
              <input
                type="text"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                maxLength={500}
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </label>
            <Button type="submit" variant="primary" disabled={saving || needsOutletPick}>
              {saving ? 'Menyimpan…' : 'Simpan Penyesuaian'}
            </Button>
          </form>
        </section>
      ) : null}

      {tab === 'opname' ? (
        <section style={cardStyle()}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>Opname / Stocktake</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#64748b' }}>
            Hitung fisik barang di gudang, lalu masukkan qty aktual. Sistem otomatis menyesuaikan selisih (tipe mutasi:
            Opname).
          </p>
          <form onSubmit={(e) => void handleOpname(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 520 }}>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Scan barcode / ketik SKU
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="search"
                  value={opnameScanCode}
                  onChange={(e) => setOpnameScanCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleOpnameScan();
                    }
                  }}
                  placeholder="Scan atau ketik SKU/barcode…"
                  autoFocus
                  style={{
                    flex: '1 1 200px',
                    minHeight: 44,
                    padding: '0.5rem 0.75rem',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                />
                <Button type="button" variant="secondary" onClick={() => void handleOpnameScan()}>
                  Cari
                </Button>
              </div>
              {opnameScanError ? (
                <span style={{ color: '#b91c1c', fontSize: '0.8125rem' }}>{opnameScanError}</span>
              ) : null}
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Produk
              <select
                value={opnameProductId}
                onChange={(e) => {
                  setOpnameProductId(e.target.value);
                  const row = items.find((item) => item.productId === e.target.value);
                  if (row) setOpnameActualQty(String(row.quantity));
                }}
                required
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
              >
                <option value="">Pilih produk…</option>
                {items.map((row) => (
                  <option key={row.productId} value={row.productId}>
                    {row.sku} — {row.displayName} (sistem: {formatNumberID(row.quantity)} {row.unitSymbol ?? ''})
                  </option>
                ))}
              </select>
            </label>
            {selectedOpnameRow ? (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                Stok sistem saat ini:{' '}
                <strong>
                  {formatNumberID(selectedOpnameRow.quantity)} {selectedOpnameRow.unitSymbol ?? 'satuan dasar'}
                </strong>
              </p>
            ) : null}
            <QuantityInput
              label={`Qty fisik (${selectedOpnameRow?.unitSymbol ?? 'satuan dasar'})`}
              value={opnameActualQty}
              onChange={setOpnameActualQty}
              placeholder="0"
              style={{ maxWidth: '100%', padding: '0.65rem', minHeight: 44, fontSize: '1rem' }}
            />
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Catatan opname (opsional)
              <input
                type="text"
                value={opnameNotes}
                onChange={(e) => setOpnameNotes(e.target.value)}
                maxLength={500}
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </label>
            <Button type="submit" variant="primary" disabled={saving || needsOutletPick || loading}>
              {saving ? 'Menyimpan…' : 'Simpan Opname'}
            </Button>
          </form>
        </section>
      ) : null}

      {tab === 'transfer' ? (
        <section style={cardStyle()}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>Transfer Stok Antar Cabang</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#64748b' }}>
            Pindahkan stok dari cabang aktif ({outlets.find((o) => o.id === selectedOutletId)?.label ?? '—'}) ke cabang
            lain. Mutasi tercatat sebagai TRANSFER_OUT / TRANSFER_IN.
          </p>
          {destinationOutlets.length === 0 ? (
            <EmptyState
              title="Butuh minimal 2 cabang"
              description="Tambah cabang baru di Pengaturan Cabang agar transfer antar outlet dapat dilakukan."
              actionHref="/dashboard/outlets"
              actionLabel="Kelola Cabang"
            />
          ) : (
            <form onSubmit={(e) => void handleTransfer(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 520 }}>
              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                Cabang tujuan
                <select
                  value={transferToOutletId}
                  onChange={(e) => setTransferToOutletId(e.target.value)}
                  required
                  style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                >
                  <option value="">Pilih cabang tujuan…</option>
                  {destinationOutlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                Produk
                <select
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  required
                  style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                >
                  <option value="">Pilih produk…</option>
                  {items.map((row) => (
                    <option key={row.productId} value={row.productId}>
                      {row.sku} — {row.displayName} (stok: {formatNumberID(row.quantity)} {row.unitSymbol ?? ''})
                    </option>
                  ))}
                </select>
              </label>
              <QuantityInput
                label={`Jumlah transfer (${transferUnitLabel})`}
                value={transferQty}
                onChange={setTransferQty}
                placeholder="1"
                style={{ maxWidth: 200, padding: '0.5rem' }}
              />
              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                Catatan (opsional)
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  maxLength={500}
                  placeholder="Contoh: Kirim stok ke cabang Utara"
                  style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
              </label>
              <Button type="submit" variant="primary" disabled={saving || needsOutletPick || loading}>
                {saving ? 'Memproses…' : 'Transfer Stok'}
              </Button>
            </form>
          )}
        </section>
      ) : null}

      {tab === 'riwayat' ? (
        <section style={cardStyle()}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Riwayat Pergerakan Stok</h3>
          {movementsLoading ? (
            <LoadingSkeleton rows={8} />
          ) : movements.length === 0 ? (
            <EmptyState title="Belum ada mutasi" description="Riwayat penjualan, PO, opname, dan penyesuaian akan muncul di sini." />
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyles.table}>
                  <thead>
                    <tr style={tableStyles.headRow}>
                      <th style={tableStyles.th}>Waktu</th>
                      <th style={tableStyles.th}>Produk</th>
                      <th style={tableStyles.th}>Tipe</th>
                      <th style={tableStyles.th}>Δ Qty</th>
                      <th style={tableStyles.th}>Sebelum → Sesudah</th>
                      <th style={tableStyles.th}>Oleh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementsPagination.pageItems.map((row) => (
                      <tr key={row.id} style={tableStyles.row}>
                        <td style={{ ...tableStyles.td, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                          {new Date(row.createdAt).toLocaleString('id-ID')}
                        </td>
                        <td style={tableStyles.td}>
                          {row.displayName}
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>{row.sku}</span>
                        </td>
                        <td style={tableStyles.td}>{row.typeLabel}</td>
                        <td
                          style={{
                            ...tableStyles.td,
                            fontVariantNumeric: 'tabular-nums',
                            color: row.quantity >= 0 ? '#166534' : '#b91c1c',
                            fontWeight: 600,
                          }}
                        >
                          {row.quantity >= 0 ? '+' : ''}
                          {formatNumberID(row.quantity)} {row.unitSymbol ?? ''}
                        </td>
                        <td style={{ ...tableStyles.td, fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem' }}>
                          {formatNumberID(row.quantityBefore)} → {formatNumberID(row.quantityAfter)}
                        </td>
                        <td style={{ ...tableStyles.td, fontSize: '0.8125rem' }}>{row.createdByName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={movementsPagination.page}
                totalPages={movementsPagination.totalPages}
                totalItems={movementsPagination.totalItems}
                pageSize={movementsPagination.pageSize}
                onPageChange={movementsPagination.setPage}
              />
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
