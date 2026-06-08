'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@barokah/ui';
import {
  RBAC_PERMISSION_KEYS,
  RBAC_PERMISSION_LABELS,
  RBAC_PERMISSION_LEVEL_LABELS,
  RBAC_SYSTEM_ROLES,
  type PermissionLevel,
  type UserRole,
} from '@barokah/shared';
import {
  AlertBanner,
  cardStyle,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import { fetchMe, type AuthUser } from '@/lib/auth';
import {
  fetchRoles,
  formatPermissionCell,
  getLocalRolesData,
  permissionLevelVariant,
  RBAC_ROLE_LABELS,
  type RolesApiResponse,
} from '@/lib/roles-api';

function PermissionCell({
  role,
  permission,
  level,
}: {
  role: UserRole;
  permission: (typeof RBAC_PERMISSION_KEYS)[number];
  level: PermissionLevel;
}) {
  const tooltip = formatPermissionCell(role, permission, level);
  return (
    <span title={tooltip}>
      <StatusBadge label={RBAC_PERMISSION_LEVEL_LABELS[level]} variant={permissionLevelVariant(level)} />
    </span>
  );
}

export function RolesPanel({ embedded = false }: { embedded?: boolean }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<RolesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUser?.role === 'OWNER';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMe();
      setCurrentUser(me);
      try {
        setData(await fetchRoles());
      } catch {
        setData(getLocalRolesData());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat peran & izin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const matrix = data?.matrix;

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {!embedded ? (
        <PageHeader
          title="Peran & Izin"
          description={
            isOwner
              ? 'Definisi peran sistem tetap (RBAC). Tetapkan peran ke staff di halaman Pengguna.'
              : 'Lihat matriks izin per role. Hanya Pemilik yang dapat mengubah kebijakan sensitif tenant.'
          }
          actions={
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href="/dashboard/users?tab=pengguna" style={{ textDecoration: 'none' }}>
                <Button type="button" variant="primary">
                  Tetapkan ke Pengguna
                </Button>
              </Link>
              <Button type="button" variant="secondary" onClick={() => void loadData()} disabled={loading}>
                Muat ulang
              </Button>
            </div>
          }
        />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={() => void loadData()} disabled={loading}>
            Muat ulang
          </Button>
        </div>
      )}

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <section style={cardStyle()}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.125rem' }}>Daftar Role Sistem</h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#64748b' }}>
          Role kustom (builder) akan tersedia di <strong>Fase 3</strong>. Saat ini gunakan role tetap di bawah.
        </p>

        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {(data?.roles ?? []).map((role) => (
              <div
                key={role.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '1rem',
                  background: role.id === 'OWNER' ? '#f0fdf4' : '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <StatusBadge
                    label={role.label}
                    variant={role.id === 'OWNER' ? 'success' : role.id === 'MANAGER' ? 'info' : 'neutral'}
                  />
                  <code style={{ fontSize: '0.75rem', color: '#64748b' }}>{role.id}</code>
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.45 }}>
                  {role.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={cardStyle()}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.125rem' }}>Matriks Izin (Permission Matrix)</h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#64748b' }}>
          Tabel read-only — menunjukkan apa yang boleh/tidak boleh dilakukan setiap role.
        </p>

        {loading || !matrix ? (
          <LoadingSkeleton rows={6} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyles.table}>
              <thead>
                <tr style={tableStyles.headRow}>
                  <th style={{ ...tableStyles.th, minWidth: 200, textAlign: 'left' }}>Izin</th>
                  {RBAC_SYSTEM_ROLES.map((role) => (
                    <th key={role} style={{ ...tableStyles.th, minWidth: 100, textAlign: 'center' }}>
                      {RBAC_ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RBAC_PERMISSION_KEYS.map((permission) => (
                  <tr key={permission} style={tableStyles.row}>
                    <td style={tableStyles.td}>{RBAC_PERMISSION_LABELS[permission]}</td>
                    {RBAC_SYSTEM_ROLES.map((role) => (
                      <td key={`${permission}-${role}`} style={{ ...tableStyles.td, textAlign: 'center' }}>
                        <PermissionCell
                          role={role}
                          permission={permission}
                          level={matrix.roles.find((r) => r.id === role)?.permissions[permission] ?? 'none'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={cardStyle({ background: '#fffbeb', borderColor: '#fcd34d' })}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#92400e' }}>Cara menetapkan role ke staff</h3>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#78350f', lineHeight: 1.5 }}>
          Role ditetapkan per akun pengguna, bukan di halaman ini. Buka{' '}
          <Link href="/dashboard/users?tab=pengguna" style={{ color: '#16a34a', fontWeight: 600 }}>
            Manajemen Pengguna
          </Link>{' '}
          untuk membuat akun baru atau mengubah role &amp; cabang staff yang sudah ada.
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#78350f', lineHeight: 1.6 }}>
          <li>
            <strong>Pemilik</strong> dapat menetapkan Manajer, Kasir, Gudang, dan Akuntan.
          </li>
          <li>
            <strong>Manajer</strong> hanya dapat menambah/mengubah akun Kasir.
          </li>
          <li>Role Pemilik tidak dapat dibuat ulang via dashboard (proteksi tenant).</li>
        </ul>
      </section>

      <section style={cardStyle()}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Coming soon — Fase 3</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
          Role kustom &amp; editor kebijakan granular (permission builder) direncanakan untuk fase enterprise.
          MVP retail saat ini memakai lima role sistem tetap di atas.
        </p>
      </section>
    </div>
  );
}
