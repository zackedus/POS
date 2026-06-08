'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/dashboard-ui';
import { DepositsPanel } from '@/components/dashboard/finance/DepositsPanel';
import { ExpensesPanel } from '@/components/dashboard/finance/ExpensesPanel';
import { FinanceSummaryPanel } from '@/components/dashboard/finance/FinanceSummaryPanel';
import { PayablesPanel } from '@/components/dashboard/finance/PayablesPanel';
import { ReceivableAgingPanel } from '@/components/dashboard/finance/ReceivableAgingPanel';
import { ReceivablesPanel } from '@/components/dashboard/finance/ReceivablesPanel';
import {
  FinanceTabs,
  financeTabHref,
  parseFinanceTab,
  type FinanceTabId,
} from '@/components/dashboard/finance/finance-ui';

export function FinancePageClient({ tab, status }: { tab?: string; status?: string }) {
  const router = useRouter();
  const activeTab = parseFinanceTab(tab);

  const setTab = useCallback(
    (nextTab: FinanceTabId) => {
      router.push(financeTabHref(nextTab));
    },
    [router],
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Keuangan"
        description="Posisi piutang, utang, deposit, pengeluaran, dan arus kas — hub terpadu AR/AP."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Keuangan' },
        ]}
      />

      <FinanceTabs activeTab={activeTab} onTabChange={setTab} />

      {activeTab === 'ringkasan' ? <FinanceSummaryPanel onNavigate={setTab} /> : null}
      {activeTab === 'piutang' ? <ReceivablesPanel embedded initialStatus={status} /> : null}
      {activeTab === 'utang' ? <PayablesPanel embedded initialStatus={status} /> : null}
      {activeTab === 'aging' ? <ReceivableAgingPanel embedded /> : null}
      {activeTab === 'deposit' ? <DepositsPanel embedded /> : null}
      {activeTab === 'pengeluaran' ? <ExpensesPanel embedded /> : null}
    </div>
  );
}
