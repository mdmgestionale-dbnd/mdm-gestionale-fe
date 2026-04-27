'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Delete, Edit, ExpandLess, ExpandMore } from '@mui/icons-material';
import { apiFetch, apiJson, safeReadText } from '@/lib/api';
import { useBroadcastRefresh } from '@/hooks/useBroadcastRefresh';
import { useCurrentUser } from '@/hooks/useCurrentUser';

type Veicolo = {
  id?: number;
  targa: string;
  marca?: string;
  modello?: string;
  scadenzaAssicurazione?: string | null;
  scadenzaRevisione?: string | null;
  scadenzaBollo?: string | null;
  isDeleted?: boolean;
};

const emptyForm: Veicolo = {
  targa: '',
  marca: '',
  modello: '',
  scadenzaAssicurazione: null,
  scadenzaRevisione: null,
  scadenzaBollo: null,
};

function daysTo(date?: string | null): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function deadlineColor(date?: string | null): 'error' | 'warning' | 'success' | 'default' {
  const days = daysTo(date);
  if (days === null) return 'default';
  if (days < 0) return 'error';
  if (days <= 30) return 'warning';
  return 'success';
}

function deadlineLabel(label: string, date?: string | null) {
  const days = daysTo(date);
  if (!date || days === null) return `${label}: non inserita`;
  if (days < 0) return `${label}: scaduta`;
  if (days === 0) return `${label}: oggi`;
  return `${label}: ${days} giorni`;
}

export default function VeicoliComponent() {
  const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
  const [deletedVeicoli, setDeletedVeicoli] = useState<Veicolo[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<Veicolo | null>(null);
  const [renewing, setRenewing] = useState<Veicolo | null>(null);
  const [form, setForm] = useState<Veicolo>(emptyForm);
  const [renewType, setRenewType] = useState<'assicurazione' | 'revisione' | 'bollo'>('assicurazione');
  const [renewDate, setRenewDate] = useState(new Date().toISOString().slice(0, 10));
  const [renewDuration, setRenewDuration] = useState<'6' | '12'>('12');
  const [loading, setLoading] = useState(false);
  const { user } = useCurrentUser();
  const canWrite = (user?.role || '').toUpperCase() !== 'DIPENDENTE';

  const load = useCallback(async () => {
    try {
      const data = await apiJson<Veicolo[]>('/api/veicolo?includeDeleted=true');
      setVeicoli(data.filter((v) => !v.isDeleted));
      setDeletedVeicoli(data.filter((v) => v.isDeleted));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Errore caricamento veicoli');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useBroadcastRefresh(load);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return veicoli.filter((v) => !q || [v.targa, v.marca, v.modello].some((x) => (x || '').toLowerCase().includes(q)));
  }, [veicoli, query]);

  const urgentCount = veicoli.filter((v) => ['error', 'warning'].includes(deadlineColor(v.scadenzaAssicurazione)) || ['error', 'warning'].includes(deadlineColor(v.scadenzaRevisione)) || ['error', 'warning'].includes(deadlineColor(v.scadenzaBollo))).length;

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item: Veicolo) => {
    setEditing(item);
    setForm({ ...item });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.targa?.trim()) return alert('La targa e obbligatoria');
    setLoading(true);
    try {
      const res = await apiFetch(editing?.id ? `/api/veicolo/${editing.id}` : '/api/veicolo', {
        method: editing?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, targa: form.targa.trim().toUpperCase() }),
      });
      if (!res.ok) throw new Error((await safeReadText(res)) || 'Errore salvataggio veicolo');
      closeDialog();
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Errore salvataggio veicolo');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (item: Veicolo) => {
    if (!item.id || !confirm(`Eliminare il veicolo ${item.targa}?`)) return;
    const res = await apiFetch(`/api/veicolo/${item.id}`, { method: 'DELETE' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore eliminazione veicolo');
    await load();
  };

  const restore = async (item: Veicolo) => {
    if (!item.id) return;
    const res = await apiFetch(`/api/veicolo/${item.id}/restore`, { method: 'PUT' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore ripristino veicolo');
    await load();
  };

  const saveRenewal = async () => {
    if (!renewing?.id) return;
    const base = new Date(renewDate);
    base.setMonth(base.getMonth() + Number(renewDuration));
    const nextDate = base.toISOString().slice(0, 10);
    const payload = { ...renewing };
    if (renewType === 'assicurazione') payload.scadenzaAssicurazione = nextDate;
    if (renewType === 'revisione') payload.scadenzaRevisione = nextDate;
    if (renewType === 'bollo') payload.scadenzaBollo = nextDate;
    const res = await apiFetch(`/api/veicolo/${renewing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore rinnovo scadenza');
    setRenewing(null);
    await load();
  };

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="h5" fontWeight={700}>Veicoli</Typography>
            <Typography variant="body2" color="text.secondary">Anagrafica mezzi, targhe e scadenze amministrative.</Typography>
          </Box>
          {canWrite && <Button variant="contained" startIcon={<Add />} onClick={openNew}>Nuovo veicolo</Button>}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mt={2}>
          <TextField size="small" label="Cerca per targa, marca o modello" value={query} onChange={(e) => setQuery(e.target.value)} fullWidth />
          <Chip label={`${veicoli.length} attivi`} />
          <Chip label={`${urgentCount} con scadenze`} color={urgentCount ? 'warning' : 'success'} />
        </Stack>
      </Paper>

      <Stack spacing={1.2}>
        {filtered.map((v) => (
          <Paper key={v.id} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between">
              <Box>
                <Typography variant="h6" fontWeight={800}>{v.targa}</Typography>
                <Typography variant="body2" color="text.secondary">{[v.marca, v.modello].filter(Boolean).join(' ') || 'Dettagli mezzo non inseriti'}</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  <Chip size="small" label={deadlineLabel('Assicurazione', v.scadenzaAssicurazione)} color={deadlineColor(v.scadenzaAssicurazione)} />
                  <Chip size="small" label={deadlineLabel('Revisione', v.scadenzaRevisione)} color={deadlineColor(v.scadenzaRevisione)} />
                  <Chip size="small" label={deadlineLabel('Bollo', v.scadenzaBollo)} color={deadlineColor(v.scadenzaBollo)} />
                </Stack>
              </Box>
              {canWrite && (
                <Stack direction="row" spacing={1} alignSelf={{ xs: 'stretch', md: 'center' }}>
                  <Button size="small" startIcon={<Edit />} onClick={() => openEdit(v)}>Modifica</Button>
                  <Button size="small" onClick={() => { setRenewing(v); setRenewDate(new Date().toISOString().slice(0, 10)); }}>Rinnova</Button>
                  <Button size="small" color="error" startIcon={<Delete />} onClick={() => remove(v)}>Elimina</Button>
                </Stack>
              )}
            </Stack>
          </Paper>
        ))}
        {filtered.length === 0 && <Alert severity="info">Nessun veicolo trovato.</Alert>}
      </Stack>

      {canWrite && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={700}>Veicoli eliminati</Typography>
            <Button onClick={() => setShowDeleted((v) => !v)} endIcon={showDeleted ? <ExpandLess /> : <ExpandMore />}>Elementi eliminati</Button>
          </Stack>
          {showDeleted && (
            <Stack spacing={1} mt={1}>
              {deletedVeicoli.map((v) => (
                <Stack key={v.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                  <Typography>{v.targa} {v.modello || ''}</Typography>
                  <Button size="small" variant="outlined" onClick={() => restore(v)}>Ripristina</Button>
                </Stack>
              ))}
              {deletedVeicoli.length === 0 && <Typography variant="body2" color="text.secondary">Nessun veicolo eliminato.</Typography>}
            </Stack>
          )}
        </Paper>
      )}

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm" fullScreen={typeof window !== 'undefined' && window.innerWidth < 700}>
        <DialogTitle>{editing ? 'Modifica veicolo' : 'Nuovo veicolo'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Targa" value={form.targa} onChange={(e) => setForm((p) => ({ ...p, targa: e.target.value }))} fullWidth />
          <TextField label="Marca" value={form.marca || ''} onChange={(e) => setForm((p) => ({ ...p, marca: e.target.value }))} fullWidth />
          <TextField label="Modello" value={form.modello || ''} onChange={(e) => setForm((p) => ({ ...p, modello: e.target.value }))} fullWidth />
          <TextField type="date" label="Scadenza assicurazione" value={form.scadenzaAssicurazione || ''} onChange={(e) => setForm((p) => ({ ...p, scadenzaAssicurazione: e.target.value || null }))} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField type="date" label="Scadenza revisione" value={form.scadenzaRevisione || ''} onChange={(e) => setForm((p) => ({ ...p, scadenzaRevisione: e.target.value || null }))} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField type="date" label="Scadenza bollo" value={form.scadenzaBollo || ''} onChange={(e) => setForm((p) => ({ ...p, scadenzaBollo: e.target.value || null }))} InputLabelProps={{ shrink: true }} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annulla</Button>
          <Button onClick={save} variant="contained" disabled={loading}>{loading ? 'Salvataggio...' : 'Salva'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(renewing)} onClose={() => setRenewing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Rinnova scadenza {renewing?.targa}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <RadioGroup value={renewType} onChange={(e) => setRenewType(e.target.value as typeof renewType)}>
            <FormControlLabel value="assicurazione" control={<Radio />} label="Assicurazione" />
            <FormControlLabel value="revisione" control={<Radio />} label="Revisione" />
            <FormControlLabel value="bollo" control={<Radio />} label="Bollo" />
          </RadioGroup>
          <TextField type="date" label="Data rinnovo" value={renewDate} onChange={(e) => setRenewDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <RadioGroup row value={renewDuration} onChange={(e) => setRenewDuration(e.target.value as '6' | '12')}>
            <FormControlLabel value="6" control={<Radio />} label="Semestrale" />
            <FormControlLabel value="12" control={<Radio />} label="Annuale" />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewing(null)}>Annulla</Button>
          <Button variant="contained" onClick={saveRenewal}>Aggiorna scadenza</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
