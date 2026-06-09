'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR, DEFAULT_PAGE_SIZE, type PaginationMeta } from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  TablePagination,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import {
  createSupplier,
  fetchPurchaseOrders,
  fetchSuppliers,
  formatPoDate,
  PO_STATUS_LABELS,
  poStatusVariant,
  updateSupplier,
  type PurchaseOrderSummary,
  type SupplierRow,
} from '@/lib/suppliers-api';
import { mapApiError } from '@/lib/api-client';

export default function PurchaseOrdersPage() {
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [orders, setOrders] = useState<PurchaseOrderSummary[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supplierRows = await fetchSuppliers();
      setSuppliers(supplierRows);
      if (!needsOutletPick) {
        const result = await fetchPurchaseOrders({
          outletId: selectedOutletId ?? undefined,
          page,
          limit: pageSize,
        });
        setOrders(result.items);
        setMeta(result.meta);
      } else {
        setOrders([]);
        setMeta({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat data order distributor.'));
    } finally {
      setLoading(false);
    }
  }, [needsOutletPick, selectedOutletId, page, pageSize]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreateSupplier(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await createSupplier({
        name: supplierForm.name,
        phone: supplierForm.phone || undefined,
        email: supplierForm.email || undefined,
      });
      setSuccess('Supplier berhasil ditambahkan.');
      setSupplierForm({ name: '', phone: '', email: '' });
      await loadData();
    } catch (err) {
      setError(mapApiError(err, 'Gagal menambah supplier.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivateSupplier(supplier: SupplierRow) {
    const action = supplier.isActive ? 'nonaktifkan' : 'aktifkan kembali';
    if (!window.confirm(`${action.charAt(0).toUpperCase()}${action.slice(1)} supplier "${supplier.name}"?`)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateSupplier(supplier.id, { isActive: !supplier.isActive });
      setSuccess(`Supplier "${supplier.name}" berhasil diperbarui.`);
      await loadData();
    } catch (err) {
      setError(mapApiError(err, 'Gagal mengubah status supplier.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Order Distributor"
        description="Buat order ke supplier, cetak PO, dan terima barang saat pengiriman tiba — stok & HPP diperbarui otomatis."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button type="button" variant="secondary" onClick={() => void loadData()} disabled={loading}>
              Muat ulang
            </Button>
            <Link href="/dashboard/purchase-orders/new">
              <Button type="button" variant="primary" disabled={needsOutletPick}>
                Buat Order Distributor
              </Button>
            </Link>
          </div>
        }
      />

      {needsOutletPick ? (
        <AlertBanner variant="warning">Pilih cabang di header sebelum membuat atau menerima order.</AlertBanner>
      ) : null}
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      <ListFilterBar
        selects={[
          ...(multiOutlet
            ? [
                {
                  id: 'outlet',
                  label: 'Cabang',
                  value: draftFilters.outletId,
                  options: [
                    { value: '', label: 'Semua cabang' },
                    ...outlets.map((outlet) => ({ value: outlet.id, label: outlet.label })),
                  ],
                  onChange: (value: string) => setDraftFilters((prev) => ({ ...prev, outletId: value })),
                  minWidth: 200,
                },
              ]
            : []),
          {
            id: 'status',
            label: 'Status PO',
            value: draftFilters.status,
            options: [
              { value: '', label: 'Semua status' },
              ...(Object.entries(PO_STATUS_LABELS) as Array<[PurchaseOrderStatus, string]>).map(
                ([value, label]) => ({ value, label }),
              ),
            ],
            onChange: (value) => setDraftFilters((prev) => ({ ...prev, status: value })),
          },
          {
            id: 'supplier',
            label: 'Supplier',
            value: draftFilters.supplierId,
            options: [
              { value: '', label: 'Semua supplier' },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ],
            onChange: (value) => setDraftFilters((prev) => ({ ...prev, supplierId: value })),
            minWidth: 200,
          },
        ]}
        dateFrom={draftFilters.dateFrom}
        dateTo={draftFilters.dateTo}
        onDateFromChange={(value) => setDraftFilters((prev) => ({ ...prev, dateFrom: value }))}
        onDateToChange={(value) => setDraftFilters((prev) => ({ ...prev, dateTo: value }))}
        search={draftFilters.search}
        searchPlaceholder="Cari no. order…"
        onSearchChange={(value) => setDraftFilters((prev) => ({ ...prev, search: value }))}
        onApply={applyFilters}
        onReset={resetFilters}
        activeChips={activeChips}
      />

      <section style={cardStyle()}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Daftar Order Distributor</h3>
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Belum ada order distributor"
            description={
              activeChips.length > 0
                ? FILTER_EMPTY_DESCRIPTION
                : 'Buat order Senin, cetak untuk supplier, lalu terima barang saat tiba (mis. Rabu).'
            }
            actionHref="/dashboard/purchase-orders/new"
            actionLabel="Buat Order Distributor"
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyles.table}>
              <thead>
                <tr style={tableStyles.headRow}>
                  <th style={tableStyles.th}>No. Order</th>
                  <th style={tableStyles.th}>Supplier</th>
                  <th style={tableStyles.th}>Status</th>
                  <th style={tableStyles.th}>Tgl Order</th>
                  <th style={tableStyles.th}>Est. Tiba</th>
                  <th style={tableStyles.th}>Diterima</th>
                  <th style={tableStyles.th}>Total</th>
                  <th style={tableStyles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={tableStyles.row}>
                    <td style={tableStyles.td}>
                      <Link href={`/dashboard/purchase-orders/${order.id}`} style={{ color: '#16a34a', fontWeight: 600 }}>
                        {order.orderNo}
                      </Link>
                    </td>
                    <td style={tableStyles.td}>{order.supplierName}</td>
                    <td style={tableStyles.td}>
                      <StatusBadge
                        variant={poStatusVariant(order.status)}
                        label={PO_STATUS_LABELS[order.status]}
                      />
                    </td>
                    <td style={tableStyles.td}>{formatPoDate(order.orderedAt ?? order.createdAt)}</td>
                    <td style={tableStyles.td}>{formatPoDate(order.expectedDeliveryAt)}</td>
                    <td style={tableStyles.td}>{formatPoDate(order.receivedAt)}</td>
                    <td style={tableStyles.td}>{formatCurrencyIDR(order.subtotal)}</td>
                    <td style={tableStyles.td}>
                      <Link href={`/dashboard/purchase-orders/${order.id}`}>
                        <Button type="button" variant="secondary">
                          Detail
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              page={meta.page}
              totalPages={meta.totalPages ?? 1}
              totalItems={meta.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
            />
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <section style={cardStyle()}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Daftar Supplier</h3>
          {suppliers.length === 0 ? (
            <EmptyState title="Belum ada supplier" description="Tambahkan supplier di form di samping." />
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
              {suppliers.map((s) => (
                <li
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <strong>{s.name}</strong>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      {s.phone ?? '—'}
                      {s.email ? ` · ${s.email}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <StatusBadge variant={s.isActive ? 'success' : 'neutral'} label={s.isActive ? 'Aktif' : 'Nonaktif'} />
                    <Button type="button" variant="ghost" disabled={saving} onClick={() => void handleDeactivateSupplier(s)}>
                      {s.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={cardStyle()}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Tambah Supplier</h3>
          <form onSubmit={(e) => void handleCreateSupplier(e)} style={{ display: 'grid', gap: '0.75rem' }}>
            <input
              required
              placeholder="Nama supplier"
              value={supplierForm.name}
              onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <input
              placeholder="Telepon (opsional)"
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <input
              type="email"
              placeholder="Email (opsional)"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Button type="submit" variant="primary" disabled={saving}>
              Simpan Supplier
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
