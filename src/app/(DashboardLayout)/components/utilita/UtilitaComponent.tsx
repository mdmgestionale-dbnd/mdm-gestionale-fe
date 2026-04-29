'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Divider, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import { ArrowBack, Calculate, Delete, FileCopy, PictureAsPdf, ReceiptLong } from '@mui/icons-material';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ReportOreComponent from '@/app/(DashboardLayout)/components/report/ReportOreComponent';
import { apiJson } from '@/lib/api';

type Tool = 'report' | 'merge-pdf' | 'preventivo';
type Cliente = { id: number; nome: string; telefono?: string };
type PreventivoRow = { descrizione: string; quantita: string; prezzo: string };
type Impostazione = { chiave: string; valore: string };

const tools: Array<{ id: Tool; title: string; description: string; icon: React.ReactNode }> = [
  { id: 'report', title: 'Report ore', description: 'Excel mensile con ore lavorate, ferie e malattia.', icon: <Calculate /> },
  { id: 'merge-pdf', title: 'Unisci PDF', description: 'Combina piu documenti PDF in un unico file ordinato.', icon: <PictureAsPdf /> },
  { id: 'preventivo', title: 'Crea preventivo', description: 'Genera un preventivo PDF con logo, cliente, IVA e totale.', icon: <ReceiptLong /> },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currency(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

function downloadBytes(bytes: Uint8Array, filename: string, type: string) {
  const blob = new Blob([bytes], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function UtilitaComponent() {
  const [tool, setTool] = useState<Tool | null>(null);

  if (!tool) {
    return (
      <Stack spacing={2}>
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={800}>Utilita</Typography>
          <Typography color="text.secondary">Strumenti rapidi per amministrazione, documenti e reportistica.</Typography>
        </Paper>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
          {tools.map((item) => (
            <Paper key={item.id} elevation={0} onClick={() => setTool(item.id)} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, cursor: 'pointer', transition: '180ms ease', '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main', boxShadow: 3 } }}>
              <Stack spacing={1.2}>
                <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>{item.icon}</Box>
                <Typography variant="h6" fontWeight={800}>{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">{item.description}</Typography>
              </Stack>
            </Paper>
          ))}
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Button startIcon={<ArrowBack />} onClick={() => setTool(null)} sx={{ alignSelf: 'flex-start' }}>Torna alle utilita</Button>
      {tool === 'report' && <ReportOreComponent />}
      {tool === 'merge-pdf' && <MergePdfTool />}
      {tool === 'preventivo' && <PreventivoTool />}
    </Stack>
  );
}

function MergePdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const pdfs = Array.from(selected).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length !== selected.length) alert('Sono stati aggiunti solo file PDF.');
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const merge = async () => {
    if (files.length < 2) return alert('Seleziona almeno due PDF da unire.');
    setLoading(true);
    try {
      const output = await PDFDocument.create();
      for (const file of files) {
        const source = await PDFDocument.load(await file.arrayBuffer());
        const pages = await output.copyPages(source, source.getPageIndices());
        pages.forEach((page) => output.addPage(page));
      }
      const bytes = await output.save();
      downloadBytes(bytes, `pdf-unito-${todayIso()}.pdf`, 'application/pdf');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore durante unione PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={800}>Unisci PDF</Typography>
        <Alert severity="info">L&apos;ordine dei file qui sotto sara l&apos;ordine delle pagine nel PDF finale.</Alert>
        <Button component="label" variant="outlined" startIcon={<FileCopy />}>
          Seleziona PDF
          <input hidden type="file" accept="application/pdf,.pdf" multiple onChange={(e) => addFiles(e.target.files)} />
        </Button>
        <Stack spacing={1}>
          {files.map((file, index) => (
            <Paper key={`${file.name}-${index}`} elevation={0} sx={{ p: 1.3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography sx={{ overflowWrap: 'anywhere' }}>{index + 1}. {file.name}</Typography>
                <IconButton color="error" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}><Delete /></IconButton>
              </Stack>
            </Paper>
          ))}
          {files.length === 0 && <Typography color="text.secondary">Nessun PDF selezionato.</Typography>}
        </Stack>
        <Button variant="contained" onClick={merge} disabled={loading || files.length < 2}>{loading ? 'Unione in corso...' : 'Genera PDF unico'}</Button>
      </Stack>
    </Paper>
  );
}

function PreventivoTool() {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [oggetto, setOggetto] = useState('Preventivo lavori elettrici');
  const [iva, setIva] = useState('22');
  const [rows, setRows] = useState<PreventivoRow[]>([{ descrizione: '', quantita: '1', prezzo: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiJson<Cliente[]>('/api/cliente').then(setClienti).catch(() => setClienti([]));
    apiJson<Impostazione[]>('/api/impostazioni')
      .then((data) => setSettings(Object.fromEntries(data.map((item) => [item.chiave, item.valore]))))
      .catch(() => setSettings({}));
  }, []);

  const imponibile = useMemo(() => rows.reduce((sum, row) => sum + (Number(row.quantita) || 0) * (Number(row.prezzo) || 0), 0), [rows]);
  const ivaValue = imponibile * ((Number(iva) || 0) / 100);
  const totale = imponibile + ivaValue;

  const updateRow = (index: number, patch: Partial<PreventivoRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const generate = async () => {
    if (!cliente) return alert('Seleziona un cliente.');
    const cleanRows = rows.filter((row) => row.descrizione.trim() && Number(row.quantita) > 0 && Number(row.prezzo) >= 0);
    if (cleanRows.length === 0) return alert('Inserisci almeno una voce valida.');
    setLoading(true);
    try {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([595.28, 841.89]);
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const { width, height } = page.getSize();
      let y = height - 54;

      try {
        const logoBytes = await fetch('/images/logos/logo_transparent.png').then((r) => r.arrayBuffer());
        const logo = await pdf.embedPng(logoBytes);
        page.drawImage(logo, { x: 42, y: y - 28, width: 92, height: 42 });
      } catch {
        page.drawText('MDM', { x: 42, y, size: 18, font: bold, color: rgb(0.09, 0.2, 0.35) });
      }

      page.drawText('Preventivo', { x: width - 190, y, size: 24, font: bold, color: rgb(0.08, 0.18, 0.31) });
      const aziendaNome = settings.azienda_nome || 'MDM';
      const aziendaIndirizzo = settings.azienda_indirizzo || '';
      const aziendaPiva = settings.azienda_piva || '';
      page.drawText(aziendaNome, { x: 42, y: y - 46, size: 10, font: bold, color: rgb(0.08, 0.18, 0.31) });
      if (aziendaIndirizzo) page.drawText(aziendaIndirizzo, { x: 42, y: y - 60, size: 8, font });
      if (aziendaPiva) page.drawText(`P.IVA ${aziendaPiva}`, { x: 42, y: y - 72, size: 8, font });
      y -= 92;
      page.drawText(`Data: ${new Date().toLocaleDateString('it-IT')}`, { x: 42, y, size: 10, font });
      y -= 22;
      page.drawText(`Cliente: ${cliente.nome}`, { x: 42, y, size: 12, font: bold });
      if (cliente.telefono) page.drawText(`Telefono: ${cliente.telefono}`, { x: 42, y: y - 16, size: 10, font });
      y -= 48;
      page.drawText(oggetto || 'Preventivo lavori elettrici', { x: 42, y, size: 14, font: bold });
      y -= 34;

      const columns = [42, 330, 405, 485];
      page.drawText('Descrizione', { x: columns[0], y, size: 10, font: bold });
      page.drawText('Q.ta', { x: columns[1], y, size: 10, font: bold });
      page.drawText('Prezzo', { x: columns[2], y, size: 10, font: bold });
      page.drawText('Totale', { x: columns[3], y, size: 10, font: bold });
      y -= 12;
      page.drawLine({ start: { x: 42, y }, end: { x: width - 42, y }, thickness: 1, color: rgb(0.8, 0.83, 0.87) });
      y -= 20;

      cleanRows.forEach((row) => {
        const qty = Number(row.quantita) || 0;
        const price = Number(row.prezzo) || 0;
        const lineTotal = qty * price;
        const description = row.descrizione.length > 52 ? `${row.descrizione.slice(0, 49)}...` : row.descrizione;
        page.drawText(description, { x: columns[0], y, size: 10, font });
        page.drawText(String(qty), { x: columns[1], y, size: 10, font });
        page.drawText(currency(price), { x: columns[2], y, size: 10, font });
        page.drawText(currency(lineTotal), { x: columns[3], y, size: 10, font });
        y -= 22;
      });

      y -= 18;
      page.drawLine({ start: { x: 330, y }, end: { x: width - 42, y }, thickness: 1, color: rgb(0.8, 0.83, 0.87) });
      y -= 22;
      page.drawText(`Imponibile: ${currency(imponibile)}`, { x: 330, y, size: 11, font });
      y -= 18;
      page.drawText(`IVA ${Number(iva) || 0}%: ${currency(ivaValue)}`, { x: 330, y, size: 11, font });
      y -= 22;
      page.drawText(`Totale: ${currency(totale)}`, { x: 330, y, size: 14, font: bold, color: rgb(0.08, 0.18, 0.31) });

      const bytes = await pdf.save();
      downloadBytes(bytes, `preventivo-${cliente.nome.replace(/\s+/g, '-').toLowerCase()}-${todayIso()}.pdf`, 'application/pdf');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Errore generazione preventivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={800}>Crea preventivo</Typography>
        {(settings.azienda_nome || settings.azienda_indirizzo || settings.azienda_piva) && (
          <Alert severity="info">
            Intestazione: {[settings.azienda_nome, settings.azienda_indirizzo, settings.azienda_piva ? `P.IVA ${settings.azienda_piva}` : ''].filter(Boolean).join(' - ')}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Autocomplete options={clienti} value={cliente} onChange={(_, value) => setCliente(value)} getOptionLabel={(option) => option.nome} renderInput={(params) => <TextField {...params} label="Cliente" />} sx={{ flex: 1 }} />
          <TextField label="Data" value={new Date().toLocaleDateString('it-IT')} disabled sx={{ minWidth: 160 }} />
          <TextField label="IVA %" type="number" value={iva} onChange={(e) => setIva(e.target.value)} sx={{ width: { xs: '100%', md: 120 } }} />
        </Stack>
        <TextField label="Oggetto" value={oggetto} onChange={(e) => setOggetto(e.target.value)} fullWidth />
        <Divider />
        <Stack spacing={1.2}>
          {rows.map((row, index) => (
            <Stack key={index} direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <TextField label="Voce" value={row.descrizione} onChange={(e) => updateRow(index, { descrizione: e.target.value })} sx={{ flex: 1 }} />
              <TextField label="Q.ta" type="number" value={row.quantita} onChange={(e) => updateRow(index, { quantita: e.target.value })} sx={{ width: { xs: '100%', md: 110 } }} />
              <TextField label="Prezzo" type="number" value={row.prezzo} onChange={(e) => updateRow(index, { prezzo: e.target.value })} sx={{ width: { xs: '100%', md: 150 } }} />
              <IconButton color="error" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))} disabled={rows.length === 1}><Delete /></IconButton>
            </Stack>
          ))}
        </Stack>
        <Button variant="outlined" onClick={() => setRows((prev) => [...prev, { descrizione: '', quantita: '1', prezzo: '' }])}>Aggiungi voce</Button>
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Stack spacing={0.5}>
            <Typography>Imponibile: <strong>{currency(imponibile)}</strong></Typography>
            <Typography>IVA: <strong>{currency(ivaValue)}</strong></Typography>
            <Typography variant="h6">Totale: <strong>{currency(totale)}</strong></Typography>
          </Stack>
        </Paper>
        <Button variant="contained" onClick={generate} disabled={loading}>{loading ? 'Genero...' : 'Genera PDF preventivo'}</Button>
      </Stack>
    </Paper>
  );
}
