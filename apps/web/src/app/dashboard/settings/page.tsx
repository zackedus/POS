import { SettingsPageClient } from './SettingsPageClient';

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <SettingsPageClient tab={params.tab} />;
}
