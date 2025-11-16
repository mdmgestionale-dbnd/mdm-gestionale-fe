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
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';

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

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchUtenti = async () => {
    const res = await fetch(`${backendUrl}/api/utenti`, { credentials: 'include' });
    const data: Utente[] = await res.json();

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
    const url = editingUser
      ? `${backendUrl}/api/utenti/${editingUser.id}`
      : `${backendUrl}/api/utenti`;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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
    await fetch(`${backendUrl}/api/utenti/${userToDelete.id}`, {
      method: 'DELETE',
      credentials: 'include',
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

  const payload = {
    username: utente.username,
    password: '',       // vuoto = la password rimane invariata
    livello: utente.livello,
    nome: utente.nome || '',
    cognome: utente.cognome || '',
    email: utente.email || '',
    telefono: utente.telefono || '',
    attivo: true,       // forza attivo
    isDeleted: false,   // ripristina
  };

  await fetch(`${backendUrl}/api/utenti/${utente.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  // Ricarica gli utenti e chiudi la modale dei deleted
  fetchUtenti();
  setDeletedOpen(false);
};

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h5" mb={3} fontWeight={600}>
        Utenze
      </Typography>

      {!readOnly && (
        <>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleOpenForm()}
            sx={{ mb: 2 }}
          >
            Aggiungi Utente
          </Button>
          <Button
            variant="outlined"
            size="small"
            sx={{ ml: 2, mb: 2 }}
            onClick={() => setDeletedOpen(true)}
          >
            Utenze cancellate
          </Button>
        </>
      )}

      <TableContainer>
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
