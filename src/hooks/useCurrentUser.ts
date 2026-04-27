'use client';

import { useEffect, useState } from 'react';
import { apiFetch, CurrentUser } from '@/lib/api';

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch('/auth/me', { method: 'GET' });
        if (!active) return;

        if (res.status === 401) {
          setUser(null);
          setError('UNAUTHORIZED');
          return;
        }

        if (!res.ok) {
          setError(`HTTP_${res.status}`);
          return;
        }

        const data = (await res.json()) as CurrentUser;
        setUser(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { user, loading, error };
}

export function hasRole(user: CurrentUser | null, roles: string[]): boolean {
  if (!user?.role) return false;
  return roles.includes(user.role.toUpperCase());
}
