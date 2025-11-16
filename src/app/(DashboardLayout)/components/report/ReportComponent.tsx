'use client'

import { useState } from 'react';
import { Box, Button, TextField, IconButton, Typography } from '@mui/material';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';

const StampaPdfAssegnazioni = () => {
  const [data, setData] = useState<string>('');

  const downloadPdf = () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const url = data
      ? `${backendUrl}/api/assegnazioni/report/pdf?data=${data}`
      : `${backendUrl}/api/assegnazioni/report/pdf`;

    window.open(url, '_blank');
  }

  return (
    <DashboardCard>
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6" ml={1}>
          Genera Report PDF Assegnazioni
        </Typography>
      </Box>

      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems="center">
        <TextField
          type="date"
          label="Seleziona giorno"
          value={data}
          onChange={e => setData(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={downloadPdf}>
          Scarica PDF
        </Button>
      </Box>

      <Typography mt={2} variant="body2" color="textSecondary">
        Se non selezioni una data, verrà generato il PDF per la giornata odierna.
      </Typography>
    </DashboardCard>
  );
}

export default StampaPdfAssegnazioni;
