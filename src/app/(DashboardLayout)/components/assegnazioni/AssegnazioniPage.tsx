'use client';

import { useWS } from '@/app/(DashboardLayout)/ws/WSContext';
import { IMessage } from '@stomp/stompjs'; // solo il tipo per il callback

import React, { useEffect, useState, useRef, useCallback,  } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ArrowBack,
  ArrowForward,
  PictureAsPdf,
  PhotoCamera,
} from '@mui/icons-material';
import imageCompression from 'browser-image-compression';

interface Utente {
  id: number;
  nome: string;
  cognome?: string;
  ruolo: 'ADMIN' | 'SUPERVISORE' | 'DIPENDENTE';
}

interface Commessa {
  id: number;
  codice: string;
  descrizione?: string;
  pdfAllegato?: { id: number; nomeFile: string; storagePath: string };
}

interface Cliente {
  id: number;
  nome: string;
}

interface Allegato {
  id: number;
  nomeFile: string;
  storagePath: string;
}

interface Assegnazione {
  id: number;
  commessa: Commessa;
  cliente: Cliente;
  utente: Utente;
  assegnatoDa: Utente;
  assegnazioneAt: string;
  startAt?: string;
  endAt?: string;
  fotoAllegato?: Allegato;
  note?: string;
  isDeleted?: boolean;
}

const AssegnazioniPage = () => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [assegnazioni, setAssegnazioni] = useState<Assegnazione[]>([]);
  const [dipendenti, setDipendenti] = useState<Utente[]>([]);
  const [selectedDipendente, setSelectedDipendente] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [ruolo, setRuolo] = useState<'ADMIN' | 'SUPERVISORE' | 'DIPENDENTE'>('DIPENDENTE');
  const [utenteCorrente, setUtenteCorrente] = useState<Utente | null>(null);

  // form principale
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Assegnazione | null>(null);
  const [formData, setFormData] = useState<{ commessa?: Commessa; cliente?: Cliente; note: string }>({
    note: '',
  });

  // modali di selezione
  const [openCommessaModal, setOpenCommessaModal] = useState(false);
  const [openClienteModal, setOpenClienteModal] = useState(false);

  // dati per modali
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [searchCommessa, setSearchCommessa] = useState('');
  const [searchCliente, setSearchCliente] = useState('');

  // delete confirm dialog
  const [confirmDelete, setConfirmDelete] = useState<Assegnazione | null>(null);

  // dialog conferma start/end
  const [confirmAction, setConfirmAction] = useState<{ tipo: 'start' | 'end'; assegnazione: Assegnazione } | null>(null);

  // snackbar feedback
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' }>(
    { open: false, message: '', severity: 'success' }
  );

  const [loadingAssignments, setLoadingAssignments] = useState(false);

const loadCommesse = async () => {
  if (commesse.length > 0) return; // se già caricate, non rifare fetch
  try {
    const res = await fetch(`${backendUrl}/api/commesse`, { credentials: 'include' });
    if (!res.ok) throw new Error('Errore fetch commesse');
    const data: Commessa[] = await res.json();
    setCommesse(data);
  } catch (e) {
    setSnack({ open: true, message: 'Errore caricando commesse', severity: 'error' });
  }
};

const loadClienti = async () => {
  if (clienti.length > 0) return; // se già caricati, non rifare fetch
  try {
    const res = await fetch(`${backendUrl}/api/clienti`, { credentials: 'include' });
    if (!res.ok) throw new Error('Errore fetch clienti');
    const data: Cliente[] = await res.json();
    setClienti(data);
  } catch (e) {
    setSnack({ open: true, message: 'Errore caricando clienti', severity: 'error' });
  }
};

const filteredCommesse = commesse.filter(c =>
  c.codice.toLowerCase().includes(searchCommessa.toLowerCase()) ||
  (c.descrizione?.toLowerCase().includes(searchCommessa.toLowerCase()))
);

const filteredClienti = clienti.filter(c =>
  c.nome.toLowerCase().includes(searchCliente.toLowerCase())
);





useEffect(() => {
  const loadInitialData = async () => {
    // Recupera utente corrente
    const userRes = await fetch(`${backendUrl}/auth/me`, { credentials: 'include' });
    const userData = await userRes.json();
    setUtenteCorrente(userData);
    setRuolo(userData.role);

    // Recupera solo dipendenti
    const dipRes = await fetch(`${backendUrl}/api/utenti/dipendenti`, { credentials: 'include' });
    const dipList: Utente[] = await dipRes.json();
    setDipendenti(dipList);

    // Setta selectedDipendente in base al ruolo
    if (userData.role === 'ADMIN' || userData.role === 'SUPERVISORE') {
      setSelectedDipendente(dipList.length > 0 ? dipList[0].id : null);
    } else {
      setSelectedDipendente(userData.id);
    }
  };
  loadInitialData();
}, [backendUrl]);


const fetchAssignments = useCallback(async () => {
  if (!selectedDipendente) return;

  setLoadingAssignments(true);

  const dateParam = selectedDate.toISOString().split('T')[0];
  const url = `${backendUrl}/api/assegnazioni?utenteId=${selectedDipendente}&date=${dateParam}`;

  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      setSnack({ open: true, message: 'Errore nel recuperare le assegnazioni', severity: 'error' });
      setAssegnazioni([]);
      return;
    }
    const data = await res.json();
    data.sort((a: Assegnazione, b: Assegnazione) => new Date(a.assegnazioneAt).getTime() - new Date(b.assegnazioneAt).getTime());
    setAssegnazioni(data);
  } catch (e) {
    setSnack({ open: true, message: 'Errore di rete', severity: 'error' });
    setAssegnazioni([]);
  } finally {
    setLoadingAssignments(false);
  }
}, [selectedDipendente, selectedDate, backendUrl]);



useEffect(() => {
  fetchAssignments();
}, [fetchAssignments]);

// subscribe al broadcast globale (usa subscribe fornito dal WSProvider)
const { subscribe } = useWS();

useEffect(() => {
  const unsubscribe = subscribe((msg: IMessage) => {
    try {
      const payload = msg.body ? JSON.parse(msg.body) : {};
      const tipo = payload.tipoEvento ?? payload.tipo ?? payload.tipo_evento;
      if (tipo === 'REFRESH' || tipo === 'MSG_REFRESH') {
        // rifetcha i dati (fetchAssignments è già definita)
        fetchAssignments();
      }
    } catch (e) {
      console.warn('WS message parse error', e);
    }
  });
  return () => unsubscribe();
}, [subscribe, fetchAssignments]);

  // navigazione date
  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // stato assegnazione
  const getStatus = (a: Assegnazione) => {
    if (a.endAt) {
      const elapsed = a.startAt ? Math.floor((new Date(a.endAt).getTime() - new Date(a.startAt).getTime()) / 60000) : 0;
      return `Completata (${elapsed} min)`;
    }
    if (a.startAt) return 'In corso';
    return 'Non iniziata';
  };
  const statusColor = (a: Assegnazione) => {
    if (a.endAt) return 'success.main';
    if (a.startAt) return 'info.main';
    return 'grey.500';
  };

  // azioni dipendente
  const handleStart = async (a: Assegnazione) => {
    const res = await fetch(`${backendUrl}/api/assegnazioni/${a.id}/start`, { method: 'PUT', credentials: 'include' });
    if (!res.ok) {
      setSnack({ open: true, message: 'Errore avviando l\'assegnazione', severity: 'error' });
      return;
    }
    setAssegnazioni(prev => prev.map(x => (x.id === a.id ? { ...x, startAt: new Date().toISOString() } : x)));
    setSnack({ open: true, message: 'Assegnazione avviata', severity: 'success' });
  };

  const handleEnd = async (a: Assegnazione) => {
    if (!a.fotoAllegato) {
      setSnack({ open: true, message: 'Devi caricare un allegato prima di terminare', severity: 'error' });
      return;
    }
    const res = await fetch(`${backendUrl}/api/assegnazioni/${a.id}/end`, { method: 'PUT', credentials: 'include' });
    if (!res.ok) {
      setSnack({ open: true, message: 'Errore terminando l\'assegnazione', severity: 'error' });
      return;
    }
    setAssegnazioni(prev => prev.map(x => (x.id === a.id ? { ...x, endAt: new Date().toISOString() } : x)));
    setSnack({ open: true, message: 'Assegnazione terminata', severity: 'success' });
  };

const handleUploadFoto = async (id: number, file: File) => {
  if (!file) return;

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    setSnack({ open: true, message: "Il file deve essere un'immagine JPEG/PNG/WebP", severity: 'error' });
    return;
  }

  // Se il file supera 0.5MB → comprimi
  const MAX_SIZE_MB = 0.5;

  let fileToUpload = file;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    try {
      const options = {
        maxSizeMB: MAX_SIZE_MB,
        maxWidthOrHeight: 1920, // riduce dimensione se serve
        useWebWorker: true,
        initialQuality: 0.7, // qualità iniziale
      };
      const compressed = await imageCompression(file, options);

      if (compressed.size > MAX_SIZE_MB * 1024 * 1024) {
        setSnack({ open: true, message: "Impossibile comprimere sotto 0.5MB, riduci la risoluzione", severity: 'error' });
        return;
      }

      fileToUpload = new File([compressed], file.name, { type: file.type });
      setSnack({ open: true, message: 'Foto compressa con successo', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnack({ open: true, message: 'Errore durante la compressione', severity: 'error' });
      return;
    }
  }

  const fd = new FormData();
  fd.append('file', fileToUpload);

  try {
    const res = await fetch(`${backendUrl}/api/assegnazioni/${id}/upload-foto`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });

    if (res.ok) {
      setSnack({ open: true, message: 'Foto caricata!', severity: 'success' });
      // rifetcha assegnazioni
      const dateParam = selectedDate.toISOString().split('T')[0];
      const url = `${backendUrl}/api/assegnazioni?utenteId=${selectedDipendente}&date=${dateParam}`;
      const refetch = await fetch(url, { credentials: 'include' });
      if (refetch.ok) setAssegnazioni(await refetch.json());
    } else {
      let text = 'Errore caricamento foto';
      try { text = await res.text() || res.statusText || text; } catch {}
      setSnack({ open: true, message: text, severity: 'error' });
    }
  } catch (e) {
    setSnack({ open: true, message: "Errore di rete durante l'upload", severity: 'error' });
  }
};


  // gestione form
  const handleOpenForm = (a?: Assegnazione) => {
    if (a) {
      setEditing(a);
      setFormData({
        commessa: a.commessa,
        cliente: a.cliente,
        note: a.note || '',
      });
    } else {
      setEditing(null);
      setFormData({ note: '' });
    }
    setOpenForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${backendUrl}/api/assegnazioni/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        setSnack({ open: true, message: 'Errore durante l\'eliminazione', severity: 'error' });
        return;
      }
      setAssegnazioni(prev => prev.filter(a => a.id !== id));
      setSnack({ open: true, message: 'Assegnazione eliminata', severity: 'success' });
    } catch (e) {
      setSnack({ open: true, message: 'Errore di rete', severity: 'error' });
    }
  };

  const handleSubmit = async () => {
    if (!formData.commessa || !formData.cliente) {
      setSnack({ open: true, message: 'Seleziona commessa e cliente', severity: 'error' });
      return;
    }

    const body: any = {
      commessaId: formData.commessa.id,
      clienteId: formData.cliente.id,
      utenteId: selectedDipendente,
      note: formData.note,
      assegnazioneAt: selectedDate.toISOString(),
    };

    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${backendUrl}/api/assegnazioni/${editing.id}` : `${backendUrl}/api/assegnazioni`;

    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setSnack({ open: true, message: 'Errore durante il salvataggio', severity: 'error' });
      return;
    }

    setOpenForm(false);
    setEditing(null);

    if (selectedDipendente) {
      const dateParam = selectedDate.toISOString().split('T')[0];
      const refetchUrl = `${backendUrl}/api/assegnazioni?utenteId=${selectedDipendente}&date=${dateParam}`;

      const refetch = await fetch(refetchUrl, { credentials: 'include' });
      if (refetch.ok) {
        const data = await refetch.json();
        data.sort((a: Assegnazione, b: Assegnazione) => new Date(a.assegnazioneAt).getTime() - new Date(b.assegnazioneAt).getTime());
        setAssegnazioni(data);
        setSnack({ open: true, message: 'Assegnazione salvata', severity: 'success' });
      }
    }
  };

  return (
    <Paper
  sx={{
    p: { xs: 2, md: 3 },        // padding adattivo
    borderRadius: 3,
    minHeight: '86vh',        // occupa tutta l'altezza della finestra
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',

    // larghezza responsive: pieno su mobile, limitato e centrato su desktop
    width: '100%',
    maxWidth: { xs: '100%', md: '95vw' }, // md e oltre: max 1200px (modificabile)
    minWidth: { md: '95vw', lg: 1200 },
    //mx: 'auto',

    // sfondo/ombra opzionali per maggiore contrasto su schermi grandi
    // backgroundColor: 'background.paper',
    // boxShadow: { xs: 'none', md: 1 },
  }}
>
  {/* HEADER */}
  <Box
    display="flex"
    flexWrap="wrap" // permette ai componenti di andare a capo se manca spazio
    justifyContent="space-between"
    alignItems="center"
    mb={3}
    gap={2}
  >
    <TextField
      select
      label="Dipendente"
      size="small"
      value={selectedDipendente ?? ''}
      onChange={e => setSelectedDipendente(Number(e.target.value))}
      disabled={ruolo === 'DIPENDENTE'}
      sx={{ width: 250, minWidth: 120 }}
    >
      {dipendenti.map(d => (
        <MenuItem key={d.id} value={d.id}>
          {d.nome} {d.cognome}
        </MenuItem>
      ))}
    </TextField>

    <Box display="flex" alignItems="center" gap={2}>
<IconButton onClick={() => changeDate(-1)} disabled={loadingAssignments}>
  <ArrowBack />
</IconButton>
      <Typography fontWeight={600}>
        {selectedDate.toLocaleDateString('it-IT', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
        })}
      </Typography>
<IconButton onClick={() => changeDate(1)} disabled={loadingAssignments}>
  <ArrowForward />
</IconButton>
    </Box>

    {ruolo === 'ADMIN' && (
      <Button startIcon={<Add />} variant="contained" size="small" onClick={() => handleOpenForm()}>
        Nuova assegnazione
      </Button>
    )}
  </Box>

  {/* LISTA */}
  <Box
    sx={{
      flexGrow: 1, // 2. Il contenitore delle card riempie tutto lo spazio rimanente
      overflowY: 'auto', // scrollbar se ci sono troppe card
    }}
  >
      {assegnazioni.length === 0 ? (
    <Typography textAlign="center" mt={5} color="text.secondary">
      Nessuna assegnazione trovata
    </Typography>
  ) : (
    <Grid container spacing={2}>
      {assegnazioni.map(a => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={a.id}>
          <Card
            variant="outlined"
            sx={{
              height: 250, // 3. Altezza fissa
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              wordBreak: 'break-word', // permette al testo di andare a capo se necessario
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600} noWrap={false}>
                {a.commessa.codice} — {a.cliente.nome}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1} sx={{ overflowWrap: 'break-word' }}>
                {a.note || 'Nessuna nota'}
              </Typography>
              <Typography mt={2} color={statusColor(a)} fontWeight={600}>
                {getStatus(a)}
              </Typography>
              {a.startAt && (
                <Typography variant="body2" color="text.secondary">
                  Inizio: {new Date(a.startAt).toLocaleTimeString('it-IT')}
                </Typography>
              )}
              {a.endAt && (
                <Typography variant="body2" color="text.secondary">
                  Fine: {new Date(a.endAt).toLocaleTimeString('it-IT')}
                </Typography>
              )}
              {a.fotoAllegato && !a.endAt && (
                <Typography variant="caption" color="text.secondary">
                  Allegato caricato, puoi terminare
                </Typography>
              )}
            </CardContent>
            <CardActions>
                {ruolo === 'ADMIN' && (
                  <>
                    <Tooltip title="Modifica">
                      <IconButton onClick={() => handleOpenForm(a)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Elimina">
                      <IconButton onClick={() => setConfirmDelete(a)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </>
                )}

                {ruolo === 'DIPENDENTE' && !a.startAt && (
                  <Button size="small" onClick={() => setConfirmAction({ tipo: 'start', assegnazione: a })}>
                    Inizia
                  </Button>
                )}
                {ruolo === 'DIPENDENTE' && a.startAt && !a.endAt && (
                  <>
                    <IconButton
                      component="label"
                      disabled={!!a.fotoAllegato}
                      title={a.fotoAllegato ? 'Foto già caricata' : 'Carica allegato prima di terminare'}
                    >
                      <PhotoCamera />
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={e => e.target.files && handleUploadFoto(a.id, e.target.files[0])}
                      />
                    </IconButton>
                    <Button
                      size="small"
                      onClick={() => setConfirmAction({ tipo: 'end', assegnazione: a })}
                      disabled={!a.fotoAllegato}
                    >
                      Termina
                    </Button>
                  </>
                )}

                {a.commessa.pdfAllegato ? (
                  <Tooltip title="Apri PDF Commessa">
                    <IconButton
                      component="a"
                      href={`${backendUrl}/api/commesse/${a.commessa.id}/allegato`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <PictureAsPdf />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Nessun PDF">
                    <PictureAsPdf sx={{ opacity: 0.3 }} />
                  </Tooltip>
                )}

                {(ruolo === 'ADMIN' || ruolo === 'SUPERVISORE' )&& a.fotoAllegato && a.endAt && (
                  <Tooltip title="Visualizza foto allegata">
                    <IconButton
                      component="a"
                      href={`${backendUrl}/api/assegnazioni/${a.id}/foto`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <PhotoCamera />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  )}
  </Box>


      {/* DIALOG NUOVA/MODIFICA */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Modifica Assegnazione' : 'Nuova Assegnazione'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <TextField
              label="Commessa"
              value={formData.commessa?.codice || ''}
              size="small"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setOpenCommessaModal(true);
                loadCommesse();
              }}
            >
              Seleziona
            </Button>
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            <TextField
              label="Cliente"
              value={formData.cliente?.nome || ''}
              size="small"
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setOpenClienteModal(true);
                loadClienti();
              }}
            >
              Seleziona
            </Button>
          </Box>

          <TextField
            label="Note"
            multiline
            minRows={2}
            value={formData.note}
            onChange={e => setFormData({ ...formData, note: e.target.value })}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Annulla</Button>
          <Button onClick={handleSubmit} variant="contained">
            Salva
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODALI SELEZIONE COMMESSE/CLIENTI */}
      <Dialog open={openCommessaModal} onClose={() => setOpenCommessaModal(false)} fullWidth maxWidth="md">
        <DialogTitle>Seleziona Commessa</DialogTitle>
        <DialogContent>
<TextField
  placeholder="Cerca per codice o descrizione"
  value={searchCommessa}
  onChange={e => setSearchCommessa(e.target.value)}
  fullWidth
  size="small"
  sx={{ mb: 2 }}
/>
          <Box display="flex" flexDirection="column" gap={1}>
            {filteredCommesse.map(c => (
              <Paper
                key={c.id}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#4d4d4dff' },
                }}
                onClick={() => {
                  setFormData({ ...formData, commessa: c });
                  setOpenCommessaModal(false);
                }}
              >
                <Typography>
                  {c.codice} — {c.descrizione}
                </Typography>
                {c.pdfAllegato && (
                  <IconButton
                    onClick={e => {
                      e.stopPropagation();
                      window.open(`${backendUrl}/api/commesse/${c.id}/allegato`, '_blank');
                    }}
                  >
                    <PictureAsPdf fontSize="small" />
                  </IconButton>
                )}
              </Paper>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={openClienteModal} onClose={() => setOpenClienteModal(false)} fullWidth maxWidth="sm">
        <DialogTitle>Seleziona Cliente</DialogTitle>
        <DialogContent>
<TextField
  placeholder="Cerca cliente per nome"
  value={searchCliente}
  onChange={e => setSearchCliente(e.target.value)}
  fullWidth
  size="small"
  sx={{ mb: 2 }}
/>
          <Box display="flex" flexDirection="column" gap={1}>
            {filteredClienti.map(c => (
              <Paper
                key={c.id}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#4d4d4dff' },
                }}
                onClick={() => {
                  setFormData({ ...formData, cliente: c });
                  setOpenClienteModal(false);
                }}
              >
                <Typography>{c.nome}</Typography>
              </Paper>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Dialog conferma eliminazione */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <Typography>
            Vuoi davvero eliminare l&apos;assegnazione <strong>{confirmDelete?.commessa.codice}</strong> per{' '}
            <strong>{confirmDelete?.cliente.nome}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Annulla</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!confirmDelete) return;
              await handleDelete(confirmDelete.id);
              setConfirmDelete(null);
            }}
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog conferma start/end */}
      <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)}>
        <DialogTitle>Conferma azione</DialogTitle>
        <DialogContent>
          <Typography>
            Vuoi davvero {confirmAction?.tipo === 'start' ? 'iniziare' : 'terminare'} l&apos;assegnazione{' '}
            <strong>{confirmAction?.assegnazione.commessa.codice}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!confirmAction) return;
              if (confirmAction.tipo === 'start') await handleStart(confirmAction.assegnazione);
              else await handleEnd(confirmAction.assegnazione);
              setConfirmAction(null);
            }}
          >
            Conferma
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar feedback */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnack(prev => ({ ...prev, open: false }))} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default AssegnazioniPage;
