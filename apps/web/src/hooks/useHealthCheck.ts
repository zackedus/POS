'use client';

import { useEffect, useState } from 'react';
import type { ApiSuccessResponse } from '@barokah/shared';
import { apiConfig } from '@/lib/api';

interface HealthData {
  status: string;
  timestamp: string;
  services: { api: string };
}

export function useHealthCheck() {
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(apiConfig.healthUrl)
      .then((res) => res.json())
      .then((body: ApiSuccessResponse<HealthData>) => {
        if (!cancelled) {
          setOnline(body.success && body.data.status === 'ok');
        }
      })
      .catch(() => {
        if (!cancelled) setOnline(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, online };
}
