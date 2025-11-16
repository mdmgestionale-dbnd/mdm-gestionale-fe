'use client';

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
  Switch,
  TextField,
  Button,
  TableContainer,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { Add, Remove, Save } from '@mui/icons-material';

interface Impostazione {
  chiave: string;
  valore: string;
  tipo: 'int' | 'boolean' | 'double' | 'string';
  minValue?: number;
  maxValue?: number;
  descrizione?: string;
}

interface SpaceUsage {
  dbSize: string;
  storageSize: string;
}

const keyOrder = ['azienda_nome', 'azienda_indirizzo', 'azienda_piva'];

const SettingsComponent = ({ readOnly = false }: { readOnly?: boolean }) => {
  const [settings, setSettings] = useState<Impostazione[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [openModal, setOpenModal] = useState(false);
  const [usage, setUsage] = useState<SpaceUsage | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [confirmStep, setConfirmStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchSettings = async () => {
    const res = await fetch(`${backendUrl}/api/impostazioni`, { credentials: 'include' });
    const data: Impostazione[] = await res.json();
    data.sort((a, b) => keyOrder.indexOf(a.chiave) - keyOrder.indexOf(b.chiave));
    setSettings(data);
    setEditedValues({});
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSpaceUsage = async () => {
    const res = await fetch(`${backendUrl}/api/retention/space`, { credentials: 'include' });
    const data: SpaceUsage = await res.json();
    setUsage(data);
  };

  const updateSetting = async (chiave: string, valore: string) => {
    await fetch(`${backendUrl}/api/impostazioni/${chiave}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      credentials: 'include',
      body: valore,
    });
    await fetchSettings();
  };

  const handleToggle = (setting: Impostazione) => {
    const newValue = setting.valore === '1' ? '0' : '1';
    updateSetting(setting.chiave, newValue);
  };

  const handleIncrement = (setting: Impostazione) => {
    if (setting.tipo === 'int' || setting.tipo === 'double') {
      let val = parseFloat(setting.valore) || 0;
      val += 1;
      if (setting.maxValue !== undefined) val = Math.min(val, setting.maxValue);
      updateSetting(setting.chiave, setting.tipo === 'int' ? val.toFixed(0) : val.toFixed(2));
    }
  };

  const handleDecrement = (setting: Impostazione) => {
    if (setting.tipo === 'int' || setting.tipo === 'double') {
      let val = parseFloat(setting.valore) || 0;
      val -= 1;
      if (setting.minValue !== undefined) val = Math.max(val, setting.minValue);
      updateSetting(setting.chiave, setting.tipo === 'int' ? val.toFixed(0) : val.toFixed(2));
    }
  };

  const handleDoubleChange = (setting: Impostazione, newValue: string) => {
    const sanitized = newValue.replace(/[^0-9.]/g, '');
    if (!sanitized) return;
    let val = parseFloat(sanitized);
    if (isNaN(val)) return;
    if (setting.minValue !== undefined) val = Math.max(val, setting.minValue);
    if (setting.maxValue !== undefined) val = Math.min(val, setting.maxValue);
    updateSetting(setting.chiave, val.toFixed(2));
  };

  const handleStringEdit = (chiave: string, valore: string) => {
    setEditedValues((prev) => ({ ...prev, [chiave]: valore }));
  };

  const handleStringSave = (setting: Impostazione) => {
    const nuovoValore = editedValues[setting.chiave];
    if (nuovoValore !== undefined && nuovoValore !== setting.valore) {
      updateSetting(setting.chiave, nuovoValore);
    }
  };

  const parseSizeMB = (value: string) => {
    const num = parseFloat(value.replace(/[^\d.]/g, ''));
    if (value.toLowerCase().includes('gb')) return num * 1024;
    if (value.toLowerCase().includes('kb')) return num / 1024;
    return num;
  };

  const handleRunCleanup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/retention/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entities: selectedEntities }),
      });
      const text = await res.text();
      setReport(text);

      // ✅ Aggiorna i dati dello spazio dopo la pulizia
      await fetchSpaceUsage();

      // ✅ Rimuovi il warning di conferma
      setConfirmStep(false);
    } finally {
      setLoading(false);
    }
  };

  const renderProgress = (label: string, used: number, total: number) => {
    const percentage = Math.min((used / total) * 100, 100);
    const over50 = percentage > 50;
    return (
      <Box mb={2}>
        <Typography fontWeight={600}>{label}</Typography>
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{ height: 10, borderRadius: 5, my: 1 }}
          color={over50 ? 'warning' : 'primary'}
        />
        <Typography variant="body2">
          {used.toFixed(1)}MB / {total}MB ({percentage.toFixed(1)}%)
        </Typography>
        {over50 && (
          <Typography variant="caption" color="error">
            ⚠️ Spazio superiore al 50% — consigliata la pulizia.
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h5" mb={3} fontWeight={600}>
        Impostazioni
      </Typography>

      {/* --- TABELLA IMPOSTAZIONI --- */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Descrizione</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Valore</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settings.map((setting) => {
              const edited = editedValues[setting.chiave];
              const showSave =
                setting.tipo === 'string' &&
                edited !== undefined &&
                edited !== setting.valore;

              return (
                <TableRow key={setting.chiave}>
                  <TableCell>{setting.descrizione}</TableCell>
                  <TableCell>
                    {setting.tipo === 'boolean' ? (
                      <Switch
                        checked={setting.valore === '1'}
                        onChange={() => handleToggle(setting)}
                        disabled={readOnly}
                      />
                    ) : setting.tipo === 'string' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          value={edited !== undefined ? edited : setting.valore}
                          size="small"
                          onChange={(e) => handleStringEdit(setting.chiave, e.target.value)}
                          inputProps={{ style: { width: 250 }, readOnly }}
                        />
                        {showSave && !readOnly && (
                          <Button
                            variant="contained"
                            size="small"
                            color="primary"
                            onClick={() => handleStringSave(setting)}
                            startIcon={<Save />}
                          >
                            Salva
                          </Button>
                        )}
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton onClick={() => handleDecrement(setting)} disabled={readOnly}>
                          <Remove />
                        </IconButton>
                        <TextField
                          value={setting.valore}
                          size="small"
                          onChange={(e) => {
                            if (setting.tipo === 'double')
                              handleDoubleChange(setting, e.target.value);
                          }}
                          inputProps={{
                            style: { width: 70, textAlign: 'center' },
                            readOnly: readOnly && setting.tipo !== 'double',
                          }}
                        />
                        <IconButton onClick={() => handleIncrement(setting)} disabled={readOnly}>
                          <Add />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- SEZIONE PULIZIA --- */}
      <Divider sx={{ my: 4 }} />
      <Box textAlign="center">
        <Typography variant="h6" mb={1}>
          Pulizia database e storage
        </Typography>
        <Typography variant="body2" mb={2}>
          Gestisci lo spazio e rimuovi dati obsoleti.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            setOpenModal(true);
            fetchSpaceUsage();
            setReport(null);
            setSelectedEntities([]);
            setConfirmStep(false);
          }}
        >
          Apri gestione spazio
        </Button>
      </Box>

      {/* --- MODALE --- */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gestione spazio</DialogTitle>
        <DialogContent>
          {usage ? (
            <>
              {renderProgress('Database', parseSizeMB(usage.dbSize), 500)}
              {renderProgress('Storage', parseSizeMB(usage.storageSize), 1000)}
            </>
          ) : (
            <Typography>Caricamento utilizzo spazio...</Typography>
          )}

          {!confirmStep && !report && (
            <>
              <Typography mt={3} mb={1}>
                Seleziona cosa vuoi pulire:
              </Typography>
              <FormGroup>
                {['assegnazioni', 'commesse', 'clienti', 'utenti'].map((ent) => (
                  <FormControlLabel
                    key={ent}
                    control={
                      <Checkbox
                        checked={selectedEntities.includes(ent)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedEntities((prev) =>
                            checked ? [...prev, ent] : prev.filter((x) => x !== ent)
                          );
                        }}
                      />
                    }
                    label={ent.charAt(0).toUpperCase() + ent.slice(1)}
                  />
                ))}
              </FormGroup>
            </>
          )}

          {confirmStep && !report && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Confermi la pulizia delle seguenti entità?
              </Typography>
              <ul>
                {selectedEntities.includes('assegnazioni') && (
                  <li>🗑️ Assegnazioni precedenti alla data odierna e relativi allegati</li>
                )}
                {selectedEntities.includes('commesse') && (
                  <li>📄 Commesse eliminate e relative assegnazioni e PDF associati</li>
                )}
                {selectedEntities.includes('clienti') && (
                  <li>👥 Clienti eliminati e relative assegnazioni</li>
                )}
                {selectedEntities.includes('utenti') && (
                  <li>🔑 Utenze eliminate e relative assegnazioni</li>
                )}
              </ul>
            </Alert>
          )}

          {report && (
            <Alert severity="success" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
              {report}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          {report ? (
            // ✅ Mostra solo "Chiudi" dopo la pulizia
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenModal(false)}
            >
              Chiudi
            </Button>
          ) : !confirmStep ? (
            <>
              <Button onClick={() => setOpenModal(false)}>Annulla</Button>
              <Button
                variant="contained"
                disabled={selectedEntities.length === 0}
                onClick={() => setConfirmStep(true)}
              >
                Procedi
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setConfirmStep(false)}>Indietro</Button>
              <Button
                variant="contained"
                color="error"
                disabled={loading}
                onClick={handleRunCleanup}
              >
                {loading ? 'Pulizia in corso...' : 'Conferma pulizia'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SettingsComponent;
