'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // La PWA non deve mai bloccare l'uso del gestionale.
    });
  }, []);

  return null;
}
