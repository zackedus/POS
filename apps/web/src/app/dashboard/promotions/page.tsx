'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseCurrencyInput } from '@barokah/shared';
import { Button, CurrencyInput } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  LoadingSkeleton,
  PageHeader,
} from '@/components/dashboard/dashboard-ui';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import {
  PROMO_APPLY_LABELS,
  PROMO_TYPE_LABELS,
  createPromotion,
  deletePromotion,
  fetchPromotions,
  updatePromotion,
  type PromoApplyTo,
  type PromoRuleView,
  type PromoType,
} from '@/lib/promotions-api';
import { mapApiError } from '@/lib/api-client';

const emptyForm = {
  name: '',
  type: 'PERCENTAGE' as PromoType,
  value: '10',
  applyTo: 'ALL' as PromoApplyTo,
  isActive: true,
  startsAt: '',
  endsAt: '',
};

function formatPromoScheduleStatus(promo: PromoRuleView): string {
  const now = Date.now();
  if (!promo.isActive) return 'Nonaktif';
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return 'Terjadwal';
  if (promo.endsAt && new Date(promo.endsAt).getTime() < now) return 'Kedaluwarsa';
  return 'Aktif';
}

function formatScheduleRange(promo: PromoRuleView): string {
  if (!promo.startsAt && !promo.endsAt) return 'Tanpa batas';
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  if (promo.startsAt && promo.endsAt) return `${fmt(promo.startsAt)} – ${fmt(promo.endsAt)}`;
  if (promo.startsAt) return `Mulai ${fmt(promo.startsAt)}`;
  return `Sampai ${fmt(promo.endsAt!)}`;
}

export default function PromotionsPage() {
  const { tokens } = useAdminTheme();
  const [promos, setPromos] = useState<PromoRuleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPromos(await fetchPromotions());
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat promo.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(promo: PromoRuleView) {
    setEditId(promo.id);
    setForm({
      name: promo.name,
      type: promo.type,
      value: String(promo.value),
      applyTo: promo.applyTo,
      isActive: promo.isActive,
      startsAt: promo.startsAt ? promo.startsAt.slice(0, 16) : '',
      endsAt: promo.endsAt ? promo.endsAt.slice(0, 16) : '',
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        value:
          form.type === 'FIXED_AMOUNT' ? parseCurrencyInput(form.value) : Number(form.value),
        applyTo: form.applyTo,
        isActive: form.isActive,
        startsAt: form.startsAt.trim() ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt.trim() ? new Date(form.endsAt).toISOString() : undefined,
      };
      if (editId) {
        await updatePromotion(editId, payload);
      } else {
        await createPromotion(payload);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(mapApiError(err, 'Gagal menyimpan promo.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Hapus promo ini?')) return;
    setError(null);
    try {
      await deletePromotion(id);
      await load();
    } catch (err) {
      setError(mapApiError(err, 'Gagal menghapus promo.'));
    }
  }

  return (
    <div style={{ maxWidth: 960, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Promo & Diskon"
        description="Aturan diskon sederhana (MVP). Promo aktif tersedia di kasir. Buy X Get Y (BXGY) coming soon — gunakan diskon persen setara (beli 10 gratis 1 ≈ 9%)."
        actions={
          <Button type="button" onClick={openCreate}>
            + Promo Baru
          </Button>
        }
      />

      {error ? <AlertBanner variant="error" onRetry={() => void load()}>{error}</AlertBanner> : null}

      {loading ? (
        <div style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
          <LoadingSkeleton rows={4} />
        </div>
      ) : (
        <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
          {promos.length === 0 ? (
            <p style={{ margin: 0, color: tokens.muted }}>Belum ada promo. Buat promo pertama untuk kampanye toko.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tokens.cardBorder}`, textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Nama</th>
                    <th style={{ padding: '0.5rem' }}>Tipe</th>
                    <th style={{ padding: '0.5rem' }}>Nilai</th>
                    <th style={{ padding: '0.5rem' }}>Target</th>
                    <th style={{ padding: '0.5rem' }}>Jadwal</th>
                    <th style={{ padding: '0.5rem' }}>Status</th>
                    <th style={{ padding: '0.5rem' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map((promo) => (
                    <tr key={promo.id} style={{ borderBottom: `1px solid ${tokens.cardBorder}` }}>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{promo.name}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>{PROMO_TYPE_LABELS[promo.type]}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        {promo.type === 'PERCENTAGE' ? `${promo.value}%` : `Rp ${promo.value.toLocaleString('id-ID')}`}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>{PROMO_APPLY_LABELS[promo.applyTo]}</td>
                      <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.8125rem', color: tokens.muted }}>
                        {formatScheduleRange(promo)}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: promo.isActive ? '#16a34a' : tokens.muted }}>
                        {formatPromoScheduleStatus(promo)}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <button type="button" onClick={() => openEdit(promo)} style={{ marginRight: 8 }}>
                          Edit
                        </button>
                        <button type="button" onClick={() => void handleDelete(promo.id)}>
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {formOpen ? (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}
        >
          <h3 style={{ margin: '0 0 1rem', color: tokens.text }}>{editId ? 'Edit Promo' : 'Promo Baru'}</h3>
          <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 420 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Nama promo
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={{ padding: '0.5rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Tipe
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PromoType }))}
                style={{ padding: '0.5rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
              >
                <option value="PERCENTAGE">Diskon persentase</option>
                <option value="FIXED_AMOUNT">Potongan nominal</option>
              </select>
            </label>
            {form.type === 'FIXED_AMOUNT' ? (
              <CurrencyInput
                label="Nilai potongan (IDR)"
                value={form.value}
                onChange={(value) => setForm((f) => ({ ...f, value }))}
                placeholder="50.000"
                fullWidth
                required
              />
            ) : (
              <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
                Nilai (%)
                <input
                  required
                  type="number"
                  min={1}
                  max={100}
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  style={{ padding: '0.5rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
                />
              </label>
            )}
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Target
              <select
                value={form.applyTo}
                onChange={(e) => setForm((f) => ({ ...f, applyTo: e.target.value as PromoApplyTo }))}
                style={{ padding: '0.5rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
              >
                <option value="ALL">Semua produk</option>
                <option value="CATEGORY">Per kategori (Fase 4)</option>
                <option value="PRODUCT">Produk tertentu (Fase 4)</option>
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Aktif
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Mulai (opsional)
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                style={{ padding: '0.5rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Berakhir (opsional)
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                style={{ padding: '0.5rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
              />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                Batal
              </Button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}
