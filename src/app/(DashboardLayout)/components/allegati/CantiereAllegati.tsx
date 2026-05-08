'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from '@mui/material';
import { Delete, Download, UploadFile } from '@mui/icons-material';
import imageCompression from 'browser-image-compression';
import { apiFetch, apiJson, getBackendUrl, safeReadText } from '@/lib/api';
import { useBroadcastRefresh } from '@/hooks/useBroadcastRefresh';

export type Allegato = {
  id: number;
  nomeFile: string;
  tipoFile?: string;
  createdAt?: string;
};

type Props = {
  cantiereId: number;
  canUpload?: boolean;
  canDelete?: boolean;
  uploadAssegnazioneId?: number;
  title?: string;
};

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_UPLOAD_MB = 12;
const MAX_STORAGE_MB = 2;

export default function CantiereAllegati({ cantiereId, canUpload = false, canDelete = false, uploadAssegnazioneId, title = 'Allegati cantiere' }: Props) {
  const [items, setItems] = useState<Allegato[]>([]);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Allegato | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (from) params.set('from', `${from}T00:00:00`);
    if (to) params.set('to', `${to}T23:59:59`);
    const qs = params.toString();
    const data = await apiJson<Allegato[]>(`/api/cantiere/${cantiereId}/allegati${qs ? `?${qs}` : ''}`);
    setItems(data);
  }, [cantiereId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useBroadcastRefresh(load);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...items]
      .filter((a) => !q || a.nomeFile.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);
  }, [items, query]);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('Formato non ammesso. Puoi caricare solo PDF, JPG, JPEG o PNG.');
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      alert(`File troppo grande: massimo ${MAX_UPLOAD_MB}MB in upload.`);
      return;
    }
    setUploading(true);
    try {
      let uploadFile = file;
      if (file.type.startsWith('image/') && file.size > MAX_STORAGE_MB * 1024 * 1024) {
        uploadFile = await imageCompression(file, {
          maxSizeMB: MAX_STORAGE_MB,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: 'image/jpeg',
        });
      }
      const body = new FormData();
      body.append('file', uploadFile, uploadFile.name || file.name);
      const path = uploadAssegnazioneId ? `/api/assegnazione/${uploadAssegnazioneId}/allegati` : `/api/cantiere/${cantiereId}/allegati`;
      const res = await apiFetch(path, { method: 'POST', body });
      if (!res.ok) throw new Error((await safeReadText(res)) || 'Errore upload allegato');
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Errore upload allegato');
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const res = await apiFetch(`/api/cantiere/${cantiereId}/allegato/${deleteTarget.id}`, { method: 'DELETE' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore eliminazione allegato');
    setDeleteTarget(null);
    await load();
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <Typography fontWeight={700}>{title}</Typography>
        {canUpload && (
          <Button component="label" size="small" startIcon={<UploadFile />} disabled={uploading}>
            {uploading ? 'Carico...' : 'Carica file'}
            <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => upload(e.target.files?.[0])} />
          </Button>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary">Formati ammessi: PDF, JPG, JPEG, PNG. Upload massimo {MAX_UPLOAD_MB}MB; salvataggio massimo {MAX_STORAGE_MB}MB.</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField size="small" label="Cerca file" value={query} onChange={(e) => setQuery(e.target.value)} fullWidth />
        <TextField size="small" type="date" label="Da" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="A" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Stack>
      <Stack spacing={1}>
        {filtered.map((a) => (
          <Paper key={a.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
              <div>
                <Typography fontWeight={700}>{a.nomeFile}</Typography>
                <Typography variant="caption" color="text.secondary">{a.createdAt ? new Date(a.createdAt).toLocaleString('it-IT') : 'Data non disponibile'}</Typography>
              </div>
              <Stack direction="row" spacing={1}>
                <Button size="small" href={`${getBackendUrl()}/api/cantiere/${cantiereId}/allegato/${a.id}`} target="_blank" startIcon={<Download />}>Scarica</Button>
                {canDelete && <Button size="small" color="error" startIcon={<Delete />} onClick={() => setDeleteTarget(a)}>Elimina</Button>}
              </Stack>
            </Stack>
          </Paper>
        ))}
        {filtered.length === 0 && <Alert severity="info">Nessun allegato trovato.</Alert>}
      </Stack>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Eliminare allegato?</DialogTitle>
        <DialogContent>
          <Typography>{deleteTarget?.nomeFile}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annulla</Button>
          <Button color="error" variant="contained" onClick={remove}>Elimina</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
