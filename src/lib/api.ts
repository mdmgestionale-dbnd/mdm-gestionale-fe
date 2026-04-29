export function getBackendUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_BACKEND_URL non configurata');
  }
  return url.replace(/\/$/, '');
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const backendUrl = getBackendUrl();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mdm-api-loading', { detail: { delta: 1 } }));
  }
  try {
    return await fetch(`${backendUrl}${path}`, {
      credentials: 'include',
      ...init,
    });
  } finally {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mdm-api-loading', { detail: { delta: -1 } }));
    }
  }
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

export type CurrentUser = {
  id: number;
  username: string;
  role: 'ADMIN' | 'SUPERVISORE' | 'DIPENDENTE' | string;
  nome?: string;
  cognome?: string;
};
