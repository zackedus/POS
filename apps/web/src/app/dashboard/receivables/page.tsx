import { redirect } from 'next/navigation';

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function ReceivablesRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = new URLSearchParams({ tab: 'piutang' });
  if (params.status) query.set('status', params.status);
  redirect(`/dashboard/finance?${query.toString()}`);
}
