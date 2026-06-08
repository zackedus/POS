import { UsersPageClient } from './UsersPageClient';

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <UsersPageClient tab={params.tab} />;
}
