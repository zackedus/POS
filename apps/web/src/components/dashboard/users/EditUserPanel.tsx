'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@barokah/ui';
import { formatPhoneDisplay, PASSWORD_HINT } from '@barokah/shared';
import {
  getAssignableRoleOptions,
  isCashierRole,
  mapApiDetailsToFieldErrors,
  type UserFormFieldErrors,
  validateAccessStep,
  validateIdentityStep,
} from '@/lib/user-form-validation';
import { updateUser, UserApiError, USER_ROLE_LABELS, type UserSummary } from '@/lib/users-api';

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

type EditUserPanelProps = {
  user: UserSummary;
  actorRole: string;
  outletOptions: Array<{ id: string; label: string }>;
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onCancel: () => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" style={{ color: '#b91c1c', fontSize: '0.8125rem' }}>
      {message}
    </span>
  );
}

export function EditUserPanel({
  user,
  actorRole,
  outletOptions,
  saving,
  onSavingChange,
  onSuccess,
  onError,
  onCancel,
}: EditUserPanelProps) {
  const roleOptions = getAssignableRoleOptions(actorRole);
  const [form, setForm] = useState({
    fullName: user.fullName,
    phone: user.phone ? formatPhoneDisplay(user.phone) : '',
    role: user.role,
    outletIds: user.outlets.map((o) => o.id),
    password: '',
    confirmPassword: '',
    isActive: user.isActive,
  });
  const [fieldErrors, setFieldErrors] = useState<UserFormFieldErrors>({});

  function patchForm(patch: Partial<typeof form>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (patch.role && isCashierRole(patch.role) && next.outletIds.length > 1) {
        next.outletIds = next.outletIds.slice(0, 1);
      }
      return next;
    });
    setFieldErrors({});
  }

  function renderOutletPicker() {
    const singleSelect = isCashierRole(form.role);
    return (
      <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem', margin: 0 }}>
        <legend style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 0.25rem' }}>
          {singleSelect ? 'Cabang kerja *' : 'Akses cabang *'}
        </legend>
        {outletOptions.map((outlet) => (
          <label
            key={outlet.id}
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              marginBottom: '0.35rem',
              fontSize: '0.875rem',
              minHeight: 44,
            }}
          >
            <input
              type={singleSelect ? 'radio' : 'checkbox'}
              name={`edit-outlet-${user.id}`}
              disabled={saving || user.role === 'OWNER'}
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
            />
            {outlet.label}
          </label>
        ))}
        <FieldError message={fieldErrors.outletIds} />
      </fieldset>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const identityErrors = validateIdentityStep(
      {
        fullName: form.fullName,
        email: user.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
      },
      { requirePassword: false },
    );
    const accessErrors = validateAccessStep({ role: form.role, outletIds: form.outletIds });
    const merged = { ...identityErrors, ...accessErrors };
    if (Object.keys(merged).length > 0) {
      setFieldErrors(merged);
      onError('Periksa field yang ditandai.');
      return;
    }

    onSavingChange(true);
    try {
      await updateUser(user.id, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || null,
        role: user.role === 'OWNER' ? undefined : form.role,
        outletIds: form.outletIds,
        isActive: form.isActive,
        ...(form.password.trim() ? { password: form.password.trim() } : {}),
      });
      onSuccess(`Data pengguna ${form.fullName.trim()} berhasil diperbarui.`);
    } catch (err) {
      if (err instanceof UserApiError) {
        setFieldErrors(mapApiDetailsToFieldErrors(err.details));
        onError(err.message);
        return;
      }
      onError(err instanceof Error ? err.message : 'Gagal memperbarui pengguna.');
    } finally {
      onSavingChange(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 560 }}>
      <label style={labelStyle}>
        Nama lengkap *
        <input
          required
          value={form.fullName}
          onChange={(e) => patchForm({ fullName: e.target.value })}
          style={fieldStyle}
        />
        <FieldError message={fieldErrors.fullName} />
      </label>
      <label style={labelStyle}>
        Email
        <input value={user.email} disabled style={{ ...fieldStyle, background: '#f8fafc' }} />
      </label>
      <label style={labelStyle}>
        No. HP (opsional)
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => patchForm({ phone: e.target.value })}
          placeholder="08xxxxxxxxxx"
          style={fieldStyle}
        />
        <FieldError message={fieldErrors.phone} />
      </label>
      {user.role !== 'OWNER' ? (
        <label style={labelStyle}>
          Role
          <select
            value={form.role}
            onChange={(e) => patchForm({ role: e.target.value })}
            style={fieldStyle}
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            {roleOptions.find((r) => r.value === form.role)?.description}
          </span>
        </label>
      ) : (
        <div style={{ fontSize: '0.875rem' }}>
          <strong>Role:</strong> {USER_ROLE_LABELS.OWNER}
        </div>
      )}
      {renderOutletPicker()}
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', minHeight: 44, fontSize: '0.875rem' }}>
        <input
          type="checkbox"
          checked={form.isActive}
          disabled={user.role === 'OWNER'}
          onChange={(e) => patchForm({ isActive: e.target.checked })}
        />
        Akun aktif
      </label>
      <details>
        <summary style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, minHeight: 44 }}>
          Reset password (opsional)
        </summary>
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
          <label style={labelStyle}>
            Password baru
            <input
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => patchForm({ password: e.target.value })}
              placeholder="Kosongkan jika tidak diubah"
              style={fieldStyle}
            />
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{PASSWORD_HINT}</span>
            <FieldError message={fieldErrors.password} />
          </label>
          <label style={labelStyle}>
            Konfirmasi password
            <input
              type="password"
              minLength={8}
              value={form.confirmPassword}
              onChange={(e) => patchForm({ confirmPassword: e.target.value })}
              style={fieldStyle}
            />
            <FieldError message={fieldErrors.confirmPassword} />
          </label>
        </div>
      </details>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
        </Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
}
