'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  buildUnitConversionsFromMultiUnit,
  parseMultiUnitConfig,
  type MultiUnitFormConfig,
} from '@barokah/shared';
import { Button, QuantityInput } from '@barokah/ui';
import { apiConfig } from '@/lib/api';
import { authFetch } from '@/lib/auth';
import { UnitConversionPreview } from './UnitConversionPreview';

interface UnitOption {
  id: string;
  name: string;
  symbol: string;
}

interface ProductUnitTarget {
  id: string;
  sku: string;
  name: string;
  unitId?: string;
  unit?: UnitOption | null;
  baseUnit?: UnitOption | null;
  moq?: number;
  orderStep?: number;
  purchaseUnit?: {
    id: string;
    name: string;
    symbol: string;
    conversionToBase: number;
  };
  sellUnits?: Array<{
    id: string;
    name: string;
    symbol: string;
    conversionToBase?: number;
    conversionQty?: number;
    price?: number;
    sellStep?: number;
    minQty?: number;
  }>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const cardStyle = {
  marginTop: '0.75rem',
  padding: '0.875rem',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
} as const;

export function ProductUnitConversionPanel({
  product,
  units,
  onSaved,
}: {
  product: ProductUnitTarget;
  units: UnitOption[];
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [moq, setMoq] = useState(String(product.moq ?? 1));
  const [orderStep, setOrderStep] = useState(String(product.orderStep ?? 1));

  const baseUnit = product.baseUnit ?? product.unit;
  const initialConversions = product.purchaseUnit
    ? [
        {
          unitId: product.purchaseUnit.id,
          conversionToBase: product.purchaseUnit.conversionToBase,
          isPurchaseUnit: true,
          isSellUnit: !!product.sellUnits?.some((u) => u.id === product.purchaseUnit!.id),
        },
      ]
    : [];
  const [config, setConfig] = useState<MultiUnitFormConfig>(() =>
    parseMultiUnitConfig(initialConversions),
  );

  useEffect(() => {
    setMoq(String(product.moq ?? 1));
    setOrderStep(String(product.orderStep ?? 1));
    const conversions = product.purchaseUnit
      ? [
          {
            unitId: product.purchaseUnit.id,
            conversionToBase: product.purchaseUnit.conversionToBase,
            isPurchaseUnit: true,
            isSellUnit: !!product.sellUnits?.some((u) => u.id === product.purchaseUnit!.id),
          },
        ]
      : [];
    setConfig(parseMultiUnitConfig(conversions));
  }, [product.id, product.moq, product.orderStep, product.purchaseUnit, product.sellUnits]);

  const purchaseUnit = config.purchaseUnitId
    ? units.find((u) => u.id === config.purchaseUnitId)
    : undefined;

  async function handleSaveAll(e: FormEvent) {
    e.preventDefault();
    if (!config.purchaseUnitId || config.purchaseConversionToBase <= 0) {
      setError('Satuan beli ke supplier dan konversi wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const patchRes = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moq: Number(moq),
          orderStep: Number(orderStep),
        }),
      });
      const patchJson = (await patchRes.json()) as ApiEnvelope<unknown>;
      if (!patchRes.ok || !patchJson.success) {
        throw new Error(patchJson.error?.message ?? 'Gagal menyimpan pengaturan jual ecer.');
      }

      const row = buildUnitConversionsFromMultiUnit(config)[0];
      const convRes = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/products/unit-conversions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          sellUnitId: row.unitId,
          conversionToBase: row.conversionToBase,
          isPurchaseUnit: row.isPurchaseUnit,
          isSellUnit: row.isSellUnit,
          sellStep: row.isSellUnit ? 1 : undefined,
          minQty: row.isSellUnit ? 1 : undefined,
        }),
      });
      const convJson = (await convRes.json()) as ApiEnvelope<unknown>;
      if (!convRes.ok || !convJson.success) {
        throw new Error(convJson.error?.message ?? 'Gagal menyimpan satuan beli/jual.');
      }

      setSuccess('Satuan beli & jual berhasil disimpan.');
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>Satuan Beli &amp; Jual</h3>
      <p style={{ margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.85rem' }}>
        Stok dihitung dalam satuan dasar
        {baseUnit ? ` (${baseUnit.name} / ${baseUnit.symbol})` : ''}.
        Contoh paku: beli per dus, jual per kg atau dus.
      </p>

      {error ? (
        <p style={{ color: '#b91c1c', fontSize: '0.85rem' }}>{error}</p>
      ) : null}
      {success ? (
        <p style={{ color: '#15803d', fontSize: '0.85rem' }}>{success}</p>
      ) : null}

      <form onSubmit={handleSaveAll} style={{ display: 'grid', gap: '0.75rem' }}>
        <fieldset
          style={{
            margin: 0,
            padding: '0.65rem',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <legend style={{ fontSize: '0.85rem', fontWeight: 600 }}>Satuan beli ke supplier</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.85rem' }}>
              Satuan beli
              <select
                value={config.purchaseUnitId}
                onChange={(e) => setConfig((prev) => ({ ...prev, purchaseUnitId: e.target.value }))}
                disabled={saving}
                style={{ padding: '0.65rem', borderRadius: 8, border: '1px solid #cbd5e1' }}
              >
                <option value="">Pilih satuan</option>
                {units.filter((u) => u.id !== baseUnit?.id).map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.symbol})
                  </option>
                ))}
              </select>
            </label>
            <QuantityInput
              label={`1 ${purchaseUnit?.symbol ?? '…'} = … ${baseUnit?.symbol ?? 'stok'}`}
              value={String(config.purchaseConversionToBase)}
              onChange={(v) =>
                setConfig((prev) => ({ ...prev, purchaseConversionToBase: Number(v) || 0 }))
              }
              disabled={saving}
              fullWidth
            />
          </div>
          {purchaseUnit && config.purchaseConversionToBase > 0 && baseUnit ? (
            <UnitConversionPreview
              purchaseQty={1}
              purchaseSymbol={purchaseUnit.symbol}
              conversionToBase={config.purchaseConversionToBase}
              baseSymbol={baseUnit.symbol}
            />
          ) : null}
        </fieldset>

        <fieldset
          style={{
            margin: 0,
            padding: '0.65rem',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <legend style={{ fontSize: '0.85rem', fontWeight: 600 }}>Satuan jual ke pelanggan</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <QuantityInput
              label={`Min. jual ecer (${baseUnit?.symbol ?? 'stok'})`}
              value={moq}
              onChange={setMoq}
              disabled={saving}
              fullWidth
            />
            <QuantityInput
              label={`Kelipatan ecer (${baseUnit?.symbol ?? 'stok'})`}
              value={orderStep}
              onChange={setOrderStep}
              disabled={saving}
              fullWidth
            />
          </div>
          {purchaseUnit ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={config.sellInPurchaseUnit}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, sellInPurchaseUnit: e.target.checked }))
                }
                disabled={saving}
              />
              Juga jual per {purchaseUnit.symbol}
            </label>
          ) : null}
        </fieldset>

        {product.sellUnits && product.sellUnits.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', color: '#334155' }}>
            {product.sellUnits.map((unit) => (
              <li key={unit.id}>
                Kasir: jual {unit.name} ({unit.symbol})
                {unit.conversionToBase ? ` — 1 ${unit.symbol} = ${unit.conversionToBase} ${baseUnit?.symbol}` : ''}
              </li>
            ))}
          </ul>
        ) : null}

        <Button type="submit" disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan satuan beli & jual'}
        </Button>
      </form>
    </div>
  );
}
