'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Delete, Edit, Inventory2 } from '@mui/icons-material';
import { apiFetch, apiJson, safeReadText } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useBroadcastRefresh } from '@/hooks/useBroadcastRefresh';

type Magazzino = { id?: number; nome: string };
type InventarioArticolo = {
  id?: number;
  magazzino?: Magazzino;
  categoria?: string;
  nome: string;
  descrizione?: string;
  prezzoUnitario: number | '';
  quantitaMagazzino: number | '';
  valoreInventario?: number;
  livelloRiordino?: number;
  quantitaInRiordino?: number;
  fuoriProduzione?: boolean;
};
type InventarioMovimento = {
  id?: number;
  inventario?: InventarioArticolo;
  quantita: number | '';
  movimentoAt?: string;
  descrizione?: string;
};

const emptyMagazzino: Magazzino = { nome: '' };
const emptyArticolo: InventarioArticolo = {
  nome: '',
  prezzoUnitario: '',
  quantitaMagazzino: '',
};
const emptyMovimento: InventarioMovimento = { quantita: '', descrizione: '' };

export default function InventarioComponent() {
  const { user } = useCurrentUser();
  const role = (user?.role || '').toUpperCase();
  const canWrite = role === 'ADMIN' || role === 'SUPERVISORE';

  const [magazzini, setMagazzini] = useState<Magazzino[]>([]);
  const [articoli, setArticoli] = useState<InventarioArticolo[]>([]);
  const [movimenti, setMovimenti] = useState<InventarioMovimento[]>([]);
  const [selectedMagazzinoId, setSelectedMagazzinoId] = useState<number | ''>('');
  const [search, setSearch] = useState('');

  const [magazzinoOpen, setMagazzinoOpen] = useState(false);
  const [articoloOpen, setArticoloOpen] = useState(false);
  const [movimentoOpen, setMovimentoOpen] = useState(false);
  const [editingMagazzino, setEditingMagazzino] = useState<Magazzino | null>(null);
  const [editingArticolo, setEditingArticolo] = useState<InventarioArticolo | null>(null);
  const [editingMovimento, setEditingMovimento] = useState<InventarioMovimento | null>(null);
  const [magazzinoForm, setMagazzinoForm] = useState<Magazzino>(emptyMagazzino);
  const [articoloForm, setArticoloForm] = useState<InventarioArticolo>(emptyArticolo);
  const [movimentoForm, setMovimentoForm] = useState<InventarioMovimento>(emptyMovimento);
  const [movimentoArticoloId, setMovimentoArticoloId] = useState<number | ''>('');
  const [movimentoTipo, setMovimentoTipo] = useState<'CARICO' | 'SCARICO'>('SCARICO');

  const load = useCallback(async () => {
    try {
      const [m, a, mov] = await Promise.all([
        apiJson<Magazzino[]>('/api/magazzino'),
        apiJson<InventarioArticolo[]>('/api/inventarioarticolo'),
        apiJson<InventarioMovimento[]>('/api/inventariomovimento'),
      ]);
      setMagazzini(m);
      setArticoli(a);
      setMovimenti(mov);
      setSelectedMagazzinoId((current) => current || m[0]?.id || '');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Errore caricamento inventario');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useBroadcastRefresh(load);

  const selectedMagazzino = magazzini.find((m) => m.id === selectedMagazzinoId);
  const articoliMagazzino = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articoli
      .filter((a) => a.magazzino?.id === selectedMagazzinoId)
      .filter((a) => !q || a.nome.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [articoli, search, selectedMagazzinoId]);
  const valoreTotale = articoliMagazzino.reduce((sum, a) => sum + Number(a.valoreInventario || (a.prezzoUnitario || 0) * (a.quantitaMagazzino || 0)), 0);
  const movimentiMagazzino = movimenti
    .filter((m) => m.inventario?.magazzino?.id === selectedMagazzinoId)
    .sort((x, y) => (y.id || 0) - (x.id || 0))
    .slice(0, 8);

  const resetArticle = () => {
    setEditingArticolo(null);
    setArticoloForm(emptyArticolo);
  };

  const saveMagazzino = async () => {
    if (!magazzinoForm.nome.trim()) return alert('Nome magazzino obbligatorio');
    const res = await apiFetch(editingMagazzino?.id ? `/api/magazzino/${editingMagazzino.id}` : '/api/magazzino', {
      method: editingMagazzino?.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(magazzinoForm),
    });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore salvataggio magazzino');
    setMagazzinoOpen(false);
    setEditingMagazzino(null);
    setMagazzinoForm(emptyMagazzino);
    await load();
  };

  const saveArticolo = async () => {
    if (!selectedMagazzinoId || !articoloForm.nome.trim()) {
      return alert('Magazzino e nome prodotto sono obbligatori');
    }
    const res = await apiFetch(editingArticolo?.id ? `/api/inventarioarticolo/${editingArticolo.id}` : '/api/inventarioarticolo', {
      method: editingArticolo?.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...articoloForm,
        prezzoUnitario: Number(articoloForm.prezzoUnitario || 0),
        quantitaMagazzino: Number(articoloForm.quantitaMagazzino || 0),
        categoria: 'GENERALE',
        descrizione: null,
        livelloRiordino: 0,
        quantitaInRiordino: 0,
        fuoriProduzione: false,
        magazzino: { id: selectedMagazzinoId },
      }),
    });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore salvataggio articolo');
    setArticoloOpen(false);
    resetArticle();
    await load();
  };

  const saveMovimento = async () => {
    if (!movimentoArticoloId || !movimentoForm.quantita || Number(movimentoForm.quantita) <= 0) return alert('Articolo e quantita sono obbligatori');
    const signedQuantity = Math.abs(Number(movimentoForm.quantita)) * (movimentoTipo === 'SCARICO' ? -1 : 1);
    const res = await apiFetch(editingMovimento?.id ? `/api/inventariomovimento/${editingMovimento.id}` : '/api/inventariomovimento', {
      method: editingMovimento?.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...movimentoForm, quantita: signedQuantity, inventario: { id: movimentoArticoloId } }),
    });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore salvataggio movimento');
    setMovimentoOpen(false);
    setEditingMovimento(null);
    setMovimentoForm(emptyMovimento);
    setMovimentoArticoloId('');
    setMovimentoTipo('SCARICO');
    await load();
  };

  const remove = async (entity: 'magazzino' | 'articolo' | 'movimento', id?: number) => {
    if (!id || !confirm('Confermi eliminazione?')) return;
    const pathMap: Record<'magazzino' | 'articolo' | 'movimento', string> = {
      magazzino: '/api/magazzino',
      articolo: '/api/inventarioarticolo',
      movimento: '/api/inventariomovimento',
    };
    const res = await apiFetch(`${pathMap[entity]}/${id}`, { method: 'DELETE' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore eliminazione');
    await load();
  };

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="h5" fontWeight={700}>Magazzino</Typography>
            <Typography variant="body2" color="text.secondary">Seleziona un deposito e gestisci articoli, scorte e movimenti.</Typography>
          </Box>
          {canWrite && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<Add />} onClick={() => setMagazzinoOpen(true)}>Magazzino</Button>
              <Button variant="contained" startIcon={<Add />} disabled={!selectedMagazzinoId} onClick={() => setArticoloOpen(true)}>Articolo</Button>
            </Stack>
          )}
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
          <Select value={selectedMagazzinoId} onChange={(e) => setSelectedMagazzinoId(Number(e.target.value))} displayEmpty size="small" sx={{ minWidth: 260 }}>
            <MenuItem value="">Seleziona magazzino</MenuItem>
            {magazzini.map((m) => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
          </Select>
          <TextField size="small" label="Cerca articolo" value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
          {canWrite && selectedMagazzino && (
            <Button variant="text" onClick={() => {
              setEditingMagazzino(selectedMagazzino);
              setMagazzinoForm(selectedMagazzino);
              setMagazzinoOpen(true);
            }}>Modifica deposito</Button>
          )}
        </Stack>
      </Paper>

      {selectedMagazzinoId && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="overline">Articoli</Typography>
              <Typography variant="h4" fontWeight={700}>{articoliMagazzino.length}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="overline">Valore stimato</Typography>
              <Typography variant="h4" fontWeight={700}>{valoreTotale.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={1.2}>
            {articoliMagazzino.map((a) => (
              <Paper key={a.id} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                  <Stack direction="row" spacing={1.5}>
                    <Inventory2 color="primary" />
                    <Box>
                      <Typography fontWeight={700}>{a.nome}</Typography>
                      <Typography variant="body2" color="text.secondary">{a.magazzino?.nome || 'Magazzino'}</Typography>
                      <Stack direction="row" spacing={1} mt={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <Chip size="small" label={`Qta ${a.quantitaMagazzino}`} />
                        <Chip size="small" label={`${Number(a.prezzoUnitario || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}`} variant="outlined" />
                      </Stack>
                    </Box>
                  </Stack>
                  {canWrite && (
                    <Stack direction="row" spacing={1} alignSelf={{ xs: 'stretch', sm: 'center' }}>
                      <Button size="small" startIcon={<Add />} onClick={() => {
                        setMovimentoArticoloId(a.id || '');
                        setMovimentoForm(emptyMovimento);
                        setMovimentoTipo('SCARICO');
                        setMovimentoOpen(true);
                      }}>Movimento</Button>
                      <Button size="small" startIcon={<Edit />} onClick={() => {
                        setEditingArticolo(a);
                        setArticoloForm({ ...a });
                        setArticoloOpen(true);
                      }}>Modifica</Button>
                      <Button size="small" color="error" startIcon={<Delete />} onClick={() => remove('articolo', a.id)}>Elimina</Button>
                    </Stack>
                  )}
                </Stack>
              </Paper>
            ))}
            {selectedMagazzinoId && articoliMagazzino.length === 0 && <Alert severity="info">Nessun articolo in questo magazzino.</Alert>}
            {!selectedMagazzinoId && <Alert severity="info">Seleziona un magazzino per visualizzare gli articoli.</Alert>}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography fontWeight={700}>Ultimi movimenti</Typography>
              {canWrite && <Button size="small" onClick={() => {
                setMovimentoForm(emptyMovimento);
                setMovimentoArticoloId('');
                setMovimentoTipo('SCARICO');
                setMovimentoOpen(true);
              }} disabled={!articoliMagazzino.length}>Nuovo</Button>}
            </Stack>
            <Stack spacing={1}>
              {movimentiMagazzino.map((m) => (
                <Box key={m.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography fontWeight={600}>{m.inventario?.nome || '-'}</Typography>
                  <Typography variant="body2" color={Number(m.quantita) < 0 ? 'error.main' : 'success.main'}>{Number(m.quantita) > 0 ? '+' : ''}{m.quantita}</Typography>
                  <Typography variant="caption" color="text.secondary">{m.descrizione || ''}</Typography>
                </Box>
              ))}
              {movimentiMagazzino.length === 0 && <Typography variant="body2" color="text.secondary">Nessun movimento recente.</Typography>}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={magazzinoOpen} onClose={() => setMagazzinoOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingMagazzino ? 'Modifica magazzino' : 'Nuovo magazzino'}</DialogTitle>
        <DialogContent sx={{ mt: 1 }}><TextField label="Nome" fullWidth value={magazzinoForm.nome} onChange={(e) => setMagazzinoForm({ nome: e.target.value })} /></DialogContent>
        <DialogActions>
          {editingMagazzino?.id && <Button color="error" onClick={() => remove('magazzino', editingMagazzino.id)}>Elimina</Button>}
          <Button onClick={() => setMagazzinoOpen(false)}>Annulla</Button>
          <Button onClick={saveMagazzino} variant="contained">Salva</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={articoloOpen} onClose={() => setArticoloOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingArticolo ? 'Modifica articolo' : 'Nuovo articolo'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Nome prodotto" value={articoloForm.nome} onChange={(e) => setArticoloForm((p) => ({ ...p, nome: e.target.value }))} />
          <TextField type="number" label="Prezzo unitario" value={articoloForm.prezzoUnitario ?? ''} onChange={(e) => setArticoloForm((p) => ({ ...p, prezzoUnitario: e.target.value === '' ? '' : Number(e.target.value) }))} />
          <TextField type="number" label="Quantita" value={articoloForm.quantitaMagazzino ?? ''} onChange={(e) => setArticoloForm((p) => ({ ...p, quantitaMagazzino: e.target.value === '' ? '' : Number(e.target.value) }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArticoloOpen(false)}>Annulla</Button>
          <Button onClick={saveArticolo} variant="contained">Salva</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={movimentoOpen} onClose={() => setMovimentoOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingMovimento ? 'Modifica movimento' : 'Nuovo movimento'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Autocomplete
            options={articoliMagazzino}
            value={articoliMagazzino.find((a) => a.id === movimentoArticoloId) || null}
            getOptionLabel={(option) => option.nome}
            onChange={(_, value) => setMovimentoArticoloId(value?.id || '')}
            renderInput={(params) => <TextField {...params} label="Articolo" />}
          />
          <RadioGroup row value={movimentoTipo} onChange={(e) => setMovimentoTipo(e.target.value as 'CARICO' | 'SCARICO')}>
            <FormControlLabel value="CARICO" control={<Radio />} label="Carico" />
            <FormControlLabel value="SCARICO" control={<Radio />} label="Scarico" />
          </RadioGroup>
          <TextField type="number" label="Quantita" value={movimentoForm.quantita ?? ''} onChange={(e) => setMovimentoForm((p) => ({ ...p, quantita: e.target.value === '' ? '' : Number(e.target.value) }))} />
          <TextField label="Descrizione" value={movimentoForm.descrizione || ''} onChange={(e) => setMovimentoForm((p) => ({ ...p, descrizione: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovimentoOpen(false)}>Annulla</Button>
          <Button onClick={saveMovimento} variant="contained">Salva</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
