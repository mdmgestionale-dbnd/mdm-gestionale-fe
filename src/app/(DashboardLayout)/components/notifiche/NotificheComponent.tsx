'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertColor, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { apiFetch, apiJson, safeReadText } from '@/lib/api';
import { useBroadcastRefresh } from '@/hooks/useBroadcastRefresh';
import { useCurrentUser } from '@/hooks/useCurrentUser';

type Notifica = {
  id: number;
  tipo?: string;
  titolo?: string;
  messaggio?: string;
  livello?: string;
  letta?: boolean;
  destinatarioId?: number | null;
  dataScadenza?: string;
  createdAt?: string;
};

function severity(level?: string): AlertColor {
  if (level === 'ERROR') return 'error';
  if (level === 'WARN') return 'warning';
  return 'info';
}

function isDeadline(n: Notifica) {
  return Boolean(n.dataScadenza || n.tipo?.startsWith('SCADENZA_'));
}

export default function NotificheComponent() {
  const { user } = useCurrentUser();
  const role = (user?.role || '').toUpperCase();
  const canAdmin = ['ADMIN', 'SUPERVISORE'].includes(role);
  const [items, setItems] = useState<Notifica[]>([]);

  const load = useCallback(async () => {
    setItems(await apiJson<Notifica[]>('/api/notifiche?soloNonLette=true'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useBroadcastRefresh(load);

  const counts = useMemo(() => ({
    error: items.filter((n) => n.livello === 'ERROR').length,
    warn: items.filter((n) => n.livello === 'WARN').length,
    unread: items.filter((n) => !n.letta).length,
  }), [items]);

  const markRead = async (id: number) => {
    const res = await apiFetch(`/api/notifiche/${id}/read`, { method: 'PUT' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore aggiornamento notifica');
    await load();
  };

  const markAll = async () => {
    if (role === 'ADMIN' && !confirm('Eliminare tutte le notifiche operative?\n\nLe scadenze dei veicoli resteranno visibili finche non aggiorni la relativa scadenza.')) return;
    const res = await apiFetch('/api/notifiche/read-all', { method: 'PUT' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore aggiornamento notifiche');
    await load();
  };

  const remove = async (id: number) => {
    const res = await apiFetch(`/api/notifiche/${id}`, { method: 'DELETE' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore eliminazione notifica');
    await load();
  };

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <div>
            <Typography variant="h5" fontWeight={700}>Notifiche</Typography>
            <Typography variant="body2" color="text.secondary">Avvisi operativi, richieste da gestire e scadenze ancora attive.</Typography>
          </div>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={`${counts.error} urgenti`} color={counts.error ? 'error' : 'default'} />
            <Chip label={`${counts.warn} avvisi`} color={counts.warn ? 'warning' : 'default'} />
            <Chip label={`${counts.unread} nuove`} color={counts.unread ? 'primary' : 'default'} />
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
          {role === 'ADMIN' && <Button startIcon={<Delete />} onClick={markAll}>Elimina tutto</Button>}
        </Stack>
      </Paper>

      <Stack spacing={1.2}>
        {items.map((n) => (
          <Alert
            key={n.id}
            severity={severity(n.livello)}
            sx={{ borderRadius: 2, alignItems: 'flex-start' }}
            action={
              <Stack direction="row" spacing={1}>
                {!n.letta && !isDeadline(n) && (!n.destinatarioId || n.destinatarioId === user?.id) && <Button size="small" onClick={() => markRead(n.id)}>Rimuovi</Button>}
                {canAdmin && !isDeadline(n) && !n.destinatarioId && <Button size="small" color="inherit" startIcon={<Delete />} onClick={() => remove(n.id)}>Elimina</Button>}
              </Stack>
            }
          >
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography fontWeight={700}>{n.titolo || n.tipo || 'Notifica'}</Typography>
                {isDeadline(n) && <Chip size="small" label="Scadenza attiva" />}
                {!n.letta && <Chip size="small" label="Da leggere" color="primary" />}
              </Stack>
              <Typography>{n.messaggio || '-'}</Typography>
              {n.createdAt && <Typography variant="caption" color="text.secondary">{new Date(n.createdAt).toLocaleString('it-IT')}</Typography>}
            </Stack>
          </Alert>
        ))}
        {items.length === 0 && <Alert severity="success">Nessuna notifica da mostrare.</Alert>}
      </Stack>
    </Stack>
  );
}
