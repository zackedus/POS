'use client';

import { formatCurrencyIDR, type FinanceReportBreakdownSection } from '@barokah/shared';
import { SectionCard } from '@/components/dashboard/dashboard-ui';
import { PAYMENT_METHOD_LABELS } from '@/lib/reports';

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operasional',
  LOADING_UNLOADING: 'Bongkar Muat',
  SHIPPING: 'Pengiriman',
  OTHER: 'Lainnya',
};

function resolveLabel(label: string): string {
  return PAYMENT_METHOD_LABELS[label] ?? EXPENSE_CATEGORY_LABELS[label] ?? label;
}

function formatQuantity(value?: number): string {
  if (value == null) return '—';
  return Number.isInteger(value) ? String(value) : value.toLocaleString('id-ID', { maximumFractionDigits: 3 });
}

export interface FinanceReportBreakdownTableProps {
  section: FinanceReportBreakdownSection;
  showDueDate?: boolean;
  showStatus?: boolean;
  showReference?: boolean;
  showQuantity?: boolean;
  showCount?: boolean;
  showPercentage?: boolean;
  compact?: boolean;
}

export function FinanceReportBreakdownTable({
  section,
  showDueDate = false,
  showStatus = false,
  showReference = false,
  showQuantity = false,
  showCount = false,
  showPercentage = false,
  compact = false,
}: FinanceReportBreakdownTableProps) {
  const hasRows = section.rows.length > 0;
  const fontSize = compact ? '0.8125rem' : '0.875rem';
  const showQtyCol = showQuantity || section.rows.some((row) => row.quantity != null);
  const showCntCol = showCount || section.rows.some((row) => row.count != null);
  const showPctCol = showPercentage || section.rows.some((row) => row.percentage != null);
  const showRefCol = showReference || section.rows.some((row) => row.referenceNo);
  const showDueCol = showDueDate || section.rows.some((row) => row.dueDate);
  const showStatusCol = showStatus || section.rows.some((row) => row.status);

  return (
    <SectionCard title={section.title}>
      {!hasRows ? (
        <p style={{ margin: 0, fontSize, color: '#64748b' }}>
          {section.emptyMessage ?? 'Tidak ada data pada periode ini'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            data-testid={`breakdown-section-${section.title}`}
            style={{ width: '100%', borderCollapse: 'collapse', fontSize }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>Keterangan</th>
                {showRefCol ? (
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>No. Ref</th>
                ) : null}
                {showQtyCol ? <th style={{ padding: '0.5rem', textAlign: 'right' }}>Qty</th> : null}
                {showCntCol ? <th style={{ padding: '0.5rem', textAlign: 'right' }}>Jumlah</th> : null}
                {showDueCol ? <th style={{ padding: '0.5rem', textAlign: 'left' }}>Jatuh Tempo</th> : null}
                {showStatusCol ? <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th> : null}
                {showPctCol ? <th style={{ padding: '0.5rem', textAlign: 'right' }}>%</th> : null}
                <th style={{ padding: '0.5rem 0 0.5rem 0.5rem', textAlign: 'right' }}>Nominal</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, index) => (
                <tr
                  key={`${row.label}-${row.referenceNo ?? index}`}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: index % 2 === 1 ? '#f8fafc' : 'transparent',
                  }}
                >
                  <td style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>
                    <div style={{ fontWeight: 500 }}>{resolveLabel(row.label)}</div>
                    {row.subLabel ? (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.subLabel}</div>
                    ) : null}
                  </td>
                  {showRefCol ? (
                    <td style={{ padding: '0.5rem', color: '#475569' }}>{row.referenceNo ?? '—'}</td>
                  ) : null}
                  {showQtyCol ? (
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatQuantity(row.quantity)}
                    </td>
                  ) : null}
                  {showCntCol ? (
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {row.count ?? '—'}
                    </td>
                  ) : null}
                  {showDueCol ? (
                    <td style={{ padding: '0.5rem', color: '#475569' }}>{row.dueDate ?? '—'}</td>
                  ) : null}
                  {showStatusCol ? (
                    <td style={{ padding: '0.5rem', color: '#475569' }}>{row.status ?? '—'}</td>
                  ) : null}
                  {showPctCol ? (
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {row.percentage != null ? `${row.percentage}%` : '—'}
                    </td>
                  ) : null}
                  <td
                    style={{
                      padding: '0.5rem 0 0.5rem 0.5rem',
                      textAlign: 'right',
                      fontWeight: 500,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCurrencyIDR(row.amount)}
                  </td>
                </tr>
              ))}
              {section.subtotal != null ? (
                <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                  <td
                    colSpan={
                      1 +
                      (showRefCol ? 1 : 0) +
                      (showQtyCol ? 1 : 0) +
                      (showCntCol ? 1 : 0) +
                      (showDueCol ? 1 : 0) +
                      (showStatusCol ? 1 : 0) +
                      (showPctCol ? 1 : 0)
                    }
                    style={{ padding: '0.625rem 0.5rem 0.625rem 0', fontWeight: 700 }}
                  >
                    Subtotal
                  </td>
                  <td
                    style={{
                      padding: '0.625rem 0 0.625rem 0.5rem',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCurrencyIDR(section.subtotal)}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export function FinanceReportBreakdownSections({
  sections,
  ...tableProps
}: {
  sections: FinanceReportBreakdownSection[];
} & Omit<FinanceReportBreakdownTableProps, 'section'>) {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {sections.map((section) => (
        <FinanceReportBreakdownTable key={section.title} section={section} {...tableProps} />
      ))}
    </div>
  );
}
