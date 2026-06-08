import { ShiftsPageClient } from '@/components/shifts/ShiftsPageClient';

type PageProps = {
  searchParams: Promise<{ tab?: string; action?: string; outletId?: string }>;
};

export default async function DashboardShiftsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <ShiftsPageClient
      tab={params.tab}
      action={params.action}
      outletIdFromQuery={params.outletId}
      embedded
    />
  );
}
