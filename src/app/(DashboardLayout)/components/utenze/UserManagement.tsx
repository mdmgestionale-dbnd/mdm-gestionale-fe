'use client';

import { useWS } from '@/app/(DashboardLayout)/ws/WSContext';
import { IMessage } from '@stomp/stompjs';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Button,
  TableContainer,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Stack,
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { apiFetch, apiJson } from '@/lib/api';

interface Utente {
  id: number;
  username: string;
  password?: string;
  livello: number;
  nome?: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  attivo: boolean;
  isDeleted?: boolean;
}

const ruoloLabel = (livello: number) => {
  switch (livello) {
    case 0:
      return <Chip label="Amministratore" color="primary" size="small" />;
    case 1:
      return <Chip label="Supervisore" color="info" size="small" />;
    case 2:
      return <Chip label="Dipendente" color="secondary" size="small" />;
    default:
      return <Chip label={`Ruolo ${livello}`} size="small" />;
  }
};

const UserManagement = ({ readOnly = false }: { readOnly?: boolean }) => {
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [deletedUtenti, setDeletedUtenti] = useState<Utente[]>([]);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Utente | null>(null);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Utente | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    livello: 2,
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    attivo: true,
  });

  const fetchUtenti = async () => {
    const data = await apiJson<Utente[]>('/api/utenti');

    // Filtra utenti attivi tranne superadmin
    const active = data.filter(u => !u.isDeleted && u.username !== 'superadmin');
    setUtenti(active);

    // Salva utenti cancellati per la modale
    const deleted = data.filter(u => u.isDeleted);
    setDeletedUtenti(deleted);
  };

  useEffect(() => {
    fetchUtenti();
  }, []);

    const { subscribe } = useWS();

  useEffect(() => {
    const unsubscribe = subscribe((msg: IMessage) => {
      try {
        const payload = msg.body ? JSON.parse(msg.body) : {};
        const tipo = payload.tipoEvento ?? payload.tipo ?? payload.tipo_evento;
        if (tipo === 'REFRESH' || tipo === 'MSG_REFRESH') {
          fetchUtenti();
        }
      } catch (e) {
        console.warn('Errore parsing messaggio WS', e);
      }
    });

    return () => unsubscribe();
  }, [subscribe]);


  const handleOpenForm = (utente?: Utente) => {
    if (utente) {
      setEditingUser(utente);
      setFormData({
        username: utente.username,
        password: '',
        livello: utente.livello,
        nome: utente.nome || '',
        cognome: utente.cognome || '',
        email: utente.email || '',
        telefono: utente.telefono || '',
        attivo: utente.attivo,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        livello: 2,
        nome: '',
        cognome: '',
        email: '',
        telefono: '',
        attivo: true,
      });
    }
    setOpen(true);
  };

  const handleCloseForm = () => {
    setOpen(false);
    setEditingUser(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async () => {
    const method = editingUser ? 'PUT' : 'POST';

    await apiFetch(editingUser ? `/api/utenti/${editingUser.id}` : '/api/utenti', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, livello: parseInt(`${formData.livello}`, 10) }),
    });

    handleCloseForm();
    fetchUtenti();
  };

  const handleDeleteClick = (utente: Utente) => {
    setUserToDelete(utente);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    await apiFetch(`/api/utenti/${userToDelete.id}`, {
      method: 'DELETE',
    });
    setConfirmDeleteOpen(false);
    setUserToDelete(null);
    fetchUtenti();
  };

  const handleCancelDelete = () => {
    setConfirmDeleteOpen(false);
    setUserToDelete(null);
  };

const handleRestore = async (utente: Utente) => {
  if (!utente.id) return;

  await apiFetch(`/api/utenti/${utente.id}/restore`, {
    method: 'PUT',
  });

  // Ricarica gli utenti e chiudi la modale dei deleted
  fetchUtenti();
  setDeletedOpen(false);
};

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Utenze
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestione degli accessi e dei ruoli applicativi.
          </Typography>
        </Box>

        {!readOnly && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleOpenForm()}
          >
            Aggiungi Utente
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setDeletedOpen(true)}
          >
            Utenze cancellate
          </Button>
        </Stack>
        )}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
        {utenti.map((utente) => (
          <Paper key={utente.id} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, minHeight: 190 }}>
            <Stack spacing={1} height="100%">
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={800}>{utente.username}</Typography>
                {ruoloLabel(utente.livello)}
              </Stack>
              <Typography variant="body2" color="text.secondary">{`${utente.nome || ''} ${utente.cognome || ''}`.trim() || 'Nome non inserito'}</Typography>
              <Typography variant="body2">{utente.email || utente.telefono || 'Contatti non inseriti'}</Typography>
              <Chip size="small" label={utente.attivo ? 'Attivo' : 'Disattivato'} color={utente.attivo ? 'success' : 'default'} sx={{ alignSelf: 'flex-start' }} />
              {!readOnly && (
                <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
                  <Button size="small" startIcon={<Edit />} onClick={() => handleOpenForm(utente)}>Modifica</Button>
                  <Button size="small" color="error" startIcon={<Delete />} onClick={() => handleDeleteClick(utente)}>Elimina</Button>
                </Stack>
              )}
            </Stack>
          </Paper>
        ))}
      </Box>

      <TableContainer sx={{ display: 'none' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Cognome</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Telefono</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Ruolo</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Attivo</TableCell>
              {!readOnly && <TableCell sx={{ fontWeight: 600 }}>Azioni</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {utenti.map((utente) => (
              <TableRow key={utente.id}>
                <TableCell>{utente.username}</TableCell>
                <TableCell>{utente.nome}</TableCell>
                <TableCell>{utente.cognome}</TableCell>
                <TableCell>{utente.email}</TableCell>
                <TableCell>{utente.telefono}</TableCell>
                <TableCell>{ruoloLabel(utente.livello)}</TableCell>
                <TableCell>
                  <Switch checked={utente.attivo} disabled />
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpenForm(utente)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteClick(utente)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Form utente */}
      <Dialog open={open} onClose={handleCloseForm} fullWidth maxWidth="sm">
        <DialogTitle>{editingUser ? 'Modifica Utente' : 'Nuovo Utente'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            size="small"
            fullWidth
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            size="small"
            helperText={editingUser ? 'Lascia vuoto per non cambiare la password' : ''}
            fullWidth
          />
          <TextField
            label="Nome"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            size="small"
            fullWidth
          />
          <TextField
            label="Cognome"
            name="cognome"
            value={formData.cognome}
            onChange={handleChange}
            size="small"
            fullWidth
          />
          <TextField
            label="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            size="small"
            fullWidth
          />
          <TextField
            label="Telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            size="small"
            fullWidth
          />
          <Typography variant="subtitle2">Ruolo</Typography>
          <RadioGroup
            row
            name="livello"
            value={formData.livello}
            onChange={(e) =>
              setFormData({ ...formData, livello: parseInt(e.target.value, 10) })
            }
          >
            <FormControlLabel value={0} control={<Radio size="small" />} label="Amministratore" />
            <FormControlLabel value={1} control={<Radio size="small" />} label="Supervisore" />
            <FormControlLabel value={2} control={<Radio size="small" />} label="Dipendente" />
          </RadioGroup>
          <FormControlLabel
            control={
              <Switch
                checked={formData.attivo}
                onChange={handleChange}
                name="attivo"
              />
            }
            label="Attivo"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm} size="small">
            Annulla
          </Button>
          <Button onClick={handleSubmit} size="small" variant="contained">
            Salva
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conferma eliminazione */}
      <Dialog open={confirmDeleteOpen} onClose={handleCancelDelete}>
        <DialogTitle>Conferma Eliminazione</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler eliminare <strong>{userToDelete?.username}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} size="small">
            Annulla
          </Button>
          <Button
            onClick={handleConfirmDelete}
            size="small"
            color="error"
            variant="contained"
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modale utenti cancellati */}
      <Dialog open={deletedOpen} onClose={() => setDeletedOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Utenze Cancellate</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Cognome</TableCell>
                <TableCell>Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deletedUtenti.map(u => (
                <TableRow key={u.id}>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.nome}</TableCell>
                  <TableCell>{u.cognome}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleRestore(u)}>Ripristina</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletedOpen(false)}>Chiudi</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserManagement;
