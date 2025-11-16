'use client';

import { useWS } from '@/app/(DashboardLayout)/ws/WSContext';
import { IMessage } from '@stomp/stompjs';

import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, IconButton, Button, TableContainer, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Delete, Edit, Search } from '@mui/icons-material';

interface Commessa {
  id: number;
  codice: string;
  descrizione?: string;
  pdfAllegato?: {
    nomeFile: string;
    storagePath: string;
  };
  isDeleted?: boolean;
  dataCreazione?: string;
}

const CommessaManagement = () => {
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [deletedCommesse, setDeletedCommesse] = useState<Commessa[]>([]);
  const [open, setOpen] = useState(false);
  const [editingCommessa, setEditingCommessa] = useState<Commessa | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [removeFileConfirm, setRemoveFileConfirm] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [commessaToDelete, setCommessaToDelete] = useState<Commessa | null>(null);
  const [deletedOpen, setDeletedOpen] = useState(false);

  const [formData, setFormData] = useState({
    codice: '',
    descrizione: '',
    dataCreazione: ''
  });

  const [searchTerm, setSearchTerm] = useState(''); // 👈 nuovo stato per la ricerca

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchCommesse = async () => {
    const res = await fetch(`${backendUrl}/api/commesse`, { credentials: 'include' });
    const data: Commessa[] = await res.json();
    setCommesse(data.filter(c => !c.isDeleted));
    setDeletedCommesse(data.filter(c => c.isDeleted));
  };

  useEffect(() => {
    fetchCommesse();
  }, []);

    const { subscribe } = useWS();

  useEffect(() => {
    const unsubscribe = subscribe((msg: IMessage) => {
      try {
        const payload = msg.body ? JSON.parse(msg.body) : {};
        const tipo = payload.tipoEvento ?? payload.tipo ?? payload.tipo_evento;
        if (tipo === 'REFRESH' || tipo === 'MSG_REFRESH') {
          fetchCommesse();
        }
      } catch (e) {
        console.warn('Errore parsing messaggio WS', e);
      }
    });

    return () => unsubscribe();
  }, [subscribe]);


  const handleOpenForm = (commessa?: Commessa) => {
    if (commessa) {
      setEditingCommessa(commessa);
      setFormData({
        codice: commessa.codice,
        descrizione: commessa.descrizione || '',
        dataCreazione: commessa.dataCreazione || ''
      });
    } else {
      setEditingCommessa(null);
      setFormData({ codice: '', descrizione: '', dataCreazione: '' });
    }
    setFile(null);
    setRemoveFileConfirm(false);
    setOpen(true);
  };

  const handleCloseForm = () => {
    setOpen(false);
    setEditingCommessa(null);
    setFile(null);
    setRemoveFileConfirm(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];

      // Controllo tipo
      if (selectedFile.type !== 'application/pdf') {
        alert('Il file deve essere un PDF');
        e.target.value = '';
        return;
      }

      // Controllo dimensione 1MB
      if (selectedFile.size > 2 * 1024 * 1024) { // 2MB
          alert('Il file non può superare 2 MB');
          e.target.value = '';
          return;
      }

      setFile(selectedFile);
    }
  };


  const handleRemoveFile = () => {
    setRemoveFileConfirm(true);
  };

const handleSubmit = async () => {
  try {
    const form = new FormData();
    form.append('commessa', new Blob([JSON.stringify(formData)], { type: 'application/json' }));
    if (file) form.append('file', file);
    if (removeFileConfirm) form.append('removeFile', 'true');

    const url = editingCommessa
      ? `${backendUrl}/api/commesse/${editingCommessa.id}`
      : `${backendUrl}/api/commesse`;
    const method = editingCommessa ? 'PUT' : 'POST';

    const res = await fetch(url, { method, body: form, credentials: 'include' });

    if (!res.ok) {
      const text = await res.text();
      alert(`Errore: ${text}`);
      return;
    }

    handleCloseForm();
    fetchCommesse();
  } catch (err: any) {
    alert(`Errore: ${err.message}`);
  }
};


  const handleDeleteClick = (c: Commessa) => {
    setCommessaToDelete(c);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!commessaToDelete) return;
    await fetch(`${backendUrl}/api/commesse/${commessaToDelete.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setConfirmDeleteOpen(false);
    setCommessaToDelete(null);
    fetchCommesse();
  };

  const handleRestore = async (c: Commessa) => {
    await fetch(`${backendUrl}/api/commesse/${c.id}/restore`, {
      method: 'PUT',
      credentials: 'include',
    });
    fetchCommesse();
  };

  // 🔎 Filtra commesse in base al codice cercato
  const filteredCommesse = commesse.filter(c =>
    c.codice.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h5" mb={3} fontWeight={600}>Commesse</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button variant="contained" size="small" onClick={() => handleOpenForm()}>
          Aggiungi Commessa
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setDeletedOpen(true)}
        >
          Commesse cancellate
        </Button>

        {/* 🔍 Campo ricerca */}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Search fontSize="small" />
          <TextField
            label="Cerca per codice"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Codice</TableCell>
              <TableCell>Descrizione</TableCell>
              <TableCell>Allegato</TableCell>
              <TableCell>Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCommesse.map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.codice}</TableCell>
                <TableCell>{c.descrizione}</TableCell>
                <TableCell>
                  {c.pdfAllegato ? (
                    <a
                      href={`${backendUrl}/api/commesse/${c.id}/allegato`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </a>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpenForm(c)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteClick(c)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Form Commessa */}
      <Dialog open={open} onClose={handleCloseForm} fullWidth maxWidth="sm">
        <DialogTitle>{editingCommessa ? 'Modifica Commessa' : 'Nuova Commessa'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Codice" name="codice" value={formData.codice} onChange={handleChange} size="small" fullWidth />
          <TextField label="Descrizione" name="descrizione" value={formData.descrizione} onChange={handleChange} size="small" fullWidth />
          <input type="file" accept="application/pdf" onChange={handleFileChange} />
          {editingCommessa?.pdfAllegato && !removeFileConfirm && (
            <Box>
              Allegato attuale: {editingCommessa.pdfAllegato.nomeFile}{' '}
              <Button variant="outlined" size="small" color="error" onClick={handleRemoveFile}>Rimuovi</Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm} size="small">Annulla</Button>
          <Button onClick={handleSubmit} size="small" variant="contained">Salva</Button>
        </DialogActions>
      </Dialog>

      {/* Conferma eliminazione */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>Conferma Eliminazione</DialogTitle>
        <DialogContent>
          Sei sicuro di voler eliminare <strong>{commessaToDelete?.codice}</strong>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)} size="small">Annulla</Button>
          <Button onClick={handleConfirmDelete} size="small" color="error" variant="contained">Elimina</Button>
        </DialogActions>
      </Dialog>

      {/* Modale commesse cancellate */}
      <Dialog open={deletedOpen} onClose={() => setDeletedOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Commesse Cancellate</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Codice</TableCell>
                <TableCell>Descrizione</TableCell>
                <TableCell>Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deletedCommesse.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.codice}</TableCell>
                  <TableCell>{c.descrizione}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleRestore(c)}>Ripristina</Button>
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

export default CommessaManagement;
