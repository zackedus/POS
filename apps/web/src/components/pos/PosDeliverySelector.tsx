'use client';

import { useEffect, useState } from 'react';
import type { CustomerAddressView } from '@barokah/shared';
import { CUSTOMER_ADDRESS_LABELS } from '@barokah/shared';
import { Button, Input } from '@barokah/ui';
import { fetchCustomerAddresses, type CustomerListItem } from '@/lib/customers-api';

export type DeliverySelection =
  | { mode: 'saved'; addressId: string; snapshot: CustomerAddressView }
  | { mode: 'manual'; snapshot: CustomerAddressView };

interface PosDeliverySelectorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  customerId: string | null;
  customerName?: string;
  selection: DeliverySelection | null;
  onSelectionChange: (selection: DeliverySelection | null) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
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

export function PosDeliverySelector({
  enabled,
  onEnabledChange,
  customerId,
  customerName,
  selection,
  onSelectionChange,
  notes,
  onNotesChange,
}: PosDeliverySelectorProps) {
  const [addresses, setAddresses] = useState<CustomerAddressView[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [useManual, setUseManual] = useState(false);
  const [manual, setManual] = useState<CustomerAddressView>(emptyManual);

  useEffect(() => {
    if (!enabled || !customerId) {
      setAddresses([]);
      onSelectionChange(null);
      return;
    }

    let cancelled = false;
    setLoadingAddresses(true);
    void fetchCustomerAddresses(customerId)
      .then((items) => {
        if (cancelled) return;
        setAddresses(items);
        const defaultAddress = items.find((item) => item.isDefault) ?? items[0] ?? null;
        if (defaultAddress && !useManual) {
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
  }, [enabled, customerId]);

  function handleManualField<K extends keyof CustomerAddressView>(key: K, value: CustomerAddressView[K]) {
    const next = { ...manual, [key]: value };
    setManual(next);
    onSelectionChange({ mode: 'manual', snapshot: next });
  }

  return (
    <div
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: 10,
        padding: 12,
        background: enabled ? '#f0f9ff' : '#f8fafc',
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            onEnabledChange(event.target.checked);
            if (!event.target.checked) {
              onSelectionChange(null);
            }
          }}
        />
        Antar ke alamat
      </label>

      {enabled ? (
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {!customerId ? (
            <p style={{ margin: 0, color: '#b45309', fontSize: 13 }}>
              Pilih pelanggan terlebih dahulu untuk pengiriman.
            </p>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                Pelanggan: <strong>{customerName ?? customerId.slice(0, 8)}</strong>
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
                      style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
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
                  >
                    {useManual ? 'Pakai alamat tersimpan' : 'Alamat sekali pakai'}
                  </Button>

                  {useManual ? (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <select
                        value={manual.label}
                        onChange={(event) => handleManualField('label', event.target.value)}
                        style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
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

export type { CustomerListItem };
