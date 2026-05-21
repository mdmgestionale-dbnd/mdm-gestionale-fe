'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { apiFetch, apiJson, safeReadText } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';

type Carta = {
  id?: number;
  nome: string;
  numeroCarta: string;
  cvv?: string;
  scadenza?: string;
  note?: string;
};

const emptyCarta: Carta = { nome: '', numeroCarta: '', cvv: '', scadenza: '', note: '' };

function formatDate(value?: string) {
  if (!value) return 'Non inserita';
  return new Date(`${value}T00:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCardNumber(value: string) {
  return value.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}

export default function CarteComponent() {
  const { user } = useCurrentUser();
  const canWrite = ['ADMIN', 'SUPERVISORE'].includes((user?.role || '').toUpperCase());
  const [items, setItems] = useState<Carta[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Carta | null>(null);
  const [form, setForm] = useState<Carta>(emptyCarta);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setItems(await apiJson<Carta[]>('/api/carte'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => !q || `${item.nome} ${item.numeroCarta} ${item.note || ''}`.toLowerCase().includes(q));
  }, [items, query]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyCarta);
    setOpen(true);
  };

  const openEdit = (item: Carta) => {
    setEditing(item);
    setForm({ ...item });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setForm(emptyCarta);
  };

  const save = async () => {
    if (!form.nome.trim() || !form.numeroCarta.trim()) return alert('Nome e numero carta sono obbligatori');
    setLoading(true);
    try {
      const res = await apiFetch(editing?.id ? `/api/carte/${editing.id}` : '/api/carte', {
        method: editing?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          numeroCarta: form.numeroCarta.trim(),
          cvv: form.cvv?.trim() || null,
          scadenza: form.scadenza || null,
          note: form.note?.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await safeReadText(res)) || 'Errore salvataggio carta');
      closeDialog();
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore salvataggio carta');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (item: Carta) => {
    if (!item.id || !confirm(`Eliminare la carta ${item.nome}?`)) return;
    const res = await apiFetch(`/api/carte/${item.id}`, { method: 'DELETE' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore eliminazione carta');
    await load();
  };

  return (
    <Stack spacing={2} sx={{ pb: { xs: 8, md: 0 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="h5" fontWeight={800}>Carte</Typography>
            <Typography color="text.secondary">Archivio carte aziendali visibile ai dipendenti.</Typography>
          </Box>
          {canWrite && <Button variant="contained" startIcon={<Add />} onClick={openNew}>Nuova carta</Button>}
        </Stack>
        <TextField size="small" label="Cerca carta" value={query} onChange={(e) => setQuery(e.target.value)} fullWidth sx={{ mt: 2 }} />
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        {filtered.map((item) => (
          <Paper key={item.id} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Stack spacing={1.2}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography variant="h6" fontWeight={900}>{item.nome}</Typography>
                  <Typography sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>{formatCardNumber(item.numeroCarta)}</Typography>
                </Box>
                {canWrite && (
                  <Stack direction="row" spacing={0.5}>
                    <Button size="small" startIcon={<Edit />} onClick={() => openEdit(item)}>Modifica</Button>
                    <Button size="small" color="error" startIcon={<Delete />} onClick={() => remove(item)}>Elimina</Button>
                  </Stack>
                )}
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Typography variant="body2"><strong>CVV:</strong> {item.cvv || '-'}</Typography>
                <Typography variant="body2"><strong>Scadenza:</strong> {formatDate(item.scadenza)}</Typography>
              </Stack>
              {item.note && <Alert severity="info">{item.note}</Alert>}
            </Stack>
          </Paper>
        ))}
      </Box>
      {filtered.length === 0 && <Alert severity="info">Nessuna carta trovata.</Alert>}

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm" fullScreen={typeof window !== 'undefined' && window.innerWidth < 700}>
        <DialogTitle>{editing ? 'Modifica carta' : 'Nuova carta'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Nome" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} fullWidth />
          <TextField label="Numero carta" value={form.numeroCarta} onChange={(e) => setForm((p) => ({ ...p, numeroCarta: e.target.value }))} fullWidth />
          <TextField label="CVV" value={form.cvv || ''} onChange={(e) => setForm((p) => ({ ...p, cvv: e.target.value }))} fullWidth />
          <TextField type="date" label="Scadenza" value={form.scadenza || ''} onChange={(e) => setForm((p) => ({ ...p, scadenza: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField multiline minRows={3} label="Note" value={form.note || ''} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annulla</Button>
          <Button variant="contained" onClick={save} disabled={loading}>{loading ? 'Salvataggio...' : 'Salva'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
