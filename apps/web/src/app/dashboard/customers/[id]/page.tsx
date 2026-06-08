'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CUSTOMER_ADDRESS_LABELS,
  formatCurrencyIDR,
  parseCurrencyInput,
} from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  LoadingSkeleton,
  PageHeader,
} from '@/components/dashboard/dashboard-ui';
import { MemberCard } from '@/components/dashboard/MemberCard';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { fetchMe, type AuthUser } from '@/lib/auth';
import { mapApiError } from '@/lib/api-client';
import {
  createCustomerAddress,
  deleteCustomerAddress,
  fetchCustomerAddresses,
  fetchCustomerDetail,
  fetchCustomerLoyaltyLedger,
  fetchCustomerFinanceSummaryFromCustomers,
  fetchMemberCard,
  regenerateMemberCode,
  updateCustomer,
  updateCustomerAddress,
  type CustomerDetail,
} from '@/lib/customers-api';
import { ReceivablePaymentHistoryTable } from '@/components/dashboard/ReceivablePaymentHistoryTable';
import { ReceivablePaymentModal } from '@/components/dashboard/ReceivablePaymentModal';
import { fetchCustomerPaymentHistory } from '@/lib/receivables-api';
import type { ReceivablePaymentView } from '@barokah/shared';
import { topUpDeposit } from '@/lib/deposits-api';
import { fetchCustomerCreditAuditLog, type CustomerCreditAuditEntry } from '@/lib/finance-api';
import { CUSTOMER_CREDIT_AUDIT_ACTION_LABELS, DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR } from '@barokah/shared';
import { canManageCustomers } from '@/lib/rbac';
import type { CustomerAddressView, LoyaltyPointLedgerEntry, MemberCardView } from '@barokah/shared';
import type { CustomerFinanceSummary } from '@/lib/receivables-api';

type TabId = 'profil' | 'alamat' | 'poin' | 'piutang' | 'deposit' | 'kartu' | 'riwayat-kredit';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'profil', label: 'Profil' },
  { id: 'alamat', label: 'Alamat' },
  { id: 'poin', label: 'Poin' },
  { id: 'piutang', label: 'Piutang' },
  { id: 'deposit', label: 'Deposit' },
  { id: 'riwayat-kredit', label: 'Riwayat Limit & Persetujuan' },
  { id: 'kartu', label: 'Kartu Member' },
];

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const { tokens } = useAdminTheme();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [tab, setTab] = useState<TabId>('profil');
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = currentUser ? canManageCustomers(currentUser.role) : false;
  const isOwner = currentUser?.role === 'OWNER';

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await fetchCustomerDetail(customerId));
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat pelanggan.'));
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void fetchMe()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  async function handleProfileSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit || !detail) return;
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const creditRaw = String(form.get('creditLimit') ?? '').trim();
      let creditLimit: number | null | undefined;
      if (creditRaw === 'unlimited') creditLimit = null;
      else if (creditRaw === '0') creditLimit = 0;
      else if (creditRaw) creditLimit = parseCurrencyInput(creditRaw);

      await updateCustomer(customerId, {
        name: String(form.get('name') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim(),
        email: String(form.get('email') ?? '').trim() || null,
        notes: String(form.get('notes') ?? '').trim(),
        autoLimitEnabled: form.get('autoLimitEnabled') === 'on',
        ...(creditLimit !== undefined ? { creditLimit } : {}),
      });
      setSuccess('Profil pelanggan diperbarui.');
      await loadDetail();
    } catch (err) {
      setError(mapApiError(err, 'Gagal menyimpan profil.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 960, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title={detail?.name ?? 'Detail Pelanggan'}
        description={
          detail
            ? `${detail.phone}${detail.memberCode ? ` · ${detail.memberCode}` : ''}`
            : 'Memuat…'
        }
        actions={
          <Link href="/dashboard/customers">
            <Button type="button" variant="secondary">
              ← Daftar Pelanggan
            </Button>
          </Link>
        }
      />

      {error ? <AlertBanner variant="error" onRetry={() => void loadDetail()}>{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      <nav
        style={{
          display: 'flex',
          gap: '0.35rem',
          flexWrap: 'wrap',
          borderBottom: `1px solid ${tokens.cardBorder}`,
          paddingBottom: '0.5rem',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 8,
              border: `1px solid ${tab === t.id ? '#2563eb' : tokens.cardBorder}`,
              background: tab === t.id ? '#eff6ff' : tokens.cardBg,
              color: tab === t.id ? '#1d4ed8' : tokens.text,
              fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : !detail ? (
        <p style={{ color: tokens.muted }}>Pelanggan tidak ditemukan.</p>
      ) : tab === 'profil' ? (
        <ProfileTab detail={detail} canEdit={canEdit} saving={saving} onSave={(e) => void handleProfileSave(e)} tokens={tokens} />
      ) : tab === 'alamat' ? (
        <AddressTab customerId={customerId} canEdit={canEdit} tokens={tokens} onMessage={setSuccess} onError={setError} />
      ) : tab === 'poin' ? (
        <PointsTab customerId={customerId} tokens={tokens} />
      ) : tab === 'piutang' ? (
        <ReceivablesTab customerId={customerId} canEdit={canEdit} tokens={tokens} onRefresh={loadDetail} onMessage={setSuccess} onError={setError} />
      ) : tab === 'deposit' ? (
        <DepositTab customerId={customerId} canEdit={canEdit} tokens={tokens} onMessage={setSuccess} onError={setError} />
      ) : tab === 'riwayat-kredit' ? (
        <CreditAuditTab customerId={customerId} tokens={tokens} />
      ) : (
        <CardTab customerId={customerId} isOwner={isOwner} tokens={tokens} onMessage={setSuccess} onError={setError} />
      )}
    </div>
  );
}

function ProfileTab({
  detail,
  canEdit,
  saving,
  onSave,
  tokens,
}: {
  detail: CustomerDetail;
  canEdit: boolean;
  saving: boolean;
  onSave: (e: FormEvent<HTMLFormElement>) => void;
  tokens: { cardBg: string; cardBorder: string; muted: string };
}) {
  const creditDisplay =
    detail.creditLimit === 0
      ? '0'
      : detail.creditLimit != null
        ? formatCurrencyIDR(detail.creditLimit).replace(/^Rp\s?/, '')
        : 'unlimited';

  return (
    <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
      <form onSubmit={onSave} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Nama
          <input name="name" defaultValue={detail.name} required minLength={2} disabled={!canEdit} style={inputStyle(tokens)} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          No. HP
          <input name="phone" defaultValue={detail.phone} required disabled={!canEdit} style={inputStyle(tokens)} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Email (opsional)
          <input name="email" type="email" defaultValue={detail.email ?? ''} disabled={!canEdit} style={inputStyle(tokens)} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Kode member
          <input value={detail.memberCode ?? '—'} readOnly style={{ ...inputStyle(tokens), background: '#f8fafc' }} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Limit kredit (default baru: {formatCurrencyIDR(DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR)} · 0 = tidak tempo · unlimited)
          <input name="creditLimit" defaultValue={creditDisplay} disabled={!canEdit} style={inputStyle(tokens)} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            name="autoLimitEnabled"
            defaultChecked={detail.autoLimitEnabled !== false}
            disabled={!canEdit}
          />
          Naikkan limit otomatis berdasarkan riwayat bayar piutang
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Catatan
          <textarea name="notes" defaultValue={detail.notes ?? ''} rows={3} disabled={!canEdit} style={inputStyle(tokens)} />
        </label>
        <div style={{ fontSize: '0.8125rem', color: tokens.muted }}>
          Saldo poin: <strong>{detail.points.toLocaleString('id-ID')}</strong> · Transaksi POS: {detail.stats.transactionCount}
        </div>
        {canEdit ? (
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan Profil'}
          </Button>
        ) : null}
      </form>
    </section>
  );
}

function AddressTab({
  customerId,
  canEdit,
  tokens,
  onMessage,
  onError,
}: {
  customerId: string;
  canEdit: boolean;
  tokens: { cardBg: string; cardBorder: string; muted: string };
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [addresses, setAddresses] = useState<CustomerAddressView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAddresses(await fetchCustomerAddresses(customerId));
    } catch (err) {
      onError(mapApiError(err, 'Gagal memuat alamat.'));
    } finally {
      setLoading(false);
    }
  }, [customerId, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createCustomerAddress(customerId, {
        label: String(form.get('label')),
        addressLine1: String(form.get('addressLine1')),
        addressLine2: String(form.get('addressLine2') || '') || null,
        city: String(form.get('city')),
        province: String(form.get('province') || '') || null,
        postalCode: String(form.get('postalCode') || '') || null,
        isDefault: form.get('isDefault') === 'on',
      });
      onMessage('Alamat ditambahkan.');
      setShowForm(false);
      await load();
    } catch (err) {
      onError(mapApiError(err, 'Gagal menambah alamat.'));
    }
  }

  return (
    <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {addresses.length === 0 ? (
            <p style={{ margin: 0, color: tokens.muted }}>Belum ada alamat tersimpan.</p>
          ) : (
            addresses.map((addr) => (
              <div
                key={addr.id}
                style={{
                  padding: '0.75rem',
                  border: `1px solid ${tokens.cardBorder}`,
                  borderRadius: 8,
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <strong>
                    {addr.label}
                    {addr.isDefault ? (
                      <span style={{ marginLeft: 8, color: '#16a34a', fontSize: '0.75rem' }}>Utama</span>
                    ) : null}
                  </strong>
                  {canEdit ? (
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {!addr.isDefault ? (
                        <Button
                          type="button"
                          variant="secondary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() =>
                            void updateCustomerAddress(customerId, addr.id, { isDefault: true })
                              .then(() => load())
                              .catch((err) => onError(mapApiError(err, 'Gagal set default.')))
                          }
                        >
                          Jadikan utama
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#dc2626' }}
                        onClick={() =>
                          void deleteCustomerAddress(customerId, addr.id)
                            .then(() => load())
                            .catch((err) => onError(mapApiError(err, 'Gagal hapus.')))
                        }
                      >
                        Hapus
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div style={{ color: tokens.muted, marginTop: 4 }}>
                  {addr.addressLine1}
                  {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                  <br />
                  {addr.city}
                  {addr.province ? `, ${addr.province}` : ''} {addr.postalCode ?? ''}
                </div>
              </div>
            ))
          )}
          {canEdit && !showForm ? (
            <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
              + Tambah Alamat
            </Button>
          ) : null}
          {showForm ? (
            <form onSubmit={(e) => void handleCreate(e)} style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
              <select name="label" required style={inputStyle(tokens)}>
                {CUSTOMER_ADDRESS_LABELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <input name="addressLine1" required placeholder="Alamat jalan / RT-RW" style={inputStyle(tokens)} />
              <input name="addressLine2" placeholder="Patokan / gedung (opsional)" style={inputStyle(tokens)} />
              <input name="city" required placeholder="Kota" style={inputStyle(tokens)} />
              <input name="province" placeholder="Provinsi (opsional)" style={inputStyle(tokens)} />
              <input name="postalCode" placeholder="Kode pos (opsional)" style={inputStyle(tokens)} />
              <label style={{ fontSize: '0.875rem' }}>
                <input type="checkbox" name="isDefault" /> Jadikan alamat utama
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button type="submit" variant="primary">
                  Simpan
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      )}
    </section>
  );
}

function PointsTab({
  customerId,
  tokens,
}: {
  customerId: string;
  tokens: { cardBg: string; cardBorder: string; muted: string };
}) {
  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState<LoyaltyPointLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchCustomerLoyaltyLedger(customerId)
      .then((data) => {
        setBalance(data.balance);
        setEntries(data.entries);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  const typeLabel: Record<string, string> = {
    EARN: 'Dapat',
    REDEEM: 'Tukar',
    ADJUST: 'Koreksi',
  };

  return (
    <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          <p style={{ margin: '0 0 1rem', fontSize: '1rem' }}>
            Saldo poin: <strong style={{ color: '#16a34a' }}>{balance.toLocaleString('id-ID')}</strong>
          </p>
          {entries.length === 0 ? (
            <p style={{ color: tokens.muted }}>Belum ada riwayat poin.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tokens.cardBorder}`, textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Tanggal</th>
                  <th style={{ padding: '0.5rem' }}>Jenis</th>
                  <th style={{ padding: '0.5rem' }}>Poin</th>
                  <th style={{ padding: '0.5rem' }}>Saldo</th>
                  <th style={{ padding: '0.5rem' }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: `1px solid ${tokens.cardBorder}` }}>
                    <td style={{ padding: '0.5rem' }}>
                      {new Date(entry.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '0.5rem' }}>{typeLabel[entry.type] ?? entry.type}</td>
                    <td
                      style={{
                        padding: '0.5rem',
                        color: entry.points >= 0 ? '#16a34a' : '#dc2626',
                        fontWeight: 600,
                      }}
                    >
                      {entry.points >= 0 ? '+' : ''}
                      {entry.points}
                    </td>
                    <td style={{ padding: '0.5rem' }}>{entry.balanceAfter}</td>
                    <td style={{ padding: '0.5rem', color: tokens.muted }}>{entry.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

function ReceivablesTab({
  customerId,
  canEdit,
  tokens,
  onRefresh,
  onMessage,
  onError,
}: {
  customerId: string;
  canEdit: boolean;
  tokens: { cardBg: string; cardBorder: string; muted: string };
  onRefresh: () => Promise<void>;
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [summary, setSummary] = useState<CustomerFinanceSummary | null>(null);
  const [payments, setPayments] = useState<ReceivablePaymentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fin, history] = await Promise.all([
        fetchCustomerFinanceSummaryFromCustomers(customerId),
        fetchCustomerPaymentHistory(customerId),
      ]);
      setSummary(fin);
      setPayments(history.payments);
    } catch (err) {
      onError(mapApiError(err, 'Gagal memuat piutang.'));
    } finally {
      setLoading(false);
    }
  }, [customerId, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReceivables =
    summary?.receivables.filter((r) => r.status === 'OPEN' || r.status === 'PARTIAL') ?? [];

  return (
    <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : summary ? (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <p style={{ margin: '0 0 0.75rem' }}>
              Total piutang:{' '}
              <strong>{formatCurrencyIDR(summary.finance?.receivableOutstanding ?? 0)}</strong>
              {' · '}
              Deposit: <strong>{formatCurrencyIDR(summary.finance?.depositBalance ?? 0)}</strong>
            </p>
            {canEdit && openReceivables.length > 0 ? (
              <Button type="button" variant="primary" onClick={() => setShowPayModal(true)}>
                Catat Pembayaran
              </Button>
            ) : null}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.875rem' }}>
              <Link href={`/dashboard/receivables?customerId=${customerId}`} style={{ color: '#2563eb' }}>
                Daftar piutang →
              </Link>
              <Link href={`/dashboard/receivables/statement/${customerId}`} style={{ color: '#2563eb' }}>
                Cetak statement →
              </Link>
            </div>
          </div>

          {summary.receivables.length === 0 ? (
            <p style={{ color: tokens.muted, margin: 0 }}>Tidak ada piutang aktif.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tokens.cardBorder}` }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Ref</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Sisa</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Jatuh Tempo</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.receivables.map((row) => (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${tokens.cardBorder}` }}>
                    <td style={{ padding: '0.5rem' }}>
                      {row.transaction?.receiptNo ?? row.id.slice(0, 8)}
                      {row.transactionId ? (
                        <div>
                          <Link
                            href={`/dashboard/transactions?receiptNo=${encodeURIComponent(row.transaction?.receiptNo ?? '')}`}
                            style={{ fontSize: '0.75rem', color: '#2563eb' }}
                          >
                            Lihat transaksi
                          </Link>
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrencyIDR(row.outstanding)}</td>
                    <td style={{ padding: '0.5rem' }}>{row.dueDate ?? '—'}</td>
                    <td style={{ padding: '0.5rem' }}>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Riwayat Pembayaran</h3>
            <ReceivablePaymentHistoryTable
              payments={payments}
              customerName={summary.customer.name}
              customerPhone={summary.customer.phone}
            />
          </div>

          <ReceivablePaymentModal
            open={showPayModal}
            onClose={() => setShowPayModal(false)}
            onSuccess={(msg) => {
              onMessage(msg);
              void load();
              void onRefresh();
            }}
            customerId={customerId}
            customerName={summary.customer.name}
            depositBalance={summary.finance?.depositBalance ?? 0}
            receivables={openReceivables}
          />
        </div>
      ) : null}
    </section>
  );
}

function DepositTab({
  customerId,
  canEdit,
  tokens,
  onMessage,
  onError,
}: {
  customerId: string;
  canEdit: boolean;
  tokens: { cardBg: string; cardBorder: string; muted: string };
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [summary, setSummary] = useState<CustomerFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await fetchCustomerFinanceSummaryFromCustomers(customerId));
    } catch (err) {
      onError(mapApiError(err, 'Gagal memuat deposit.'));
    } finally {
      setLoading(false);
    }
  }, [customerId, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleTopUp(e: FormEvent) {
    e.preventDefault();
    const amount = parseCurrencyInput(topUpAmount);
    if (amount <= 0) return;
    try {
      await topUpDeposit({ customerId, amount, notes: 'Top-up dari dashboard pelanggan' });
      onMessage('Top-up deposit berhasil.');
      setTopUpAmount('');
      await load();
    } catch (err) {
      onError(mapApiError(err, 'Gagal top-up deposit.'));
    }
  }

  return (
    <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : summary ? (
        <>
          <p style={{ margin: '0 0 1rem' }}>
            Saldo deposit: <strong>{formatCurrencyIDR(summary.finance?.depositBalance ?? 0)}</strong>
          </p>
          {canEdit ? (
            <form onSubmit={(e) => void handleTopUp(e)} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Nominal top-up (Rp)"
                style={{ ...inputStyle(tokens), flex: '1 1 180px' }}
              />
              <Button type="submit" variant="primary">
                Top-up
              </Button>
            </form>
          ) : null}
          {summary.deposit?.recentLedger.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tokens.cardBorder}` }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Tanggal</th>
                  <th style={{ padding: '0.5rem' }}>Jenis</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Nominal</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {summary.deposit.recentLedger.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: `1px solid ${tokens.cardBorder}` }}>
                    <td style={{ padding: '0.5rem' }}>{new Date(entry.createdAt).toLocaleString('id-ID')}</td>
                    <td style={{ padding: '0.5rem' }}>{entry.type}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrencyIDR(entry.amount)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrencyIDR(entry.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: tokens.muted }}>Belum ada riwayat deposit.</p>
          )}
        </>
      ) : null}
    </section>
  );
}

function CardTab({
  customerId,
  isOwner,
  tokens,
  onMessage,
  onError,
}: {
  customerId: string;
  isOwner: boolean;
  tokens: { cardBg: string; cardBorder: string };
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [card, setCard] = useState<MemberCardView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchMemberCard(customerId)
      .then(setCard)
      .catch((err) => onError(mapApiError(err, 'Gagal memuat kartu.')))
      .finally(() => setLoading(false));
  }, [customerId, onError]);

  return (
    <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : card ? (
        <>
          <MemberCard card={card} />
          {isOwner ? (
            <Button
              type="button"
              variant="secondary"
              style={{ marginTop: '0.75rem' }}
              onClick={() =>
                void regenerateMemberCode(customerId)
                  .then((updated) => {
                    setCard(updated);
                    onMessage('Kode member diperbarui.');
                  })
                  .catch((err) => onError(mapApiError(err, 'Gagal regenerate kode.')))
              }
            >
              Regenerate Kode (Owner)
            </Button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function CreditAuditTab({
  customerId,
  tokens,
}: {
  customerId: string;
  tokens: { cardBg: string; cardBorder: string; muted: string };
}) {
  const [entries, setEntries] = useState<CustomerCreditAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCustomerCreditAuditLog(customerId)
      .then((data) => setEntries(data.entries))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat riwayat.'))
      .finally(() => setLoading(false));
  }, [customerId]);

  return (
    <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : error ? (
        <AlertBanner variant="error">{error}</AlertBanner>
      ) : entries.length === 0 ? (
        <p style={{ margin: 0, color: tokens.muted }}>Belum ada riwayat limit atau persetujuan.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {entries.map((entry) => (
            <article
              key={entry.id}
              style={{
                border: `1px solid ${tokens.cardBorder}`,
                borderRadius: 8,
                padding: '0.65rem 0.75rem',
                fontSize: '0.8125rem',
              }}
            >
              <strong>{CUSTOMER_CREDIT_AUDIT_ACTION_LABELS[entry.action] ?? entry.action}</strong>
              <div style={{ color: tokens.muted, marginTop: 2 }}>
                {new Date(entry.createdAt).toLocaleString('id-ID')}
                {entry.receiptNo ? ` · ${entry.receiptNo}` : ''}
              </div>
              {entry.oldLimit != null || entry.newLimit != null ? (
                <div>
                  Limit: {entry.oldLimit != null ? formatCurrencyIDR(entry.oldLimit) : '—'} →{' '}
                  {entry.newLimit != null ? formatCurrencyIDR(entry.newLimit) : '—'}
                </div>
              ) : null}
              {entry.amount != null ? <div>Nominal tempo: {formatCurrencyIDR(entry.amount)}</div> : null}
              {entry.approvedBy ? <div>Disetujui: {entry.approvedBy.fullName}</div> : null}
              {entry.recordedBy ? <div>Dicatat: {entry.recordedBy.fullName}</div> : null}
              {entry.notes ? <div style={{ color: tokens.muted }}>{entry.notes}</div> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function inputStyle(tokens: { cardBorder: string }) {
  return {
    padding: '0.5rem',
    borderRadius: 8,
    border: `1px solid ${tokens.cardBorder}`,
    fontSize: '0.875rem',
  } as const;
}
