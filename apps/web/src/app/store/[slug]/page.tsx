'use client';

import { useParams } from 'next/navigation';
import { StoreHome } from '@/components/store/StoreHome';

export default function StoreHomePage() {
  const params = useParams();
  const slug = params.slug as string;
  return <StoreHome slug={slug} />;
}
