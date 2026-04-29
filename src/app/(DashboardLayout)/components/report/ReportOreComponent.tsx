'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { apiFetch, apiJson, safeReadText } from '@/lib/api';

type Utente = { id: number; username: string; nome?: string; cognome?: string };
type ReportRow = {
  utenteId: number;
  nomeCompleto: string;
  oreLavorate: number;
  giorniAssenzaApprovata: number;
};
type ReportResponse = { from: string; to: string; righe: ReportRow[] };

function label(u: Utente) {
  return `${u.nome || ''} ${u.cognome || ''}`.trim() || u.username;
}

export default function ReportOreComponent() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);
  const [utenteId, setUtenteId] = useState<number | ''>('');
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    apiJson<Utente[]>('/api/utenti/dipendenti').then(setUtenti).catch(() => setUtenti([]));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
    const params = new URLSearchParams({ from, to });
    if (utenteId) params.set('utenteId', String(utenteId));
    const data = await apiJson<ReportResponse>(`/api/report/ore-lavorate?${params}`);
    setRows(data.righe || []);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await apiFetch(`/api/report/ore-lavorate.xlsx?${params}`);
      if (!res.ok) throw new Error((await safeReadText(res)) || 'Errore generazione Excel');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-ore-${from}_${to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore generazione Excel');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="h5" fontWeight={700} mb={1}>Report ore lavorate</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>Il file Excel contiene un foglio di riepilogo e un foglio per ogni dipendente.</Alert>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mb={2}>
        <TextField type="date" label="Da" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
        <TextField type="date" label="A" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
        <Select value={utenteId} onChange={(e) => setUtenteId(e.target.value as number | '')} displayEmpty size="small" sx={{ minWidth: 240 }}>
          <MenuItem value="">Tutti i dipendenti</MenuItem>
          {utenti.map((u) => <MenuItem key={u.id} value={u.id}>{label(u)}</MenuItem>)}
        </Select>
        <Button variant="outlined" onClick={load} disabled={loading}>{loading ? <CircularProgress size={18} /> : 'Anteprima'}</Button>
        <Button variant="contained" onClick={downloadExcel} disabled={downloading}>{downloading ? 'Generazione...' : 'Scarica Excel'}</Button>
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead><TableRow><TableCell>Dipendente</TableCell><TableCell>Ore</TableCell><TableCell>Giorni assenza approvata</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map((r) => <TableRow key={r.utenteId}><TableCell>{r.nomeCompleto}</TableCell><TableCell>{r.oreLavorate}</TableCell><TableCell>{r.giorniAssenzaApprovata}</TableCell></TableRow>)}
            {rows.length === 0 && <TableRow><TableCell colSpan={3}>Genera il report per visualizzare i dati.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
