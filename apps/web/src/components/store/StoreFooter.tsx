'use client';

import { colors } from '@barokah/ui';
import { useStoreConfig } from '@/lib/store/store-config-context';

export function StoreFooter() {
  const { config } = useStoreConfig();
  if (!config) return null;

  const { tenant, settings } = config;
  const wa = tenant.whatsapp?.replace(/\D/g, '');

  return (
    <footer
      style={{
        marginTop: '1.5rem',
        padding: '1rem 0.875rem 1.5rem',
        borderTop: `1px solid ${colors.light.border.default}`,
        fontSize: '0.8125rem',
        color: colors.light.text.secondary,
        display: 'grid',
        gap: '0.35rem',
      }}
    >
      <strong style={{ color: colors.light.text.primary }}>{tenant.name}</strong>
      {tenant.contactPhone ? <span>Telp: {tenant.contactPhone}</span> : null}
      {wa ? (
        <a href={`https://wa.me/${wa.startsWith('0') ? `62${wa.slice(1)}` : wa}`} target="_blank" rel="noopener noreferrer" style={{ color: settings.appearance.accentColor }}>
          WhatsApp
        </a>
      ) : null}
      <span>{settings.appearance.footerText}</span>
    </footer>
  );
}
