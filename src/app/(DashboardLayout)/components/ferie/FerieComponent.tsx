'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
import { apiFetch, apiJson, safeReadText } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useBroadcastRefresh } from '@/hooks/useBroadcastRefresh';

type Permesso = {
  id: number;
  tipo: string;
  stato: 'IN_ATTESA' | 'APPROVATO' | 'RIFIUTATO' | string;
  startDate: string;
  endDate: string;
  note?: string;
  utente?: { id: number; username: string; nome?: string; cognome?: string };
  approvatoDa?: { id: number; username: string };
  approvatoAt?: string;
};

const defaultRequest = { tipo: 'FERIE', startDate: '', endDate: '', note: '' };

function nameOf(p: Permesso) {
  if (!p.utente) return '-';
  return `${p.utente.nome || ''} ${p.utente.cognome || ''}`.trim() || p.utente.username;
}

function statusColor(stato: string): 'success' | 'error' | 'warning' | 'default' {
  if (stato === 'APPROVATO') return 'success';
  if (stato === 'RIFIUTATO') return 'error';
  if (stato === 'IN_ATTESA') return 'warning';
  return 'default';
}

export default function FerieComponent() {
  const { user } = useCurrentUser();
  const role = (user?.role || '').toUpperCase();
  const isAdminLike = role === 'ADMIN' || role === 'SUPERVISORE';
  const [mine, setMine] = useState<Permesso[]>([]);
  const [all, setAll] = useState<Permesso[]>([]);
  const [pending, setPending] = useState<Permesso[]>([]);
  const [openRequest, setOpenRequest] = useState(false);
  const [requestForm, setRequestForm] = useState(defaultRequest);
  const [decisionNote, setDecisionNote] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (isAdminLike) {
      const allData = await apiJson<Permesso[]>('/api/permesso');
      setAll(allData);
      setPending(allData.filter((p) => p.stato === 'IN_ATTESA'));
      setMine(allData.filter((p) => p.utente?.id === user?.id));
      return;
    }
    const mineData = await apiJson<Permesso[]>('/api/permesso/mine');
    setMine(mineData);
    setAll([]);
    setPending([]);
  }, [isAdminLike, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useBroadcastRefresh(load);

  const sortedMine = useMemo(() => [...mine].sort((a, b) => b.id - a.id), [mine]);
  const storico = useMemo(
    () => all.filter((p) => p.stato !== 'IN_ATTESA').sort((a, b) => b.id - a.id).slice(0, 20),
    [all],
  );

  const submitRequest = async () => {
    if (!requestForm.startDate || !requestForm.endDate) return alert('Inserisci le date della richiesta');
    setLoading(true);
    try {
      const res = await apiFetch('/api/permesso/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestForm),
      });
      if (!res.ok) throw new Error((await safeReadText(res)) || 'Errore invio richiesta');
      setOpenRequest(false);
      setRequestForm(defaultRequest);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Errore invio richiesta');
    } finally {
      setLoading(false);
    }
  };

  const decide = async (id: number, approva: boolean) => {
    const res = await apiFetch(`/api/permesso/${id}/decision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approva, note: decisionNote[id] || '' }),
    });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore decisione richiesta');
    setDecisionNote((prev) => ({ ...prev, [id]: '' }));
    await load();
  };

  const Card = ({ p, admin = false }: { p: Permesso; admin?: boolean }) => (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Typography fontWeight={800}>{admin ? nameOf(p) : p.tipo}</Typography>
          <Chip size="small" label={p.stato.replace('_', ' ')} color={statusColor(p.stato)} />
        </Stack>
        {admin && <Typography variant="body2" color="text.secondary">{p.tipo}</Typography>}
        <Typography>{p.startDate} - {p.endDate}</Typography>
        {p.note && <Typography variant="body2" color="text.secondary">{p.note}</Typography>}
        {admin && p.stato === 'IN_ATTESA' && (
          <Stack spacing={1}>
            <TextField size="small" label="Nota decisione" value={decisionNote[p.id] || ''} onChange={(e) => setDecisionNote((prev) => ({ ...prev, [p.id]: e.target.value }))} />
            <Stack direction="row" spacing={1}>
              <Button color="success" variant="contained" onClick={() => decide(p.id, true)} disabled={loading}>Approva</Button>
              <Button color="error" variant="outlined" onClick={() => decide(p.id, false)} disabled={loading}>Rifiuta</Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Paper>
  );

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
          <div>
            <Typography variant="h5" fontWeight={700}>Ferie, malattie e permessi</Typography>
            <Typography variant="body2" color="text.secondary">Richieste personali e approvazioni amministrative.</Typography>
          </div>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenRequest(true)}>Nuova richiesta</Button>
        </Stack>
      </Paper>

      {isAdminLike && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={700} mb={1}>Da approvare</Typography>
          <Stack spacing={1}>{pending.map((p) => <Card key={p.id} p={p} admin />)}{pending.length === 0 && <Alert severity="success">Nessuna richiesta in attesa.</Alert>}</Stack>
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} mb={1}>Le mie richieste</Typography>
        <Stack spacing={1}>{sortedMine.map((p) => <Card key={p.id} p={p} />)}{sortedMine.length === 0 && <Alert severity="info">Nessuna richiesta inviata.</Alert>}</Stack>
      </Paper>

      {isAdminLike && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={700} mb={1}>Storico</Typography>
          <Stack spacing={1}>{storico.map((p) => <Card key={p.id} p={p} admin />)}{storico.length === 0 && <Alert severity="info">Nessuna richiesta conclusa nello storico.</Alert>}</Stack>
        </Paper>
      )}

      <Dialog open={openRequest} onClose={() => setOpenRequest(false)} fullWidth maxWidth="sm" fullScreen={typeof window !== 'undefined' && window.innerWidth < 700}>
        <DialogTitle>Nuova richiesta</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Select value={requestForm.tipo} onChange={(e) => setRequestForm((p) => ({ ...p, tipo: e.target.value }))} fullWidth size="small">
            <MenuItem value="FERIE">Ferie</MenuItem>
            <MenuItem value="MALATTIA">Malattia</MenuItem>
            <MenuItem value="PERMESSO">Permesso</MenuItem>
          </Select>
          <TextField type="date" label="Dal" value={requestForm.startDate} onChange={(e) => setRequestForm((p) => ({ ...p, startDate: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField type="date" label="Al" value={requestForm.endDate} onChange={(e) => setRequestForm((p) => ({ ...p, endDate: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField multiline minRows={3} label="Note" value={requestForm.note} onChange={(e) => setRequestForm((p) => ({ ...p, note: e.target.value }))} fullWidth />
          <Alert severity="info">Se approvata, la richiesta rimuove automaticamente il dipendente dai task sovrapposti.</Alert>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenRequest(false)}>Annulla</Button><Button variant="contained" onClick={submitRequest} disabled={loading}>Invia</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
