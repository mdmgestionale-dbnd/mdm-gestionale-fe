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
  Divider,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Delete, Edit, ExpandLess, ExpandMore, WarningAmber } from '@mui/icons-material';
import { apiFetch, apiJson, safeReadText } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useBroadcastRefresh } from '@/hooks/useBroadcastRefresh';
import CantiereAllegati from '@/app/(DashboardLayout)/components/allegati/CantiereAllegati';

type Cliente = { id: number; nome: string };
type Cantiere = { id: number; nome: string; codice?: string; cliente?: Cliente };
type Utente = { id: number; username: string; nome?: string; cognome?: string };
type Veicolo = { id: number; targa: string; marca?: string; modello?: string };

type Assegnazione = {
  id: number;
  cantiereId: number;
  cantiereNome: string;
  startAt: string;
  endAt: string;
  note?: string;
  materialiNote?: string;
  membroIds: number[];
  membroNomi?: string[];
  veicoloIds: number[];
  veicoloNomi?: string[];
};

type AvailabilityResponse = { disponibili: boolean; membriOccupati: number[]; veicoliOccupati: number[] };
type DashboardOverview = { cantieriAttivi: number; veicoliAttivi: number; assegnazioniOggi: number; notificheNonLette: number };
type FormState = {
  clienteId: number | '';
  cantiereId: number | '';
  startAt: string;
  endAt: string;
  note: string;
  materialiNote: string;
  membroIds: number[];
  veicoloIds: number[];
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);
const ROW_HEIGHT = 56;
const steps = ['Quando e dove', 'Squadra e veicoli', 'Materiali e note'];

const emptyForm: FormState = {
  clienteId: '',
  cantiereId: '',
  startAt: '',
  endAt: '',
  note: '',
  materialiNote: '',
  membroIds: [],
  veicoloIds: [],
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseInput(value: string): Date {
  return new Date(value);
}

function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function userLabel(u: Utente): string {
  const full = `${u.nome || ''} ${u.cognome || ''}`.trim();
  return full || u.username;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(value: Date): string {
  return value.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function layoutOverlaps(tasks: Assegnazione[]) {
  const sorted = [...tasks].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const result = new Map<number, { column: number; columns: number }>();
  const active: Array<{ id: number; end: number; column: number }> = [];

  for (const task of sorted) {
    const start = new Date(task.startAt).getTime();
    const end = new Date(task.endAt).getTime();
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= start) active.splice(i, 1);
    }
    const used = new Set(active.map((x) => x.column));
    let column = 0;
    while (used.has(column)) column++;
    active.push({ id: task.id, end, column });
    const columns = Math.max(1, ...active.map((x) => x.column + 1));
    active.forEach((x) => result.set(x.id, { column: x.column, columns }));
  }
  return result;
}

export default function CalendarioComponent() {
  const { user } = useCurrentUser();
  const role = (user?.role || '').toUpperCase();
  const canManageTasks = role === 'ADMIN';
  const canInspectOperators = role === 'ADMIN' || role === 'SUPERVISORE';

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [assegnazioni, setAssegnazioni] = useState<Assegnazione[]>([]);
  const [deletedAssegnazioni, setDeletedAssegnazioni] = useState<Assegnazione[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
  const [selectedUtenteId, setSelectedUtenteId] = useState<number | ''>('');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [detail, setDetail] = useState<Assegnazione | null>(null);
  const [showAllegati, setShowAllegati] = useState(false);
  const [editing, setEditing] = useState<Assegnazione | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [materialDraft, setMaterialDraft] = useState<Record<number, string>>({});
  const [showOperatorMaterials, setShowOperatorMaterials] = useState<Record<number, boolean>>({});
  const [showOperatorAllegati, setShowOperatorAllegati] = useState<Record<number, boolean>>({});
  const [adminView, setAdminView] = useState<'grid' | 'summary'>('grid');
  const isMobilePortrait = useMediaQuery('(max-width:700px) and (orientation: portrait)');

  const rangeDays = isMobilePortrait ? 3 : 7;
  const weekDays = useMemo(() => Array.from({ length: rangeDays }, (_, i) => addDays(weekStart, i)), [rangeDays, weekStart]);
  const visibleWeekDays = weekDays;
  const weekEnd = useMemo(() => addDays(weekStart, rangeDays), [rangeDays, weekStart]);

  useEffect(() => {
    setWeekStart(isMobilePortrait ? startOfDay(new Date()) : startOfWeek(new Date()));
  }, [isMobilePortrait]);

  const load = useCallback(async () => {
    const summaryRange = role !== 'ADMIN' || adminView === 'summary';
    const rangeStart = summaryRange ? startOfDay(new Date()) : weekStart;
    const rangeEnd = summaryRange ? addDays(rangeStart, 15) : weekEnd;
    const from = toInputValue(rangeStart);
    const to = toInputValue(rangeEnd);
    setDataLoading(true);
    try {
      const a = await apiJson<Assegnazione[]>(`/api/assegnazione?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      setAssegnazioni(a);

      if (role === 'ADMIN') {
        const [cl, ca, v, ov, users, deleted] = await Promise.all([
          apiJson<Cliente[]>('/api/cliente'),
          apiJson<Cantiere[]>('/api/cantiere'),
          apiJson<Veicolo[]>('/api/veicolo'),
          apiJson<DashboardOverview>('/api/dashboard/overview'),
          apiJson<Utente[]>('/api/utenti/dipendenti'),
          apiJson<Assegnazione[]>('/api/assegnazione/deleted'),
        ]);
        setClienti(cl);
        setCantieri(ca);
        setVeicoli(v);
        setOverview(ov);
        setUtenti(users);
        setDeletedAssegnazioni(deleted);
      } else if (role === 'SUPERVISORE') {
        const users = await apiJson<Utente[]>('/api/utenti/dipendenti');
        setUtenti(users);
        setDeletedAssegnazioni([]);
        setOverview(null);
      } else {
        setClienti([]);
        setCantieri([]);
        setVeicoli([]);
        setUtenti([]);
        setDeletedAssegnazioni([]);
        setOverview(null);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Errore caricamento calendario');
    } finally {
      setDataLoading(false);
    }
  }, [adminView, role, weekEnd, weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  useBroadcastRefresh(load);

  useEffect(() => {
    if (!canManageTasks || !form.startAt || !form.endAt) {
      setAvailability(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await apiJson<AvailabilityResponse>('/api/assegnazione/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startAt: form.startAt,
            endAt: form.endAt,
            membroIds: utenti.map((u) => u.id),
            veicoloIds: veicoli.map((v) => v.id),
            excludeAssegnazioneId: editing?.id || null,
          }),
        });
        setAvailability(res);
      } catch {
        setAvailability(null);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [canManageTasks, editing?.id, form.endAt, form.startAt, utenti, veicoli]);

  const utenteMap = useMemo(() => new Map(utenti.map((u) => [u.id, userLabel(u)])), [utenti]);
  const veicoloMap = useMemo(() => new Map(veicoli.map((v) => [v.id, `${v.targa}${v.modello ? ` (${v.modello})` : ''}`])), [veicoli]);
  const cantieriFiltrati = useMemo(() => {
    if (!form.clienteId) return [];
    return cantieri.filter((c) => c.cliente?.id === form.clienteId);
  }, [cantieri, form.clienteId]);
  const membriOccupati = new Set(availability?.membriOccupati || []);
  const veicoliOccupati = new Set(availability?.veicoliOccupati || []);

  const team = (a: Assegnazione) => a.membroNomi?.length ? a.membroNomi.join(', ') : (a.membroIds || []).map((id) => utenteMap.get(id) || id).join(', ');
  const vehicleLabels = (a: Assegnazione) => a.veicoloNomi?.length ? a.veicoloNomi.join(', ') : (a.veicoloIds || []).map((id) => veicoloMap.get(id) || id).join(', ');
  const visibleAssegnazioni = useMemo(() => {
    if (canInspectOperators && selectedUtenteId) return assegnazioni.filter((a) => a.membroIds.includes(Number(selectedUtenteId)));
    return assegnazioni;
  }, [assegnazioni, canInspectOperators, selectedUtenteId]);
  const operatorAssignments = useMemo(() => {
    const nowDate = new Date();
    const now = nowDate.getTime();
    const candidates = visibleAssegnazioni
      .filter((a) => new Date(a.endAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const todayKey = dateKey(nowDate);
    const today = candidates.filter((a) => dateKey(new Date(a.startAt)) === todayKey);
    if (today.length) return today;
    const nextKey = candidates.length ? dateKey(new Date(candidates[0].startAt)) : '';
    return candidates.filter((a) => dateKey(new Date(a.startAt)) === nextKey);
  }, [visibleAssegnazioni]);

  const openNewAt = (start: Date) => {
    setEditing(null);
    setStep(0);
    setAvailability(null);
    setForm({ ...emptyForm, startAt: toInputValue(start), endAt: toInputValue(addHours(start, 2)) });
    setOpen(true);
  };

  const openNewNow = () => openNewAt(new Date());

  const openEdit = (a: Assegnazione) => {
    const cantiere = cantieri.find((c) => c.id === a.cantiereId);
    setEditing(a);
    setStep(0);
    setForm({
      clienteId: cantiere?.cliente?.id || '',
      cantiereId: a.cantiereId,
      startAt: toInputValue(new Date(a.startAt)),
      endAt: toInputValue(new Date(a.endAt)),
      note: a.note || '',
      materialiNote: a.materialiNote || '',
      membroIds: a.membroIds || [],
      veicoloIds: a.veicoloIds || [],
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setAvailability(null);
    setStep(0);
  };

  const setDuration = (hours: number) => {
    if (!form.startAt) return;
    setForm((p) => ({ ...p, endAt: toInputValue(addHours(parseInput(p.startAt), hours)) }));
  };

  const save = async () => {
    if (!form.cantiereId || !form.startAt || !form.endAt) return alert('Cantiere e orari sono obbligatori');
    const selectedUnavailable = form.membroIds.some((id) => membriOccupati.has(id)) || form.veicoloIds.some((id) => veicoliOccupati.has(id));
    if (selectedUnavailable) return alert('Hai selezionato almeno una persona o un veicolo non disponibile.');

    setLoading(true);
    try {
      const res = await apiFetch(editing?.id ? `/api/assegnazione/${editing.id}` : '/api/assegnazione', {
        method: editing?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantiereId: form.cantiereId,
          startAt: form.startAt,
          endAt: form.endAt,
          note: form.note,
          materialiNote: form.materialiNote,
          membroIds: form.membroIds,
          veicoloIds: form.veicoloIds,
        }),
      });
      if (!res.ok) throw new Error((await safeReadText(res)) || 'Errore salvataggio task');
      closeDialog();
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Errore salvataggio task');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (a: Assegnazione) => {
    if (!confirm(`Eliminare il task ${a.cantiereNome}?\n\nIl task verra spostato negli elementi eliminati e potrai ripristinarlo finche non esegui la pulizia definitiva.`)) return;
    const res = await apiFetch(`/api/assegnazione/${a.id}`, { method: 'DELETE' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore eliminazione task');
    setDetail(null);
    await load();
  };

  const restore = async (a: Assegnazione) => {
    const res = await apiFetch(`/api/assegnazione/${a.id}/restore`, { method: 'PUT' });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore ripristino task');
    await load();
  };

  const openDetail = (a: Assegnazione) => {
    setDetail(a);
    setShowAllegati(false);
  };

  const saveMaterialiNote = async (id: number, note: string) => {
    const res = await apiFetch(`/api/assegnazione/${id}/materiali-note`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: note,
    });
    if (!res.ok) return alert((await safeReadText(res)) || 'Errore aggiornamento materiali');
    setMaterialDraft((prev) => ({ ...prev, [id]: note }));
    await load();
  };

  const renderTask = (task: Assegnazione, layout: { column: number; columns: number }) => {
    const start = new Date(task.startAt);
    const end = new Date(task.endAt);
    const top = Math.max(0, ((start.getHours() - HOURS[0]) * 60 + start.getMinutes()) / 60 * ROW_HEIGHT);
    const durationMinutes = Math.max(30, (end.getTime() - start.getTime()) / 60000);
    const height = Math.max(40, durationMinutes / 60 * ROW_HEIGHT - 4);
    const width = `calc((100% - 12px) / ${layout.columns})`;
    const left = `calc(6px + ${layout.column} * ((100% - 12px) / ${layout.columns}))`;
    const hideText = layout.columns >= 4 || (typeof window !== 'undefined' && window.innerWidth < 700 && layout.columns >= 3);
    return (
      <Tooltip key={task.id} title={`${team(task) || 'Squadra da definire'} | ${vehicleLabels(task) || 'Nessun veicolo'}`}>
        <Paper
          onClick={(e) => {
            e.stopPropagation();
            openDetail(task);
          }}
          elevation={0}
          sx={{
            position: 'absolute',
            left,
            width,
            top,
            height,
            p: 1,
            overflow: 'hidden',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.light',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            cursor: 'pointer',
          }}
        >
          {!hideText && (
            <>
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ display: 'block', whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.15 }}
              >
                {formatTime(task.startAt)} {task.cantiereNome}
              </Typography>
              <Typography
                variant="caption"
                display="block"
                sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.15 }}
              >
                {team(task) || 'Squadra da definire'}
              </Typography>
            </>
          )}
        </Paper>
      </Tooltip>
    );
  };

  const renderOperatorSummary = () => (
    <Stack spacing={2} sx={{ pb: { xs: 8, md: 0 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="h5" fontWeight={700}>{canInspectOperators ? 'Riepilogo squadra' : 'Il mio prossimo lavoro'}</Typography>
            <Typography variant="body2" color="text.secondary">Task corrente o prossimi task assegnati.</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {canInspectOperators && (
              <Select size="small" value={selectedUtenteId} displayEmpty onChange={(e) => setSelectedUtenteId(e.target.value as number | '')} sx={{ minWidth: 260 }}>
                <MenuItem value="">Tutti i dipendenti</MenuItem>
                {utenti.map((u) => <MenuItem key={u.id} value={u.id}>{userLabel(u)}</MenuItem>)}
              </Select>
            )}
            {role === 'ADMIN' && <Button variant="outlined" onClick={() => setAdminView('grid')}>Torna alla griglia</Button>}
          </Stack>
        </Stack>
      </Paper>
      {operatorAssignments.map((a) => {
        const materialOpen = Boolean(showOperatorMaterials[a.id]);
        const allegatiOpen = Boolean(showOperatorAllegati[a.id]);
        const draft = materialDraft[a.id] ?? a.materialiNote ?? '';
        return (
        <Paper key={a.id} elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" fontWeight={800}>{a.cantiereNome}</Typography>
            <Typography color="text.secondary">{new Date(a.startAt).toLocaleString('it-IT')} - {new Date(a.endAt).toLocaleString('it-IT')}</Typography>
            <Typography><strong>Squadra:</strong> {team(a) || '-'}</Typography>
            <Typography><strong>Veicoli:</strong> {vehicleLabels(a) || '-'}</Typography>
            {a.note && <Alert severity="info">{a.note}</Alert>}
            <Stack spacing={1}>
              <Button variant="outlined" onClick={() => setShowOperatorMaterials((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}>
                {materialOpen ? 'Nascondi materiali' : 'Materiali e indicazioni'}
              </Button>
              {materialOpen && (
              <Stack spacing={1}>
                <TextField
                  multiline
                  minRows={3}
                  label="Materiali, attrezzature o indicazioni"
                  value={draft}
                  onChange={(e) => setMaterialDraft((prev) => ({ ...prev, [a.id]: e.target.value }))}
                  fullWidth
                />
                <Button variant="contained" onClick={() => saveMaterialiNote(a.id, draft)}>Salva materiali</Button>
              </Stack>
              )}
            </Stack>
            <Divider />
            <Button variant="outlined" onClick={() => setShowOperatorAllegati((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}>
              {allegatiOpen ? 'Nascondi allegati' : 'Mostra allegati cantiere'}
            </Button>
            {allegatiOpen && <CantiereAllegati cantiereId={a.cantiereId} uploadAssegnazioneId={a.id} canUpload title="Allegati" />}
          </Stack>
        </Paper>
        );
      })}
      {operatorAssignments.length === 0 && <Alert severity="info">Nessun task corrente o futuro assegnato.</Alert>}
    </Stack>
  );

  if (role !== 'ADMIN' || adminView === 'summary') {
    return renderOperatorSummary();
  }

  return (
    <Stack spacing={2} sx={{ pb: { xs: 8, md: 0 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Cruscotto operativo</Typography>
            <Typography variant="body2" color="text.secondary">Settimana e task di cantiere.</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" onClick={() => {
              setSelectedUtenteId(user?.id || '');
              setAdminView('summary');
            }}>Le mie assegnazioni</Button>
            <Button variant="contained" onClick={openNewNow}>Nuovo task</Button>
          </Stack>
        </Stack>
        {overview && (
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
            <Chip label={`Oggi ${overview.assegnazioniOggi}`} color="primary" />
            <Chip label={`Cantieri ${overview.cantieriAttivi}`} />
            <Chip label={`Veicoli ${overview.veicoliAttivi}`} />
          </Stack>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }} alignItems={{ sm: 'center' }}>
          <Typography variant="body2" color="text.secondary">Filtro griglia</Typography>
          <Select size="small" value={selectedUtenteId} displayEmpty onChange={(e) => setSelectedUtenteId(e.target.value as number | '')} sx={{ minWidth: 260 }}>
            <MenuItem value="">Tutti i dipendenti</MenuItem>
            {utenti.map((u) => <MenuItem key={u.id} value={u.id}>{userLabel(u)}</MenuItem>)}
          </Select>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={1.5} spacing={1}>
          <Button startIcon={<ChevronLeft />} onClick={() => setWeekStart(addDays(weekStart, -rangeDays))}>{isMobilePortrait ? '3 giorni prima' : 'Settimana prima'}</Button>
          <Typography fontWeight={700} textAlign="center">
            {weekStart.toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })} - {addDays(weekStart, rangeDays - 1).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}
          </Typography>
          <Button endIcon={<ChevronRight />} onClick={() => setWeekStart(addDays(weekStart, rangeDays))}>{isMobilePortrait ? '3 giorni dopo' : 'Settimana dopo'}</Button>
        </Stack>

        <Box sx={{ overflowX: 'hidden', pb: 1, width: '100%' }}>
          <Box
            sx={{
              minWidth: '100%',
              display: 'grid',
              gridTemplateColumns: {
                xs: `42px repeat(${visibleWeekDays.length}, minmax(0, 1fr))`,
                md: `64px repeat(${visibleWeekDays.length}, minmax(110px, 1fr))`,
              },
              borderTop: '1px solid',
              borderLeft: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ p: 1, borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }} />
            {visibleWeekDays.map((day) => (
              <Box key={day.toISOString()} sx={{ p: 1, borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider', bgcolor: sameDay(day, new Date()) ? 'action.hover' : 'background.paper' }}>
                <Typography variant="caption" fontWeight={700} textTransform="capitalize">{formatDay(day)}</Typography>
              </Box>
            ))}
            <Box sx={{ display: 'grid', gridTemplateRows: `repeat(${HOURS.length}, ${ROW_HEIGHT}px)` }}>
              {HOURS.map((h) => <Box key={h} sx={{ px: 1, borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}><Typography variant="caption">{pad(h)}:00</Typography></Box>)}
            </Box>
            {visibleWeekDays.map((day) => (
              <Box key={day.toISOString()} sx={{ position: 'relative', height: HOURS.length * ROW_HEIGHT, borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
                {HOURS.map((h) => (
                  <Box
                    key={h}
                    onClick={() => {
                      if (!canManageTasks) return;
                      const start = new Date(day);
                      start.setHours(h, 0, 0, 0);
                      openNewAt(start);
                    }}
                    sx={{
                      height: ROW_HEIGHT,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      cursor: canManageTasks ? 'copy' : 'default',
                      '&:hover': canManageTasks ? { bgcolor: 'action.hover' } : undefined,
                    }}
                  />
                ))}
                {(() => {
                  const tasks = visibleAssegnazioni.filter((a) => sameDay(new Date(a.startAt), day));
                  const layout = layoutOverlaps(tasks);
                  return tasks.map((task) => renderTask(task, layout.get(task.id) || { column: 0, columns: 1 }));
                })()}
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {canManageTasks && (
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>Task eliminati</Typography>
            <Button onClick={() => setShowDeleted((v) => !v)} endIcon={showDeleted ? <ExpandLess /> : <ExpandMore />}>Elementi eliminati</Button>
          </Stack>
          {showDeleted && (
            <Stack spacing={1} mt={1}>
              {deletedAssegnazioni.map((a) => (
                <Stack key={a.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ p: 1.2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Box>
                    <Typography fontWeight={700}>{a.cantiereNome}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Inizio: {new Date(a.startAt).toLocaleString('it-IT')} | Fine: {new Date(a.endAt).toLocaleString('it-IT')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Squadra: {team(a) || '-'}</Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => restore(a)}>Ripristina</Button>
                </Stack>
              ))}
              {deletedAssegnazioni.length === 0 && <Typography variant="body2" color="text.secondary">Nessun task eliminato.</Typography>}
            </Stack>
          )}
        </Paper>
      )}

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="sm" fullScreen={typeof window !== 'undefined' && window.innerWidth < 700}>
        <DialogTitle>{detail?.cantiereNome}</DialogTitle>
        <DialogContent>
          {detail && (
            <Stack spacing={2}>
              <Typography variant="body2">{formatTime(detail.startAt)} - {formatTime(detail.endAt)}</Typography>
              <Typography><strong>Squadra:</strong> {team(detail) || '-'}</Typography>
              <Typography><strong>Veicoli:</strong> {vehicleLabels(detail) || '-'}</Typography>
              {detail.note && <Alert severity="info">{detail.note}</Alert>}
              <Stack spacing={1}>
                <Typography fontWeight={700}>Materiali e indicazioni</Typography>
                <TextField
                  multiline
                  minRows={3}
                  value={materialDraft[detail.id] ?? detail.materialiNote ?? ''}
                  onChange={(e) => setMaterialDraft((prev) => ({ ...prev, [detail.id]: e.target.value }))}
                  fullWidth
                  placeholder="Es. portare scala, cavo, frutti, tubazione..."
                />
                <Button variant="contained" onClick={async () => {
                  await saveMaterialiNote(detail.id, materialDraft[detail.id] ?? detail.materialiNote ?? '');
                  setDetail((prev) => prev ? { ...prev, materialiNote: materialDraft[detail.id] ?? prev.materialiNote ?? '' } : prev);
                }}>Salva materiali</Button>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={700}>Allegati cantiere</Typography>
                <Button size="small" onClick={() => setShowAllegati((v) => !v)}>{showAllegati ? 'Nascondi' : 'Mostra'}</Button>
              </Stack>
              {showAllegati && (
                <CantiereAllegati cantiereId={detail.cantiereId} uploadAssegnazioneId={detail.id} canUpload canDelete={canManageTasks} />
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {canManageTasks && detail && (
            <>
              <Button onClick={() => openEdit(detail)} startIcon={<Edit />}>Modifica</Button>
              <Button color="error" onClick={() => remove(detail)} startIcon={<Delete />}>Elimina</Button>
            </>
          )}
          <Button onClick={() => setDetail(null)}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="md" fullScreen={typeof window !== 'undefined' && window.innerWidth < 700}>
        <DialogTitle>{editing ? 'Modifica task' : 'Nuovo task'}</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {step === 0 && (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField type="datetime-local" label="Inizio" value={form.startAt} onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
                <TextField type="datetime-local" label="Fine" value={form.endAt} onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {[2, 4, 6, 8].map((h) => <Button key={h} variant="outlined" onClick={() => setDuration(h)}>{h}h</Button>)}
              </Stack>
              <Autocomplete
                options={clienti}
                value={clienti.find((c) => c.id === form.clienteId) || null}
                getOptionLabel={(option) => option.nome}
                loading={dataLoading}
                disabled={dataLoading}
                onChange={(_, value) => setForm((p) => ({ ...p, clienteId: value?.id || '', cantiereId: '' }))}
                renderInput={(params) => <TextField {...params} label={dataLoading ? 'Caricamento clienti...' : 'Cliente'} />}
              />
              <Autocomplete
                options={cantieriFiltrati}
                value={cantieriFiltrati.find((c) => c.id === form.cantiereId) || null}
                getOptionLabel={(option) => option.nome}
                disabled={dataLoading || !form.clienteId}
                onChange={(_, value) => setForm((p) => ({ ...p, cantiereId: value?.id || '' }))}
                renderInput={(params) => <TextField {...params} label={dataLoading ? 'Caricamento cantieri...' : form.clienteId ? 'Cantiere' : 'Scegli prima un cliente'} />}
              />
            </Stack>
          )}

          {step === 1 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">Gli elementi non disponibili restano visibili, ma non selezionabili.</Typography>
              <Select multiple disabled={dataLoading} value={form.membroIds} onChange={(e) => setForm((p) => ({ ...p, membroIds: e.target.value as number[] }))} size="small" renderValue={(selected) => (selected as number[]).map((id) => utenteMap.get(id) || id).join(', ')}>
                {utenti.map((u) => {
                  const unavailable = membriOccupati.has(u.id);
                  return <MenuItem key={u.id} value={u.id} disabled={unavailable}>{unavailable && <WarningAmber fontSize="small" color="warning" sx={{ mr: 1 }} />}{userLabel(u)}{unavailable ? ' - non disponibile' : ''}</MenuItem>;
                })}
              </Select>
              <Select multiple disabled={dataLoading} value={form.veicoloIds} onChange={(e) => setForm((p) => ({ ...p, veicoloIds: e.target.value as number[] }))} size="small" renderValue={(selected) => (selected as number[]).map((id) => veicoloMap.get(id) || id).join(', ')}>
                {veicoli.map((v) => {
                  const unavailable = veicoliOccupati.has(v.id);
                  return <MenuItem key={v.id} value={v.id} disabled={unavailable}>{unavailable && <WarningAmber fontSize="small" color="warning" sx={{ mr: 1 }} />}{veicoloMap.get(v.id)}{unavailable ? ' - non disponibile' : ''}</MenuItem>;
                })}
              </Select>
              {availability && <Alert severity={availability.disponibili ? 'success' : 'warning'}>{availability.disponibili ? 'Tutto disponibile nello slot selezionato.' : 'Alcune risorse risultano occupate o assenti nello slot selezionato.'}</Alert>}
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={2}>
              <TextField multiline minRows={2} label="Note operative" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} fullWidth />
              <TextField
                multiline
                minRows={4}
                label="Materiali, attrezzature o indicazioni"
                value={form.materialiNote}
                onChange={(e) => setForm((p) => ({ ...p, materialiNote: e.target.value }))}
                fullWidth
                placeholder="Scrivi qui cosa serve portare o cosa e stato usato. Esempio: 20m cavo 2.5, 6 frutti, trapano, scala..."
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annulla</Button>
          <Button disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Indietro</Button>
          {step < steps.length - 1 ? (
            <Button variant="contained" onClick={() => setStep((s) => s + 1)} disabled={step === 0 && (!form.startAt || !form.endAt || !form.cantiereId)}>Avanti</Button>
          ) : (
            <Button variant="contained" onClick={save} disabled={loading}>{loading ? 'Salvataggio...' : 'Salva task'}</Button>
          )}
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
