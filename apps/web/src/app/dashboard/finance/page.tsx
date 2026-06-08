import { FinancePageClient } from './FinancePageClient';

type PageProps = {
  searchParams: Promise<{ tab?: string; status?: string }>;
};

export default async function FinancePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <FinancePageClient tab={params.tab} status={params.status} />;
}
