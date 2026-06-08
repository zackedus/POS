'use client';

import Link from 'next/link';
import { cardStyle, PageHeader } from '@/components/dashboard/dashboard-ui';
import { useAdminTheme } from '@/hooks/useAdminTheme';

type AdminSection = {
  href: string;
  title: string;
  description: string;
  icon: string;
  roles: 'owner-manager';
};

const SECTIONS: AdminSection[] = [
  {
    href: '/dashboard/users',
    title: 'Pengguna & RBAC',
    description: 'CRUD staff, role owner/manajer/kasir, assign cabang, reset password, aktif/nonaktif.',
    icon: '◉',
    roles: 'owner-manager',
  },
  {
    href: '/dashboard/customers',
    title: 'Member & Pelanggan',
    description: 'Daftar member, poin loyalty, riwayat transaksi, daftar walk-in oleh staff.',
    icon: '★',
    roles: 'owner-manager',
  },
  {
    href: '/dashboard/settings',
    title: 'Pengaturan Aplikasi',
    description: 'PPN, loyalty, pembayaran Midtrans, promo, storefront online.',
    icon: '⚙',
    roles: 'owner-manager',
  },
  {
    href: '/dashboard/store',
    title: 'Profil Toko',
    description: 'Nama toko, kontak, logo, preview slug storefront publik.',
    icon: '⌂',
    roles: 'owner-manager',
  },
  {
    href: '/dashboard/outlets',
    title: 'Cabang',
    description: 'Kelola outlet multi-cabang, set default, assign staff.',
    icon: '▣',
    roles: 'owner-manager',
  },
  {
    href: '/dashboard/integrations',
    title: 'Integrasi & API',
    description: 'Midtrans sandbox, webhook URL, QRIS mock, dokumentasi error codes.',
    icon: '⇄',
    roles: 'owner-manager',
  },
];

export default function AdminHubPage() {
  const { tokens } = useAdminTheme();

  return (
    <div style={{ maxWidth: 960 }}>
      <PageHeader
        title="Pusat Admin"
        description="Kelola pengguna, member, pengaturan toko, cabang, dan integrasi dari satu tempat. Hanya Pemilik & Manajer."
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            style={{
              ...cardStyle({
                background: tokens.cardBg,
                border: `1px solid ${tokens.cardBorder}`,
                textDecoration: 'none',
                color: tokens.text,
                display: 'block',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }),
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span
                aria-hidden
                style={{
                  fontSize: '1.5rem',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  background: '#f0fdf4',
                  color: '#16a34a',
                }}
              >
                {section.icon}
              </span>
              <div>
                <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.0625rem' }}>{section.title}</h2>
                <p style={{ margin: 0, fontSize: '0.875rem', color: tokens.muted, lineHeight: 1.45 }}>
                  {section.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <section
        style={cardStyle({
          background: tokens.cardBg,
          border: `1px solid ${tokens.cardBorder}`,
          marginTop: '1.25rem',
        })}
      >
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Catatan keamanan</h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: tokens.muted, lineHeight: 1.6 }}>
          <li>
            <strong>Akun staff admin</strong> (Owner/Manager/Kasir) hanya dibuat oleh Pemilik atau Manajer di dashboard —
            tidak ada self-register admin publik.
          </li>
          <li>
            <strong>Member/pelanggan</strong> dapat mendaftar di storefront{' '}
            <code style={{ fontSize: '0.8125rem' }}>/store/[slug]/register</code> untuk program loyalty.
          </li>
          <li>Kasir tidak dapat mengakses halaman admin ini.</li>
        </ul>
      </section>
    </div>
  );
}
