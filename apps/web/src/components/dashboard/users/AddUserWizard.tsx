'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@barokah/ui';
import { formatPhoneDisplay, PASSWORD_HINT } from '@barokah/shared';
import {
  AlertBanner,
  BreadcrumbNav,
  PageHeader,
  cardStyle,
  dashboardTokens,
} from '@/components/dashboard/dashboard-ui';
import { fetchMe, type AuthUser } from '@/lib/auth';
import { fetchOutlets } from '@/lib/reports';
import { canCreateUser } from '@/lib/rbac';
import {
  getAssignableRoleOptions,
  isCashierRole,
  mapApiDetailsToFieldErrors,
  type UserFormFieldErrors,
  type UserFormValues,
  validateAccessStep,
  validateIdentityStep,
} from '@/lib/user-form-validation';
import { createUser, UserApiError, USER_ROLE_LABELS } from '@/lib/users-api';

const fieldStyle = {
  padding: '0.6875rem 0.75rem',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  minHeight: 44,
  fontSize: '0.9375rem',
} as const;

const labelStyle = {
  display: 'grid',
  gap: '0.35rem',
  fontSize: '0.875rem',
  fontWeight: 500,
} as const;

const STEPS = [
  { id: 1, title: 'Identitas', description: 'Data akun staff' },
  { id: 2, title: 'Peran & Akses', description: 'Role dan cabang' },
  { id: 3, title: 'Review', description: 'Konfirmasi sebelum simpan' },
] as const;

function emptyForm(defaultOutletIds: string[] = []): UserFormValues {
  return {
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'CASHIER',
    outletIds: defaultOutletIds,
    isActive: true,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" style={{ color: '#b91c1c', fontSize: '0.8125rem' }}>
      {message}
    </span>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <ol
      aria-label="Langkah pembuatan pengguna"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '0.75rem',
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}
    >
      {STEPS.map((step) => {
        const active = step.id === currentStep;
        const done = step.id < currentStep;
        return (
          <li
            key={step.id}
            aria-current={active ? 'step' : undefined}
            style={{
              border: `1px solid ${active || done ? dashboardTokens.primary : '#e2e8f0'}`,
              borderRadius: 12,
              padding: '0.75rem',
              background: active ? '#f0fdf4' : '#fff',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Langkah {step.id}</div>
            <div style={{ fontWeight: 600, color: active ? '#166534' : dashboardTokens.text }}>{step.title}</div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.15rem' }}>{step.description}</div>
          </li>
        );
      })}
    </ol>
  );
}

export function AddUserWizard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [outletOptions, setOutletOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<UserFormValues>(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<UserFormFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const actorRole = currentUser?.role ?? '';
  const roleOptions = useMemo(() => getAssignableRoleOptions(actorRole), [actorRole]);
  const canCreate = currentUser ? canCreateUser(currentUser.role) : false;

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [me, outletsRes] = await Promise.all([fetchMe(), fetchOutlets()]);
        setCurrentUser(me);
        const outlets = outletsRes?.outlets ?? [];
        setOutletOptions(outlets.map((o) => ({ id: o.id, label: `${o.name} (${o.code})` })));
        if (outlets.length === 1) {
          setForm((prev) => ({ ...prev, outletIds: [outlets[0]!.id] }));
        }
        if (me.role === 'MANAGER') {
          setForm((prev) => ({ ...prev, role: 'CASHIER' }));
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Gagal memuat data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function patchForm(patch: Partial<UserFormValues>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (patch.role && isCashierRole(patch.role) && next.outletIds.length > 1) {
        next.outletIds = next.outletIds.slice(0, 1);
      }
      return next;
    });
    setFieldErrors({});
    setFormError(null);
  }

  function goNext() {
    if (step === 1) {
      const errors = validateIdentityStep(form, { requirePassword: true });
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }
    if (step === 2) {
      const errors = validateAccessStep(form);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }
    setFieldErrors({});
    setStep((prev) => Math.min(prev + 1, 3));
  }

  function goBack() {
    setFieldErrors({});
    setFormError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const identityErrors = validateIdentityStep(form, { requirePassword: true });
    const accessErrors = validateAccessStep(form);
    const merged = { ...identityErrors, ...accessErrors };
    if (Object.keys(merged).length > 0) {
      setFieldErrors(merged);
      setStep(Object.keys(identityErrors).length > 0 ? 1 : 2);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const created = await createUser({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
        outletIds: form.outletIds,
        isActive: form.isActive,
      });
      router.push(`/dashboard/users?created=${created.id}&toast=created`);
    } catch (err) {
      if (err instanceof UserApiError) {
        const mapped = mapApiDetailsToFieldErrors(err.details);
        setFieldErrors(mapped);
        if (mapped.email || mapped.password || mapped.fullName || mapped.phone || mapped.confirmPassword) {
          setStep(1);
        } else if (mapped.outletIds || mapped.role) {
          setStep(2);
        }
        setFormError(err.message);
        return;
      }
      setFormError(err instanceof Error ? err.message : 'Gagal membuat pengguna.');
    } finally {
      setSaving(false);
    }
  }

  function renderOutletPicker() {
    const singleSelect = isCashierRole(form.role);
    return (
      <fieldset
        style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.875rem', margin: 0 }}
        aria-invalid={Boolean(fieldErrors.outletIds)}
      >
        <legend style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 0.35rem' }}>
          {singleSelect ? 'Cabang kerja *' : 'Akses cabang *'}
        </legend>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#64748b' }}>
          {singleSelect
            ? 'Kasir hanya dapat diassign ke satu cabang.'
            : 'Manajer/akuntan dapat mengakses satu atau lebih cabang.'}
        </p>
        {outletOptions.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Belum ada cabang aktif.</p>
        ) : (
          outletOptions.map((outlet) => (
            <label
              key={outlet.id}
              style={{
                display: 'flex',
                gap: '0.625rem',
                alignItems: 'center',
                marginBottom: '0.5rem',
                fontSize: '0.9375rem',
                minHeight: 44,
                cursor: 'pointer',
              }}
            >
              <input
                type={singleSelect ? 'radio' : 'checkbox'}
                name="outletIds"
                disabled={saving}
                checked={form.outletIds.includes(outlet.id)}
                onChange={(e) => {
                  if (singleSelect) {
                    patchForm({ outletIds: e.target.checked ? [outlet.id] : [] });
                    return;
                  }
                  patchForm({
                    outletIds: e.target.checked
                      ? [...form.outletIds, outlet.id]
                      : form.outletIds.filter((id) => id !== outlet.id),
                  });
                }}
                style={{ width: 18, height: 18 }}
              />
              {outlet.label}
            </label>
          ))
        )}
        <FieldError message={fieldErrors.outletIds} />
      </fieldset>
    );
  }

  if (loading) {
    return <p style={{ color: '#64748b' }}>Memuat formulir…</p>;
  }

  if (!canCreate) {
    return (
      <AlertBanner variant="error">
        Anda tidak memiliki izin menambah pengguna staff.{' '}
        <Link href="/dashboard/users">Kembali ke daftar pengguna</Link>
      </AlertBanner>
    );
  }

  const selectedOutlets = outletOptions.filter((o) => form.outletIds.includes(o.id));

  return (
    <div style={{ maxWidth: 760, display: 'grid', gap: '1.25rem' }}>
      <BreadcrumbNav
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Pengguna', href: '/dashboard/users' },
          { label: 'Tambah pengguna' },
        ]}
      />
      <PageHeader
        title={actorRole === 'MANAGER' ? 'Tambah Kasir Baru' : 'Tambah Pengguna Baru'}
        description="Buat akun staff tenant — bukan member/pelanggan CRM storefront."
      />

      <StepIndicator currentStep={step} />

      {formError ? <AlertBanner variant="error">{formError}</AlertBanner> : null}

      <form onSubmit={(e) => void handleSubmit(e)} style={cardStyle()}>
        {step === 1 ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Langkah 1 — Identitas</h3>
            <label style={labelStyle}>
              Nama lengkap *
              <input
                required
                aria-invalid={Boolean(fieldErrors.fullName)}
                value={form.fullName}
                onChange={(e) => patchForm({ fullName: e.target.value })}
                style={fieldStyle}
                autoComplete="name"
              />
              <FieldError message={fieldErrors.fullName} />
            </label>
            <label style={labelStyle}>
              Email *
              <input
                type="email"
                required
                aria-invalid={Boolean(fieldErrors.email)}
                value={form.email}
                onChange={(e) => patchForm({ email: e.target.value })}
                style={fieldStyle}
                autoComplete="off"
              />
              <FieldError message={fieldErrors.email} />
            </label>
            <label style={labelStyle}>
              No. HP (opsional)
              <input
                type="tel"
                inputMode="tel"
                placeholder="08xxxxxxxxxx"
                aria-invalid={Boolean(fieldErrors.phone)}
                value={form.phone}
                onChange={(e) => patchForm({ phone: e.target.value })}
                style={fieldStyle}
                autoComplete="tel"
              />
              <FieldError message={fieldErrors.phone} />
            </label>
            <label style={labelStyle}>
              Password *
              <input
                type="password"
                required
                minLength={8}
                aria-invalid={Boolean(fieldErrors.password)}
                value={form.password}
                onChange={(e) => patchForm({ password: e.target.value })}
                style={fieldStyle}
                autoComplete="new-password"
              />
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{PASSWORD_HINT}</span>
              <FieldError message={fieldErrors.password} />
            </label>
            <label style={labelStyle}>
              Konfirmasi password *
              <input
                type="password"
                required
                minLength={8}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                value={form.confirmPassword}
                onChange={(e) => patchForm({ confirmPassword: e.target.value })}
                style={fieldStyle}
                autoComplete="new-password"
              />
              <FieldError message={fieldErrors.confirmPassword} />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Langkah 2 — Peran & Akses</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Peran *</span>
              {roleOptions.map((option) => {
                const selected = form.role === option.value;
                return (
                  <label
                    key={option.value}
                    style={{
                      display: 'grid',
                      gap: '0.25rem',
                      padding: '0.875rem',
                      borderRadius: 12,
                      border: `1px solid ${selected ? dashboardTokens.primary : '#e2e8f0'}`,
                      background: selected ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                      minHeight: 44,
                    }}
                  >
                    <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="role"
                        checked={selected}
                        onChange={() => patchForm({ role: option.value })}
                      />
                      <strong>{option.label}</strong>
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: '#64748b', paddingLeft: '1.6rem' }}>
                      {option.description}
                    </span>
                  </label>
                );
              })}
              <FieldError message={fieldErrors.role} />
            </div>
            {renderOutletPicker()}
            <label
              style={{
                display: 'flex',
                gap: '0.625rem',
                alignItems: 'center',
                fontSize: '0.9375rem',
                minHeight: 44,
              }}
            >
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => patchForm({ isActive: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              Akun aktif (dapat login segera)
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Langkah 3 — Review & Simpan</h3>
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '1rem',
                display: 'grid',
                gap: '0.65rem',
                fontSize: '0.9375rem',
              }}
            >
              <div><strong>Nama:</strong> {form.fullName.trim()}</div>
              <div><strong>Email:</strong> {form.email.trim().toLowerCase()}</div>
              <div>
                <strong>No. HP:</strong>{' '}
                {form.phone.trim() ? formatPhoneDisplay(form.phone.trim()) : '—'}
              </div>
              <div><strong>Peran:</strong> {USER_ROLE_LABELS[form.role] ?? form.role}</div>
              <div>
                <strong>Cabang:</strong>{' '}
                {selectedOutlets.map((o) => o.label).join(', ') || '—'}
              </div>
              <div><strong>Status:</strong> {form.isActive ? 'Aktif' : 'Nonaktif'}</div>
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
              Staff akan menerima kredensial email + password sementara yang Anda tentukan.
            </p>
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginTop: '1.25rem',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={goBack} disabled={saving}>
                Kembali
              </Button>
            ) : (
              <Link href="/dashboard/users" style={{ textDecoration: 'none' }}>
                <Button type="button" variant="secondary">
                  Batal
                </Button>
              </Link>
            )}
          </div>
          {step < 3 ? (
            <Button type="button" variant="primary" onClick={goNext}>
              Lanjut
            </Button>
          ) : (
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan Pengguna'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
