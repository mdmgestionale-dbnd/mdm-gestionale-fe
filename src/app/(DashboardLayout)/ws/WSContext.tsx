'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';

type WSContextType = {
  wsConnesso: boolean;
  subscribe: (cb: (msg: IMessage) => void) => () => void;
};

const WSContext = createContext<WSContextType | undefined>(undefined);

export const WSProvider = ({ children }: { children: React.ReactNode }) => {
  const [wsConnesso, setWsConnesso] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const subscribersRef = useRef<((msg: IMessage) => void)[]>([]);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!backendUrl) return;

    const client = new Client({
      brokerURL: undefined, // usiamo SockJS
      webSocketFactory: () => new SockJS(`${backendUrl.replace(/\/$/, '')}/ws`),
      reconnectDelay: 5000,
      debug: () => {}, // togli log in produzione
    });

    client.onConnect = () => {
      setWsConnesso(true);

      // sottoscrizione al topic unico broadcast - inoltra a tutti i subscriber
      client.subscribe('/topic/broadcast', (msg: IMessage) => {
        subscribersRef.current.forEach((cb) => cb(msg));
      });

      // al connect forziamo un REFRESH "locale" ai subscriber (in modo che la UI ricarichi
      // i dati se si era scollegata / è tornata in foreground)
      const fakeMsg = { body: JSON.stringify({ tipoEvento: 'REFRESH' }) } as IMessage;
      subscribersRef.current.forEach((cb) => {
        try { cb(fakeMsg); } catch (e) { /* swallow */ }
      });
    };

    client.onWebSocketClose = () => setWsConnesso(false);
    client.onStompError = () => setWsConnesso(false);

    client.activate();
    clientRef.current = client;

    return () => {
      try { clientRef.current?.deactivate(); } catch (e) {}
      clientRef.current = null;
      setWsConnesso(false);
    };
  }, [backendUrl]);

  const subscribe = (cb: (msg: IMessage) => void) => {
    subscribersRef.current.push(cb);
    return () => {
      subscribersRef.current = subscribersRef.current.filter((fn) => fn !== cb);
    };
  };

  return (
    <WSContext.Provider value={{ wsConnesso, subscribe }}>
      {children}
    </WSContext.Provider>
  );
};

export const useWS = (): WSContextType => {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error('useWS must be used within WSProvider');
  return ctx;
};
