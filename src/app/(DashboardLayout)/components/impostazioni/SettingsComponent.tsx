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
  Alert,
  Stack,
} from '@mui/material';
import { Add, Remove, Save } from '@mui/icons-material';
import { apiFetch, apiJson, safeReadText } from '@/lib/api';

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

const keyOrder = [
  'azienda_nome',
  'azienda_indirizzo',
  'azienda_piva',
  'azienda_pec',
  'azienda_email',
  'azienda_telefono',
  'preventivo_firma_img',
  'preventivo_timbro_img',
  'preventivo_progressivo',
  'pranzo_inizio',
  'pranzo_fine',
  'straordinario_inizio',
];

const SettingsComponent = ({ readOnly = false }: { readOnly?: boolean }) => {
  const [settings, setSettings] = useState<Impostazione[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [openModal, setOpenModal] = useState(false);
  const [usage, setUsage] = useState<SpaceUsage | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [confirmStep, setConfirmStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [beforeDate, setBeforeDate] = useState('');
  const [includeCompletedAssegnazioniBeforeDate, setIncludeCompletedAssegnazioniBeforeDate] = useState(false);
  const [includeOldAllegati, setIncludeOldAllegati] = useState(false);
  const [includeReadNotificheBeforeDate, setIncludeReadNotificheBeforeDate] = useState(false);

  const fetchSettings = async () => {
    const data = await apiJson<Impostazione[]>('/api/impostazioni');
    data.sort((a, b) => {
      const ai = keyOrder.indexOf(a.chiave);
      const bi = keyOrder.indexOf(b.chiave);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.chiave.localeCompare(b.chiave);
    });
    setSettings(data);
    setEditedValues({});
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSpaceUsage = async () => {
    const data = await apiJson<SpaceUsage>('/api/retention/space');
    setUsage(data);
  };

  const updateSetting = async (chiave: string, valore: string) => {
    await apiFetch(`/api/impostazioni/${chiave}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
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
      if (setting.maxValue != null) val = Math.min(val, setting.maxValue);
      updateSetting(setting.chiave, setting.tipo === 'int' ? val.toFixed(0) : val.toFixed(2));
    }
  };

  const handleDecrement = (setting: Impostazione) => {
    if (setting.tipo === 'int' || setting.tipo === 'double') {
      let val = parseFloat(setting.valore) || 0;
      val -= 1;
      if (setting.minValue != null) val = Math.max(val, setting.minValue);
      updateSetting(setting.chiave, setting.tipo === 'int' ? val.toFixed(0) : val.toFixed(2));
    }
  };

  const normalizeNumericValue = (setting: Impostazione, newValue: string) => {
    const sanitized = setting.tipo === 'int'
      ? newValue.replace(/[^0-9-]/g, '')
      : newValue.replace(/[^0-9.-]/g, '');
    if (!sanitized || sanitized === '-') return null;
    let val = parseFloat(sanitized);
    if (Number.isNaN(val)) return null;
    if (setting.minValue != null) val = Math.max(val, setting.minValue);
    if (setting.maxValue != null) val = Math.min(val, setting.maxValue);
    return setting.tipo === 'int' ? val.toFixed(0) : val.toFixed(2);
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

  const handleNumericSave = (setting: Impostazione) => {
    const edited = editedValues[setting.chiave];
    if (edited === undefined) return;
    const normalized = normalizeNumericValue(setting, edited);
    if (normalized !== null && normalized !== setting.valore) {
      updateSetting(setting.chiave, normalized);
    } else {
      setEditedValues((prev) => {
        const next = { ...prev };
        delete next[setting.chiave];
        return next;
      });
    }
  };

  const handleImageUpload = async (setting: Impostazione, file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Formato non ammesso. Usa PNG o JPG.');
      return;
    }
    if (file.size > 1024 * 1024) {
      alert('Immagine troppo grande. Usa un file sotto 1MB.');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Errore lettura immagine'));
      reader.readAsDataURL(file);
    });
    await updateSetting(setting.chiave, dataUrl);
  };

  const parseSizeMB = (value: string) => {
    const num = parseFloat(value.replace(/[^\d.]/g, ''));
    if (value.toLowerCase().includes('gb')) return num * 1024;
    if (value.toLowerCase().includes('kb')) return num / 1024;
    return num;
  };

  const selectCleanupPreset = (preset: 'soft' | 'notifications' | 'attachments') => {
    setConfirmStep(false);
    setReport(null);
    if (preset === 'soft') {
      setSelectedEntities(['assegnazioni', 'cantieri', 'clienti', 'utenti', 'veicoli', 'allegati', 'notifiche']);
      setBeforeDate('');
      setIncludeCompletedAssegnazioniBeforeDate(false);
      setIncludeOldAllegati(false);
      setIncludeReadNotificheBeforeDate(false);
      return;
    }
    if (preset === 'notifications') {
      setSelectedEntities(['notifiche']);
      setIncludeReadNotificheBeforeDate(true);
      setIncludeOldAllegati(false);
      setIncludeCompletedAssegnazioniBeforeDate(false);
      return;
    }
    setSelectedEntities(['allegati']);
    setIncludeOldAllegati(true);
    setIncludeReadNotificheBeforeDate(false);
    setIncludeCompletedAssegnazioniBeforeDate(false);
  };

  const handleRunCleanup = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/retention/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entities: selectedEntities,
          beforeDate: beforeDate || null,
          includeCompletedAssegnazioniBeforeDate,
          includeOldAllegati,
          includeReadNotificheBeforeDate,
        }),
      });
      const text = res.ok ? await res.text() : ((await safeReadText(res)) || 'Errore pulizia');
      setReport(text);

      await fetchSpaceUsage();

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
            Spazio superiore al 50%: consigliata la pulizia.
          </Typography>
        )}
      </Box>
    );
  };

  const renderSettingControl = (setting: Impostazione) => {
    const edited = editedValues[setting.chiave];
    const showSave = setting.tipo === 'string' && edited !== undefined && edited !== setting.valore;

    if (setting.tipo === 'boolean') {
      return <Switch checked={setting.valore === '1'} onChange={() => handleToggle(setting)} disabled={readOnly} />;
    }

    if (setting.tipo === 'string') {
      if (setting.chiave === 'preventivo_firma_img' || setting.chiave === 'preventivo_timbro_img') {
        return (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            {setting.valore ? (
              <Box component="img" src={setting.valore} alt={setting.descrizione || setting.chiave} sx={{ maxWidth: 160, maxHeight: 70, objectFit: 'contain', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5, bgcolor: 'background.paper' }} />
            ) : (
              <Typography variant="body2" color="text.secondary">Nessuna immagine caricata</Typography>
            )}
            {!readOnly && (
              <>
                <Button component="label" variant="outlined" size="small">
                  Carica immagine
                  <input hidden type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(e) => handleImageUpload(setting, e.target.files?.[0])} />
                </Button>
                {setting.valore && <Button color="error" size="small" onClick={() => updateSetting(setting.chiave, '')}>Rimuovi</Button>}
              </>
            )}
          </Stack>
        );
      }
      return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <TextField
            value={edited !== undefined ? edited : setting.valore}
            size="small"
            fullWidth
            onChange={(e) => handleStringEdit(setting.chiave, e.target.value)}
            inputProps={{ readOnly }}
          />
          {showSave && !readOnly && (
            <Button variant="contained" size="small" color="primary" onClick={() => handleStringSave(setting)} startIcon={<Save />}>
              Salva
            </Button>
          )}
        </Stack>
      );
    }

    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton onClick={() => handleDecrement(setting)} disabled={readOnly}>
          <Remove />
        </IconButton>
        <TextField
          value={editedValues[setting.chiave] ?? setting.valore}
          size="small"
          onChange={(e) => setEditedValues((prev) => ({ ...prev, [setting.chiave]: e.target.value }))}
          onBlur={() => handleNumericSave(setting)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNumericSave(setting);
          }}
          inputProps={{ style: { width: 90, textAlign: 'center' }, readOnly }}
        />
        {editedValues[setting.chiave] !== undefined && editedValues[setting.chiave] !== setting.valore && !readOnly && (
          <IconButton onClick={() => handleNumericSave(setting)} color="primary">
            <Save />
          </IconButton>
        )}
        <IconButton onClick={() => handleIncrement(setting)} disabled={readOnly}>
          <Add />
        </IconButton>
      </Stack>
    );
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Typography variant="h5" mb={3} fontWeight={600}>
        Impostazioni
      </Typography>

      {/* --- TABELLA IMPOSTAZIONI --- */}
      <Stack spacing={1.2} sx={{ display: { xs: 'flex', md: 'none' } }}>
        {settings.map((setting) => (
          <Paper key={setting.chiave} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography fontWeight={800}>{setting.descrizione || setting.chiave}</Typography>
            <Typography variant="caption" color="text.secondary">{setting.chiave}</Typography>
            <Box sx={{ mt: 1 }}>{renderSettingControl(setting)}</Box>
          </Paper>
        ))}
      </Stack>

      <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Descrizione</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Valore</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settings.map((setting) => (
              <TableRow key={setting.chiave}>
                <TableCell>{setting.descrizione}</TableCell>
                <TableCell>{renderSettingControl(setting)}</TableCell>
              </TableRow>
            ))}
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
            setBeforeDate('');
            setIncludeCompletedAssegnazioniBeforeDate(false);
            setIncludeOldAllegati(false);
            setIncludeReadNotificheBeforeDate(false);
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
              <Typography mt={3} mb={1} fontWeight={700}>
                Scegli una pulizia
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Ho ridotto le opzioni a tre azioni comprensibili. La conferma finale mostra sempre cosa verra eliminato definitivamente.
              </Typography>
              <Stack spacing={1.2}>
                <Button variant={selectedEntities.includes('clienti') ? 'contained' : 'outlined'} onClick={() => selectCleanupPreset('soft')}>Elimina definitivamente elementi gia cestinati</Button>
                <Button variant={includeReadNotificheBeforeDate ? 'contained' : 'outlined'} onClick={() => selectCleanupPreset('notifications')}>Pulisci notifiche lette vecchie</Button>
                <Button variant={includeOldAllegati ? 'contained' : 'outlined'} onClick={() => selectCleanupPreset('attachments')}>Pulisci allegati vecchi gia eliminati</Button>
              </Stack>
              <TextField
                type="date"
                size="small"
                label="Data limite"
                value={beforeDate}
                onChange={(e) => setBeforeDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mt: 2 }}
                fullWidth
              />
              <Alert severity="info" sx={{ mt: 2 }}>
                La data limite serve solo per notifiche/allegati vecchi. Gli elementi nel cestino vengono invece rimossi in modo definitivo.
              </Alert>
            </>
          )}

          {confirmStep && !report && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Confermi la pulizia delle seguenti entità?
              </Typography>
              <ul>
                {selectedEntities.includes('assegnazioni') && (
                  <li>Assegnazioni eliminate logicamente o concluse se abilitate nelle opzioni</li>
                )}
                {selectedEntities.includes('cantieri') && (
                  <li>Cantieri eliminati logicamente e dati collegati gia marcati come eliminati</li>
                )}
                {selectedEntities.includes('clienti') && (
                  <li>Clienti eliminati logicamente</li>
                )}
                {selectedEntities.includes('utenti') && (
                  <li>Utenze eliminate logicamente</li>
                )}
                {selectedEntities.includes('veicoli') && (
                  <li>Veicoli eliminati logicamente</li>
                )}
                {selectedEntities.includes('allegati') && (
                  <li>Allegati eliminati logicamente o vecchi se abilitato</li>
                )}
                {selectedEntities.includes('notifiche') && (
                  <li>Notifiche eliminate logicamente o lette se abilitato</li>
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
