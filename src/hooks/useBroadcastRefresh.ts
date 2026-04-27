'use client';

import { useEffect } from 'react';
import { IMessage } from '@stomp/stompjs';
import { useWS } from '@/app/(DashboardLayout)/ws/WSContext';

export function useBroadcastRefresh(onRefresh: () => void) {
  const { subscribe } = useWS();

  useEffect(() => {
    const unsubscribe = subscribe((msg: IMessage) => {
      try {
        const payload = msg.body ? JSON.parse(msg.body) : {};
        const tipo = payload.tipoEvento ?? payload.tipo ?? payload.eventType;
        if (!tipo || ['REFRESH', 'MSG_REFRESH', 'ENTITY_CHANGED', 'NOTIFICATION'].includes(String(tipo).toUpperCase())) {
          onRefresh();
          return;
        }

        // fallback: molti messaggi includono payload JSON serializzato
        if (payload.payload) {
          onRefresh();
        }
      } catch {
        // qualsiasi messaggio non parsabile => refresh conservativo
        onRefresh();
      }
    });
    return () => unsubscribe();
  }, [subscribe, onRefresh]);
}
