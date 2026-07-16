'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Divider, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import { ArrowBack, Calculate, Delete, FileCopy, PictureAsPdf, ReceiptLong } from '@mui/icons-material';
import { AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType } from 'docx';
import ReportOreComponent from '@/app/(DashboardLayout)/components/report/ReportOreComponent';
import { apiFetch, apiJson, safeReadText } from '@/lib/api';

type Tool = 'report' | 'merge-pdf' | 'preventivo';
type Cliente = { id: number; nome: string; telefono?: string };
type PreventivoRow = { descrizione: string; quantita: string; prezzo: string };
type Impostazione = { chiave: string; valore: string };

const tools: Array<{ id: Tool; title: string; description: string; icon: React.ReactNode }> = [
  { id: 'report', title: 'Report ore', description: 'Excel mensile con ore lavorate, ferie e malattia.', icon: <Calculate /> },
  { id: 'merge-pdf', title: 'Unisci PDF', description: 'Combina piu documenti PDF in un unico file ordinato.', icon: <PictureAsPdf /> },
  { id: 'preventivo', title: 'Crea preventivo', description: 'Genera un preventivo Word modificabile con logo, cliente, IVA e totale.', icon: <ReceiptLong /> },
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

const EMPTY_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

function paragraph(text: string, bold = false, size = 24, alignment?: typeof AlignmentType[keyof typeof AlignmentType]) {
  return new Paragraph({
    alignment,
    children: [new TextRun({ text, bold, size, font: 'Times New Roman' })],
    spacing: { after: 80 },
  });
}

function tableTextCell(text: string, bold = false, alignment?: typeof AlignmentType[keyof typeof AlignmentType], width?: number) {
  const lines = text.split('\n').filter((line) => line.trim() || text.length === 0);
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: lines.length
      ? lines.map((line) => new Paragraph({ alignment, children: [new TextRun({ text: line, bold, size: 24, font: 'Times New Roman' })] }))
      : [new Paragraph('')],
  });
}

async function dataUrlToImageRun(dataUrl: string | undefined, width: number, height: number) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  const [meta, base64] = dataUrl.split(',');
  if (!base64) return null;
  const type: 'png' | 'gif' | 'bmp' | 'jpg' = meta.includes('image/png') ? 'png' : meta.includes('image/gif') ? 'gif' : meta.includes('image/bmp') ? 'bmp' : 'jpg';
  const data = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new ImageRun({ data, type, transformation: { width, height } });
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
      const body = new FormData();
      files.forEach((file) => body.append('files', file, file.name));
      const res = await apiFetch('/api/utilita/pdf/merge', { method: 'POST', body });
      if (!res.ok) throw new Error((await safeReadText(res)) || 'Errore durante unione PDF');
      const blob = await res.blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
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

  const resetForm = () => {
    setCliente(null);
    setOggetto('Preventivo lavori elettrici');
    setIva('22');
    setRows([{ descrizione: '', quantita: '1', prezzo: '' }]);
  };

  const generate = async () => {
    if (!cliente) return alert('Seleziona un cliente.');
    const cleanRows = rows.filter((row) => row.descrizione.trim() && Number(row.quantita) > 0 && Number(row.prezzo) >= 0);
    if (cleanRows.length === 0) return alert('Inserisci almeno una voce valida.');
    setLoading(true);
    try {
      const progressivo = settings.preventivo_progressivo || '1';
      const preventivoNumero = String(progressivo).padStart(3, '0');
      const aziendaNome = settings.azienda_nome || 'MDM';
      const aziendaLines = [
        aziendaNome,
        settings.azienda_indirizzo || '',
        settings.azienda_piva ? `P.I.V.A.: ${settings.azienda_piva}` : '',
        settings.azienda_telefono ? `TEL: ${settings.azienda_telefono}` : '',
        settings.azienda_email ? `e-mail: ${settings.azienda_email}` : '',
        settings.azienda_pec ? `pec: ${settings.azienda_pec}` : '',
      ].filter(Boolean);
      const logoBytes = await fetch('/images/logos/logo_transparent.png')
        .then((r) => r.ok ? r.arrayBuffer() : null)
        .catch(() => null);
      const logoRun = logoBytes ? new ImageRun({ data: logoBytes, type: 'png', transformation: { width: 233, height: 85 } }) : null;
      const timbroFirmaRun = await dataUrlToImageRun(settings.preventivo_timbro_img || settings.preventivo_firma_img, 190, 95);

      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: EMPTY_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: EMPTY_BORDERS,
                children: [logoRun ? new Paragraph({ children: [logoRun] }) : paragraph(aziendaNome, true, 24)],
              }),
              new TableCell({
                width: { size: 75, type: WidthType.PERCENTAGE },
                borders: EMPTY_BORDERS,
                children: aziendaLines.map((line, index) => paragraph(line, index === 0, index === 0 ? 24 : 19, AlignmentType.RIGHT)),
              }),
            ],
          }),
        ],
      });

      const rowsTable = cleanRows.map((row) => {
        const qty = Number(row.quantita) || 0;
        const price = Number(row.prezzo) || 0;
        return new TableRow({
          children: [
            tableTextCell(row.descrizione, false, AlignmentType.LEFT, 7900),
            tableTextCell(currency(qty * price), false, AlignmentType.RIGHT, 2120),
          ],
        });
      });

      const quoteTable = new Table({
        width: { size: 10031, type: WidthType.DXA },
        rows: [
          new TableRow({
            children: [
              tableTextCell('DESCRIZIONE', true, AlignmentType.LEFT, 7900),
              tableTextCell('IMPORTO', true, AlignmentType.CENTER, 2120),
            ],
          }),
          ...rowsTable,
          new TableRow({
            children: [
              tableTextCell('IMPONIBILE', true, AlignmentType.LEFT, 7900),
              tableTextCell(currency(imponibile), true, AlignmentType.RIGHT, 2120),
            ],
          }),
          new TableRow({
            children: [
              tableTextCell(`IVA ${Number(iva) || 0}%`, false, AlignmentType.LEFT, 7900),
              tableTextCell(currency(ivaValue), false, AlignmentType.RIGHT, 2120),
            ],
          }),
          new TableRow({
            children: [
              tableTextCell('TOTALE SPESA', true, AlignmentType.LEFT, 7900),
              tableTextCell(currency(totale), true, AlignmentType.RIGHT, 2120),
            ],
          }),
        ],
      });

      const doc = new Document({
        styles: {
          default: {
            document: { run: { font: 'Times New Roman', size: 24 } },
            heading1: { run: { font: 'Times New Roman', size: 28, bold: true } },
          },
        },
        sections: [{
          properties: {
            page: {
              margin: { top: 720, right: 720, bottom: 720, left: 720 },
            },
          },
          children: [
            headerTable,
            paragraph('', false, 10),
            new Paragraph({
              children: [
                new TextRun({ text: 'Preventivo nr.: ', bold: true, size: 24, font: 'Times New Roman' }),
                new TextRun({ text: preventivoNumero, bold: true, size: 24, font: 'Times New Roman' }),
                new TextRun({ text: '                                                            ', size: 24, font: 'Times New Roman' }),
                new TextRun({ text: 'Data: ', bold: true, size: 24, font: 'Times New Roman' }),
                new TextRun({ text: new Date().toLocaleDateString('it-IT'), bold: true, size: 24, font: 'Times New Roman' }),
              ],
              spacing: { after: 260 },
            }),
            new Paragraph({
              indent: { left: 5000 },
              children: [new TextRun({ text: 'Spett.le', bold: true, size: 24, font: 'Times New Roman' })],
              spacing: { after: 0 },
            }),
            new Paragraph({
              indent: { left: 5000 },
              children: [new TextRun({ text: cliente.nome, size: 24, font: 'Times New Roman' })],
              spacing: { after: 0 },
            }),
            ...(cliente.telefono ? [new Paragraph({
              indent: { left: 5000 },
              children: [new TextRun({ text: cliente.telefono, size: 24, font: 'Times New Roman' })],
              spacing: { after: 240 },
            })] : [paragraph('', false, 10)]),
            new Paragraph({
              children: [
                new TextRun({ text: 'Oggetto: ', bold: true, size: 24, font: 'Times New Roman' }),
                new TextRun({ text: oggetto || 'Preventivo lavori elettrici', size: 24, font: 'Times New Roman' }),
              ],
              spacing: { after: 260 },
            }),
            quoteTable,
            paragraph('', false, 10),
            paragraph('Tutti i prezzi sono da intendersi inclusi di aliquota I.V.A.', false, 24),
            paragraph('', false, 10),
            timbroFirmaRun
              ? new Paragraph({ alignment: AlignmentType.RIGHT, children: [timbroFirmaRun], spacing: { before: 160 } })
              : new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Timbro e firma', bold: true, size: 24, font: 'Times New Roman' })] }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      downloadBytes(bytes, `preventivo-${cliente.nome.replace(/\s+/g, '-').toLowerCase()}-${todayIso()}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const nextProgressivo = String((Number(progressivo) || 1) + 1);
      await apiFetch('/api/impostazioni/preventivo_progressivo', {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: nextProgressivo,
      });
      setSettings((prev) => ({ ...prev, preventivo_progressivo: nextProgressivo }));
      if (confirm('Preventivo DOCX generato. Vuoi pulire la pagina e iniziare un nuovo preventivo?')) {
        resetForm();
      }
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
            Intestazione: {[settings.azienda_nome, settings.azienda_indirizzo, settings.azienda_piva ? `P.IVA ${settings.azienda_piva}` : '', settings.azienda_pec ? `PEC ${settings.azienda_pec}` : '', settings.azienda_email, settings.azienda_telefono ? `Tel. ${settings.azienda_telefono}` : '', settings.preventivo_progressivo ? `Preventivo n. ${settings.preventivo_progressivo}` : ''].filter(Boolean).join(' - ')}
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
              <TextField multiline minRows={2} label="Voce" value={row.descrizione} onChange={(e) => updateRow(index, { descrizione: e.target.value })} sx={{ flex: 1 }} />
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
        <Button variant="contained" onClick={generate} disabled={loading}>{loading ? 'Genero...' : 'Genera DOCX preventivo'}</Button>
      </Stack>
    </Paper>
  );
}
