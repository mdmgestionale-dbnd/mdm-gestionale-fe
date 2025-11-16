import { useEffect, useRef, useCallback } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

type Sub = { topic: string; onMessage: (msg: any) => void };

export function useStomp(backendUrl: string, subs: Sub[]) {
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const sock = new SockJS(`${backendUrl}/ws`);
    const client = new Client({
      webSocketFactory: () => sock as any,
      reconnectDelay: 3000,
      onConnect: () => {
        subs.forEach(({ topic, onMessage }) => {
          client.subscribe(topic, (frame: IMessage) => {
            try {
              onMessage(JSON.parse(frame.body));
            } catch {
              onMessage(frame.body);
            }
          });
        });
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [backendUrl, JSON.stringify(subs)]);

  const publish = useCallback((destination: string, body: any) => {
    if (!clientRef.current || !clientRef.current.connected) return;
    clientRef.current.publish({
      destination,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }, []);

  return { publish };
}
