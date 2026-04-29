'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Delete, Edit, ExpandLess, ExpandMore, Folder } from '@mui/icons-material';
import { apiFetch, apiJson, safeReadText } from '@/lib/api';
import { useBroadcastRefresh } from '@/hooks/useBroadcastRefresh';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import CantiereAllegati from '@/app/(DashboardLayout)/components/allegati/CantiereAllegati';

type Cliente = { id?: number; nome: string; telefono?: string; isDeleted?: boolean; deleted?: boolean };
type Cantiere = { id: number; nome: string; cliente?: { id: number; nome: string }; isDeleted?: boolean; deleted?: boolean };

const emptyCliente: Cliente = { nome: '', telefono: '' };
const emptyCantiere = { nome: '' };

function isDeleted(item: { isDeleted?: boolean; deleted?: boolean }) {
  return Boolean(item.isDeleted || item.deleted);
}

export default function CantieriManagement() {
  const { user } = useCurrentUser();
  const canWrite = ['ADMIN', 'SUPERVISORE'].includes((user?.role || '').toUpperCase());

  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [deletedClienti, setDeletedClienti] = useState<Cliente[]>([]);
  const [deletedCantieri, setDeletedCantieri] = useState<Cantiere[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedCantiere, setSelectedCantiere] = useState<Cantiere | null>(null);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [cantiereOpen, setCantiereOpen] = useState(false);
  const [allegatiOpen, setAllegatiOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingCantiere, setEditingCantiere] = useState<Cantiere | null>(null);
  const [clienteForm, setClienteForm] = useState<Cliente>(emptyCliente);
  const [cantiereForm, setCantiereForm] = useState(emptyCantiere);

  const loadAll = useCallback(async () => {
    const [c, ca] = await Promise.all([
      apiJson<Cliente[]>('/api/cliente?includeDeleted=true'),
      apiJson<Cantiere[]>('/api/cantiere?includeDeleted=true'),
    ]);
    setClienti(c.filter((x) => !isDeleted(x)));
    setCantieri(ca.filter((x) => !isDeleted(x)));
    setDeletedClienti(c.filter((x) => isDeleted(x)));
    setDeletedCantieri(ca.filter((x) => isDeleted(x)));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useBroadcastRefresh(loadAll);

  const filteredClienti = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clienti.filter((c) => !q || `${c.nome} ${c.telefono || ''}`.toLowerCase().includes(q));
  }, [clienti, query]);

  const cantieriForCliente = useMemo(() => (
    selectedCliente?.id ? cantieri.filter((c) => c.cliente?.id === selectedCliente.id) : []
  ), [cantieri, selectedCliente?.id]);

  const saveCliente = async () => {
    if (!clienteForm.nome.trim()) return alert('Nome cliente obbligatorio');
    const res = await apiFetch(editingCliente?.id ? `/api/cliente/${editingCliente.id}` : '/api/cliente', {
      method: editingCliente?.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: clienteForm.nome, telefono: clienteForm.telefono }),
    });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore salvataggio cliente');
    setClienteOpen(false);
    setEditingCliente(null);
    setClienteForm(emptyCliente);
    await loadAll();
  };

  const saveCantiere = async () => {
    if (!selectedCliente?.id || !cantiereForm.nome.trim()) return alert('Seleziona cliente e inserisci la via del cantiere');
    const form = new FormData();
    form.append('cantiere', new Blob([JSON.stringify({ nome: cantiereForm.nome, cliente: { id: selectedCliente.id } })], { type: 'application/json' }));
    const res = await apiFetch(editingCantiere?.id ? `/api/cantiere/${editingCantiere.id}` : '/api/cantiere', {
      method: editingCantiere?.id ? 'PUT' : 'POST',
      body: form,
    });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore salvataggio cantiere');
    setCantiereOpen(false);
    setEditingCantiere(null);
    setCantiereForm(emptyCantiere);
    await loadAll();
  };

  const removeCliente = async (c: Cliente) => {
    if (!c.id || !confirm(`Eliminare cliente ${c.nome}?\n\nVerranno eliminati logicamente anche tutti i cantieri collegati e i relativi task. Potrai ripristinarli dalla sezione Elementi eliminati finche non esegui la pulizia definitiva.`)) return;
    const res = await apiFetch(`/api/cliente/${c.id}`, { method: 'DELETE' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore eliminazione cliente');
    setSelectedCliente(null);
    await loadAll();
  };

  const removeCantiere = async (c: Cantiere) => {
    if (!confirm(`Eliminare cantiere ${c.nome}?\n\nVerranno eliminati logicamente anche i task collegati. Potrai ripristinarli dalla sezione Elementi eliminati finche non esegui la pulizia definitiva.`)) return;
    const res = await apiFetch(`/api/cantiere/${c.id}`, { method: 'DELETE' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore eliminazione cantiere');
    await loadAll();
  };

  const restoreCliente = async (c: Cliente) => {
    if (!c.id) return;
    const res = await apiFetch(`/api/cliente/${c.id}/restore`, { method: 'PUT' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore ripristino cliente');
    await loadAll();
  };

  const restoreCantiere = async (c: Cantiere) => {
    const res = await apiFetch(`/api/cantiere/${c.id}/restore`, { method: 'PUT' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore ripristino cantiere');
    await loadAll();
  };

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Clienti e cantieri</Typography>
            <Typography variant="body2" color="text.secondary">Anagrafica essenziale: cliente, telefono e vie dei cantieri.</Typography>
          </Box>
          {canWrite && <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingCliente(null); setClienteForm(emptyCliente); setClienteOpen(true); }}>Nuovo cliente</Button>}
        </Stack>
        <TextField size="small" fullWidth label="Cerca cliente o telefono" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ mt: 2 }} />
      </Paper>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Stack spacing={1.2} sx={{ flex: 1 }}>
          {filteredClienti.map((c) => (
            <Paper key={c.id} elevation={0} onClick={() => setSelectedCliente(c)} sx={{ p: 2, border: '1px solid', borderColor: selectedCliente?.id === c.id ? 'primary.main' : 'divider', borderRadius: 2, cursor: 'pointer' }}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography fontWeight={800}>{c.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.telefono || 'Telefono non inserito'}</Typography>
                </Box>
                {canWrite && (
                  <Stack direction="row" spacing={1}>
                    <Button size="small" startIcon={<Edit />} onClick={(e) => { e.stopPropagation(); setEditingCliente(c); setClienteForm(c); setClienteOpen(true); }}>Modifica</Button>
                    <Button size="small" color="error" startIcon={<Delete />} onClick={(e) => { e.stopPropagation(); removeCliente(c); }}>Elimina</Button>
                  </Stack>
                )}
              </Stack>
            </Paper>
          ))}
          {filteredClienti.length === 0 && <Alert severity="info">Nessun cliente trovato.</Alert>}
        </Stack>

        <Paper elevation={0} sx={{ flex: 1.2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="h6" fontWeight={700}>{selectedCliente ? `Cantieri di ${selectedCliente.nome}` : 'Cantieri'}</Typography>
            {canWrite && <Button size="small" variant="contained" disabled={!selectedCliente} onClick={() => { setEditingCantiere(null); setCantiereForm(emptyCantiere); setCantiereOpen(true); }}>Nuovo cantiere</Button>}
          </Stack>
          {!selectedCliente && <Alert severity="info">Seleziona un cliente per vedere i suoi cantieri.</Alert>}
          <Stack spacing={1}>
            {cantieriForCliente.map((c) => (
              <Paper key={c.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center"><Folder color="primary" /><Typography fontWeight={700}>{c.nome}</Typography></Stack>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => { setSelectedCantiere(c); setAllegatiOpen(true); }}>Allegati</Button>
                    {canWrite && <Button size="small" startIcon={<Edit />} onClick={() => { setEditingCantiere(c); setCantiereForm({ nome: c.nome }); setCantiereOpen(true); }}>Modifica</Button>}
                    {canWrite && <Button size="small" color="error" startIcon={<Delete />} onClick={() => removeCantiere(c)}>Elimina</Button>}
                  </Stack>
                </Stack>
              </Paper>
            ))}
            {selectedCliente && cantieriForCliente.length === 0 && <Typography variant="body2" color="text.secondary">Nessun cantiere per questo cliente.</Typography>}
          </Stack>
        </Paper>
      </Stack>

      {canWrite && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={700}>Elementi eliminati</Typography>
            <Button onClick={() => setShowDeleted((v) => !v)} endIcon={showDeleted ? <ExpandLess /> : <ExpandMore />}>Mostra</Button>
          </Stack>
          {showDeleted && (
            <Stack spacing={1} mt={1}>
              {deletedClienti.map((c) => <Stack key={`cliente-${c.id}`} direction="row" justifyContent="space-between"><Typography>Cliente: {c.nome}</Typography><Button size="small" onClick={() => restoreCliente(c)}>Ripristina</Button></Stack>)}
              {deletedCantieri.map((c) => <Stack key={`cantiere-${c.id}`} direction="row" justifyContent="space-between"><Typography>Cantiere: {c.nome}</Typography><Button size="small" onClick={() => restoreCantiere(c)}>Ripristina</Button></Stack>)}
              {deletedClienti.length + deletedCantieri.length === 0 && <Typography variant="body2" color="text.secondary">Nessun elemento eliminato.</Typography>}
            </Stack>
          )}
        </Paper>
      )}

      <Dialog open={clienteOpen} onClose={() => setClienteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingCliente ? 'Modifica cliente' : 'Nuovo cliente'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Nome cliente" value={clienteForm.nome || ''} onChange={(e) => setClienteForm((p) => ({ ...p, nome: e.target.value }))} fullWidth />
          <TextField label="Telefono" value={clienteForm.telefono || ''} onChange={(e) => setClienteForm((p) => ({ ...p, telefono: e.target.value }))} fullWidth />
        </DialogContent>
        <DialogActions><Button onClick={() => setClienteOpen(false)}>Annulla</Button><Button variant="contained" onClick={saveCliente}>Salva</Button></DialogActions>
      </Dialog>

      <Dialog open={cantiereOpen} onClose={() => setCantiereOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingCantiere ? 'Modifica cantiere' : 'Nuovo cantiere'}</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <TextField label="Via / nome cantiere" value={cantiereForm.nome} onChange={(e) => setCantiereForm({ nome: e.target.value })} fullWidth />
        </DialogContent>
        <DialogActions><Button onClick={() => setCantiereOpen(false)}>Annulla</Button><Button variant="contained" onClick={saveCantiere}>Salva</Button></DialogActions>
      </Dialog>

      <Dialog open={allegatiOpen} onClose={() => setAllegatiOpen(false)} fullWidth maxWidth="md" fullScreen={typeof window !== 'undefined' && window.innerWidth < 700}>
        <DialogTitle>Allegati {selectedCantiere?.nome || ''}</DialogTitle>
        <DialogContent>
          {selectedCantiere && <CantiereAllegati cantiereId={selectedCantiere.id} canUpload={canWrite} canDelete={canWrite} />}
        </DialogContent>
        <DialogActions><Button onClick={() => setAllegatiOpen(false)}>Chiudi</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
