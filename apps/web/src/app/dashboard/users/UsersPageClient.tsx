'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@barokah/ui';
import { DEFAULT_PAGE_SIZE, type PaginationMeta } from '@barokah/shared';
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
import { EditUserPanel } from '@/components/dashboard/users/EditUserPanel';
import { RolesPanel } from '@/components/dashboard/users/RolesPanel';
import { UsersTabs, parseUsersTab, type UsersTabId } from '@/components/dashboard/users/users-ui';
import { fetchMe, type AuthUser } from '@/lib/auth';
import { fetchOutlets } from '@/lib/reports';
import { canCreateUser, canDeactivateUser, canEditUser } from '@/lib/rbac';
import { roleBadgeVariant } from '@/lib/roles-api';
import {
  deactivateUser,
  fetchUsers,
  updateUser,
  USER_ROLE_LABELS,
  type UserSummary,
} from '@/lib/users-api';
import { ListFilterBar, FILTER_EMPTY_DESCRIPTION } from '@/components/dashboard/ListFilterBar';
import { buildFilterChips } from '@/lib/list-filters';

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Semua role' },
  ...Object.entries(USER_ROLE_LABELS).map(([value, label]) => ({ value, label })),
];

const ACTIVE_FILTER_OPTIONS = [
  { value: '', label: 'Semua status' },
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
];

type UserFilters = {
  role: string;
  isActive: string;
  search: string;
};

function emptyUserFilters(): UserFilters {
  return { role: '', isActive: '', search: '' };
}

export function UsersPageClient({
  tab,
  createdUserId,
  toast,
}: {
  tab?: string;
  createdUserId?: string;
  toast?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<UsersTabId>(() => parseUsersTab(tab));

  useEffect(() => {
    setActiveTab(parseUsersTab(tab));
  }, [tab]);

  const handleTabChange = useCallback(
    (nextTab: UsersTabId) => {
      setActiveTab(nextTab);
      router.push(`/dashboard/users?tab=${nextTab}`);
    },
    [router],
  );

  if (activeTab === 'roles') {
    return (
      <div style={{ maxWidth: 1200, display: 'grid', gap: '1.25rem' }}>
        <PageHeader
          title="Pengguna & Peran"
          description="Kelola akun staff dan lihat matriks izin RBAC tenant."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Pengguna' },
          ]}
        />
        <UsersTabs activeTab={activeTab} onTabChange={handleTabChange} />
        <RolesPanel embedded />
      </div>
    );
  }

  return (
    <UsersManagementPanel
      activeTab={activeTab}
      onTabChange={handleTabChange}
      createdUserId={createdUserId}
      toast={toast}
    />
  );
}

function UsersManagementPanel({
  activeTab,
  onTabChange,
  createdUserId,
  toast,
}: {
  activeTab: UsersTabId;
  onTabChange: (tab: UsersTabId) => void;
  createdUserId?: string;
  toast?: string;
}) {
  const highlightRef = useRef<HTMLTableRowElement | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [outletOptions, setOutletOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    toast === 'created' ? 'Pengguna baru berhasil dibuat.' : null,
  );
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | undefined>(createdUserId);

  const canCreate = currentUser ? canCreateUser(currentUser.role) : false;
  const actorRole = currentUser?.role ?? '';
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });
  const [draftFilters, setDraftFilters] = useState<UserFilters>(emptyUserFilters);
  const [appliedFilters, setAppliedFilters] = useState<UserFilters>(emptyUserFilters);

  const activeChips = useMemo(
    () =>
      buildFilterChips([
        {
          key: 'role',
          label: `Role: ${ROLE_FILTER_OPTIONS.find((o) => o.value === appliedFilters.role)?.label ?? appliedFilters.role}`,
          active: Boolean(appliedFilters.role),
        },
        {
          key: 'isActive',
          label: `Status: ${ACTIVE_FILTER_OPTIONS.find((o) => o.value === appliedFilters.isActive)?.label ?? appliedFilters.isActive}`,
          active: Boolean(appliedFilters.isActive),
        },
        {
          key: 'search',
          label: `Cari: ${appliedFilters.search}`,
          active: Boolean(appliedFilters.search.trim()),
        },
      ]),
    [appliedFilters],
  );

  function applyFilters() {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  }

  function resetFilters() {
    const defaults = emptyUserFilters();
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
    setPage(1);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isActiveParam =
        appliedFilters.isActive === 'true' ? true : appliedFilters.isActive === 'false' ? false : undefined;
      const [me, rows, outletsRes] = await Promise.all([
        fetchMe(),
        fetchUsers({
          page,
          limit: pageSize,
          search: appliedFilters.search || undefined,
          role: appliedFilters.role || undefined,
          isActive: isActiveParam,
        }),
        fetchOutlets(),
      ]);
      setCurrentUser(me);
      setUsers(rows.items);
      setMeta(rows.meta);
      const outlets = outletsRes?.outlets ?? [];
      setOutletOptions(outlets.map((o) => ({ id: o.id, label: `${o.name} (${o.code})` })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengguna.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedFilters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!highlightId || loading) return;
    highlightRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => setHighlightId(undefined), 6000);
    return () => window.clearTimeout(timer);
  }, [highlightId, loading, users]);

  function startEdit(user: UserSummary) {
    setEditingId(user.id);
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function toggleActive(user: UserSummary) {
    if (!currentUser || !canDeactivateUser(currentUser.role) || user.role === 'OWNER') return;

    setError(null);
    try {
      if (user.isActive) {
        await deactivateUser(user.id);
        setSuccess(`Pengguna ${user.fullName} dinonaktifkan.`);
      } else {
        await updateUser(user.id, { isActive: true });
        setSuccess(`Pengguna ${user.fullName} diaktifkan kembali.`);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status pengguna.');
    }
  }

  return (
    <div style={{ maxWidth: 1100, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Pengguna & Peran"
        description="Kelola akun staff tenant — bukan member/pelanggan CRM. Pemilik mengelola semua role; Manajer hanya kasir."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Pengguna' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {canCreate ? (
              <Link href="/dashboard/users/new" style={{ textDecoration: 'none' }}>
                <Button type="button" variant="primary">
                  + Tambah Pengguna
                </Button>
              </Link>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => void loadData()} disabled={loading}>
              Muat ulang
            </Button>
          </div>
        }
      />

      <UsersTabs activeTab={activeTab} onTabChange={onTabChange} />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? (
        <AlertBanner variant="success">
          {success}{' '}
          <Link href="/dashboard/users" style={{ fontWeight: 600 }}>
            Lihat daftar pengguna
          </Link>
        </AlertBanner>
      ) : null}

      <ListFilterBar
        selects={[
          {
            id: 'role',
            label: 'Role',
            value: draftFilters.role,
            options: ROLE_FILTER_OPTIONS,
            onChange: (value) => setDraftFilters((prev) => ({ ...prev, role: value })),
          },
          {
            id: 'isActive',
            label: 'Status aktif',
            value: draftFilters.isActive,
            options: ACTIVE_FILTER_OPTIONS,
            onChange: (value) => setDraftFilters((prev) => ({ ...prev, isActive: value })),
          },
        ]}
        showDateRange={false}
        search={draftFilters.search}
        searchPlaceholder="Cari nama atau email…"
        onSearchChange={(value) => setDraftFilters((prev) => ({ ...prev, search: value }))}
        onApply={applyFilters}
        onReset={resetFilters}
        activeChips={activeChips}
      />

      <section style={cardStyle()}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Daftar Pengguna Staff</h3>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : users.length === 0 ? (
          <EmptyState
            title="Belum ada pengguna staff"
            description={
              activeChips.length > 0
                ? FILTER_EMPTY_DESCRIPTION
                : 'Tambahkan akun kasir atau manajer untuk mulai operasional.'
            }
            actionHref={activeChips.length > 0 ? undefined : '/dashboard/users/new'}
            actionLabel={activeChips.length > 0 ? undefined : 'Tambah pengguna'}
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyles.table}>
                <thead>
                  <tr style={tableStyles.headRow}>
                    <th style={tableStyles.th}>Nama</th>
                    <th style={tableStyles.th}>Email</th>
                    <th style={tableStyles.th}>Role</th>
                    <th style={tableStyles.th}>Outlet</th>
                    <th style={tableStyles.th}>Status</th>
                    {canCreate ? <th style={tableStyles.th}>Aksi</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const rowCanEdit = currentUser ? canEditUser(currentUser.role, user.role) : false;
                    const isHighlighted = highlightId === user.id;
                    return editingId === user.id ? (
                      <tr key={user.id} style={tableStyles.row}>
                        <td colSpan={canCreate ? 6 : 5} style={{ ...tableStyles.td, padding: '1rem' }}>
                          <EditUserPanel
                            user={user}
                            actorRole={actorRole}
                            outletOptions={outletOptions}
                            saving={saving}
                            onSavingChange={setSaving}
                            onSuccess={(message) => {
                              setSuccess(message);
                              cancelEdit();
                              void loadData();
                            }}
                            onError={setError}
                            onCancel={cancelEdit}
                          />
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={user.id}
                        ref={isHighlighted ? highlightRef : undefined}
                        style={{
                          ...tableStyles.row,
                          background: isHighlighted ? '#ecfdf5' : undefined,
                          outline: isHighlighted ? '2px solid #22c55e' : undefined,
                        }}
                      >
                        <td style={tableStyles.td}>
                          <span style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {user.fullName}
                            {isHighlighted ? (
                              <StatusBadge label="Baru" variant="success" />
                            ) : null}
                          </span>
                        </td>
                        <td style={tableStyles.td}>{user.email}</td>
                        <td style={tableStyles.td}>
                          <StatusBadge
                            label={USER_ROLE_LABELS[user.role] ?? user.role}
                            variant={roleBadgeVariant(user.role)}
                          />
                        </td>
                        <td style={tableStyles.td}>{user.outlets.map((o) => o.name).join(', ') || '—'}</td>
                        <td style={tableStyles.td}>
                          <StatusBadge label={user.isActive ? 'Aktif' : 'Nonaktif'} variant={user.isActive ? 'success' : 'neutral'} />
                        </td>
                        {canCreate ? (
                          <td style={tableStyles.td}>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {rowCanEdit && user.id !== currentUser?.id ? (
                                <>
                                  <Button type="button" variant="secondary" onClick={() => startEdit(user)}>
                                    Ubah
                                  </Button>
                                  {canDeactivateUser(actorRole) ? (
                                    <Button type="button" variant="ghost" onClick={() => void toggleActive(user)}>
                                      {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                    </Button>
                                  ) : null}
                                </>
                              ) : (
                                '—'
                              )}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
          </>
        )}
      </section>
    </div>
  );
}
