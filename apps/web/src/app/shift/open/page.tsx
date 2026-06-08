import { redirect } from 'next/navigation';

type PageProps = {
  searchParams: Promise<{ outletId?: string }>;
};

export default async function OpenShiftRedirect({ searchParams }: PageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams({ action: 'open' });
  if (params.outletId) qs.set('outletId', params.outletId);
  redirect(`/shift?${qs.toString()}`);
}
