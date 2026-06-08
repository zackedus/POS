'use client';

import { useEffect, useState } from 'react';
import type { CustomerAddressView } from '@barokah/shared';
import { CUSTOMER_ADDRESS_LABELS } from '@barokah/shared';
import { Button, Input } from '@barokah/ui';
import { fetchCustomerAddresses } from '@/lib/customers-api';

export type DeliverySelection =
  | { mode: 'saved'; addressId: string; snapshot: CustomerAddressView }
  | { mode: 'manual'; snapshot: CustomerAddressView };

interface PosDeliverySelectorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  customerId: string | null;
  customerName?: string;
  customerPhone?: string;
  isWalkIn?: boolean;
  selection: DeliverySelection | null;
  onSelectionChange: (selection: DeliverySelection | null) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  isOnline?: boolean;
}

const emptyManual = (): CustomerAddressView => ({
  id: 'manual',
  label: 'Proyek',
  addressLine1: '',
  addressLine2: null,
  city: '',
  province: null,
  postalCode: null,
  isDefault: false,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
});

function formatAddressPreview(snapshot: CustomerAddressView): string {
  const parts = [snapshot.addressLine1];
  if (snapshot.addressLine2?.trim()) parts.push(snapshot.addressLine2.trim());
  parts.push(snapshot.city);
  if (snapshot.province?.trim()) parts.push(snapshot.province.trim());
  return parts.join(', ');
}

function toggleStyle(active: boolean) {
  return {
    minHeight: 44,
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'solid' as const,
    borderColor: active ? '#0284c7' : '#e2e8f0',
    background: active ? '#e0f2fe' : '#fff',
    color: active ? '#0369a1' : '#64748b',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.8125rem',
  };
}

export function PosDeliverySelector({
  enabled,
  onEnabledChange,
  customerId,
  customerName,
  customerPhone,
  isWalkIn = false,
  selection,
  onSelectionChange,
  notes,
  onNotesChange,
  isOnline = true,
}: PosDeliverySelectorProps) {
  const [addresses, setAddresses] = useState<CustomerAddressView[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [useManual, setUseManual] = useState(isWalkIn);
  const [manual, setManual] = useState<CustomerAddressView>(emptyManual);

  useEffect(() => {
    if (isWalkIn && enabled && !selection) {
      const nextManual = emptyManual();
      setManual(nextManual);
      onSelectionChange({ mode: 'manual', snapshot: nextManual });
      return;
    }
    if (!enabled || !customerId || isWalkIn) {
      if (!enabled) {
        onSelectionChange(null);
      }
      if (!enabled || isWalkIn) {
        setAddresses([]);
      }
      return;
    }

    let cancelled = false;
    setLoadingAddresses(true);
    void fetchCustomerAddresses(customerId)
      .then((items) => {
        if (cancelled) return;
        setAddresses(items);
        const defaultAddress = items.find((item) => item.isDefault) ?? items[0] ?? null;
        if (defaultAddress && !useManual && !selection) {
          onSelectionChange({ mode: 'saved', addressId: defaultAddress.id, snapshot: defaultAddress });
        }
      })
      .catch(() => {
        if (!cancelled) setAddresses([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAddresses(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init walk-in form once per enable; fetch addresses per customer
  }, [enabled, customerId, isWalkIn]);

  function handleManualField<K extends keyof CustomerAddressView>(key: K, value: CustomerAddressView[K]) {
    const next = { ...manual, [key]: value };
    setManual(next);
    onSelectionChange({ mode: 'manual', snapshot: next });
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }} role="group" aria-label="Tipe pengiriman">
        <button
          type="button"
          aria-pressed={!enabled}
          onClick={() => onEnabledChange(false)}
          style={toggleStyle(!enabled)}
        >
          Ambil di toko
        </button>
        <button
          type="button"
          aria-pressed={enabled}
          disabled={!isOnline}
          title={!isOnline ? 'Pengiriman tidak tersedia saat offline' : undefined}
          onClick={() => onEnabledChange(true)}
          style={{
            ...toggleStyle(enabled),
            opacity: isOnline ? 1 : 0.5,
            cursor: isOnline ? 'pointer' : 'not-allowed',
          }}
        >
          Kirim ke alamat
        </button>
      </div>

      {enabled ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {isWalkIn ? (
            <>
              <p style={{ margin: 0, fontSize: 13, color: '#b45309' }}>
                Pelanggan walk-in — isi alamat pengiriman di bawah.
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                Ke: <strong>{customerName?.trim() || 'Pelanggan'}</strong>
                {customerPhone?.trim() ? ` · ${customerPhone.trim()}` : null}
              </p>
              <div style={{ display: 'grid', gap: 6 }}>
                <Input
                  placeholder="Alamat lengkap (Jl., proyek, lantai)"
                  value={manual.addressLine1}
                  onChange={(event) => handleManualField('addressLine1', event.target.value)}
                  aria-label="Alamat lengkap pengiriman"
                />
                <Input
                  placeholder="Kelurahan / kecamatan"
                  value={manual.addressLine2 ?? ''}
                  onChange={(event) => handleManualField('addressLine2', event.target.value || null)}
                  aria-label="Kelurahan atau kecamatan"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <Input
                    placeholder="Kota"
                    value={manual.city}
                    onChange={(event) => handleManualField('city', event.target.value)}
                    aria-label="Kota pengiriman"
                  />
                  <Input
                    placeholder="Kode pos (opsional)"
                    value={manual.postalCode ?? ''}
                    onChange={(event) => handleManualField('postalCode', event.target.value || null)}
                    aria-label="Kode pos"
                  />
                </div>
              </div>
              {selection && isDeliverySelectionValid(selection) ? (
                <div
                  style={{
                    padding: '0.55rem 0.65rem',
                    borderRadius: 8,
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    fontSize: '0.8125rem',
                    color: '#0c4a6e',
                  }}
                >
                  <strong>Preview alamat:</strong> {formatAddressPreview(selection.snapshot)}
                </div>
              ) : null}
              <Input
                placeholder="Catatan pengiriman (proyek, lantai 2, dll.)"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
              />
            </>
          ) : !customerId ? (
            <p style={{ margin: 0, color: '#b45309', fontSize: 13 }}>
              Pilih pelanggan terlebih dahulu untuk pengiriman.
            </p>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                Ke: <strong>{customerName ?? customerId.slice(0, 8)}</strong>
              </p>

              {loadingAddresses ? (
                <p style={{ margin: 0, fontSize: 13 }}>Memuat alamat…</p>
              ) : (
                <>
                  {addresses.length > 0 && !useManual ? (
                    <select
                      value={selection?.mode === 'saved' ? selection.addressId : ''}
                      onChange={(event) => {
                        const address = addresses.find((item) => item.id === event.target.value);
                        if (address) {
                          onSelectionChange({ mode: 'saved', addressId: address.id, snapshot: address });
                        }
                      }}
                      aria-label="Pilih alamat tersimpan"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        minHeight: 44,
                      }}
                    >
                      {addresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.label} — {address.addressLine1}, {address.city}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const nextManual = emptyManual();
                      setUseManual((prev) => !prev);
                      if (!useManual) {
                        setManual(nextManual);
                        onSelectionChange({ mode: 'manual', snapshot: nextManual });
                      } else if (addresses[0]) {
                        onSelectionChange({
                          mode: 'saved',
                          addressId: addresses[0].id,
                          snapshot: addresses[0],
                        });
                      }
                    }}
                    style={{ minHeight: 44 }}
                  >
                    {useManual ? 'Pakai alamat tersimpan' : 'Alamat sekali pakai'}
                  </Button>

                  {useManual ? (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <select
                        value={manual.label}
                        onChange={(event) => handleManualField('label', event.target.value)}
                        style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #cbd5e1', minHeight: 44 }}
                      >
                        {CUSTOMER_ADDRESS_LABELS.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="Alamat lengkap (Jl., proyek, lantai)"
                        value={manual.addressLine1}
                        onChange={(event) => handleManualField('addressLine1', event.target.value)}
                      />
                      <Input
                        placeholder="Detail tambahan (opsional)"
                        value={manual.addressLine2 ?? ''}
                        onChange={(event) => handleManualField('addressLine2', event.target.value || null)}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <Input
                          placeholder="Kota"
                          value={manual.city}
                          onChange={(event) => handleManualField('city', event.target.value)}
                        />
                        <Input
                          placeholder="Provinsi"
                          value={manual.province ?? ''}
                          onChange={(event) => handleManualField('province', event.target.value || null)}
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              {selection && isDeliverySelectionValid(selection) ? (
                <div
                  style={{
                    padding: '0.55rem 0.65rem',
                    borderRadius: 8,
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    fontSize: '0.8125rem',
                    color: '#0c4a6e',
                  }}
                >
                  <strong>Preview alamat:</strong>{' '}
                  {selection.snapshot.label} — {formatAddressPreview(selection.snapshot)}
                </div>
              ) : null}

              <Input
                placeholder="Catatan pengiriman (proyek, lantai 2, dll.)"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function isDeliverySelectionValid(selection: DeliverySelection | null): boolean {
  if (!selection) return false;
  const { snapshot } = selection;
  return snapshot.addressLine1.trim().length >= 3 && snapshot.city.trim().length >= 2;
}
