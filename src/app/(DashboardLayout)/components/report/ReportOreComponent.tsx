'use client';

import React, { useEffect, useState } from 'react';
import { Button, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { apiJson } from '@/lib/api';

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
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today.slice(0, 8) + '01');
  const [to, setTo] = useState(today);
  const [utenteId, setUtenteId] = useState<number | ''>('');
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);

  useEffect(() => {
    apiJson<Utente[]>('/api/utenti/dipendenti').then(setUtenti).catch(() => setUtenti([]));
  }, []);

  const load = async () => {
    const params = new URLSearchParams({ from, to });
    if (utenteId) params.set('utenteId', String(utenteId));
    const data = await apiJson<ReportResponse>(`/api/report/ore-lavorate?${params}`);
    setRows(data.righe || []);
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="h5" fontWeight={700} mb={2}>Report ore lavorate</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mb={2}>
        <TextField type="date" label="Da" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
        <TextField type="date" label="A" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
        <Select value={utenteId} onChange={(e) => setUtenteId(e.target.value as number | '')} displayEmpty size="small" sx={{ minWidth: 240 }}>
          <MenuItem value="">Tutti i dipendenti</MenuItem>
          {utenti.map((u) => <MenuItem key={u.id} value={u.id}>{label(u)}</MenuItem>)}
        </Select>
        <Button variant="contained" onClick={load}>Genera</Button>
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
