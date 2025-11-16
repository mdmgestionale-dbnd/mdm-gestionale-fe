'use client'

import { useEffect, useState } from 'react';
import { Grid, Box, Typography } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import ReportComponent from '@/app/(DashboardLayout)/components/report/ReportComponent';

const ReportPage = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    async function fetchUserRole() {
      try {
        const res = await fetch(`${backendUrl}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setRole(data.role); // <-- backend manda role come stringa
        } else if (res.status === 401) {
          window.location.href = '/authentication/login';
        } else {
          console.error('Errore nel recupero del ruolo utente');
        }
      } catch (error) {
        console.error('Errore fetch /auth/me', error);
        window.location.href = '/authentication/login';
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, []);

  if (loading) {
    return (
      <PageContainer title="Report" description="">
        <Box>Caricamento...</Box>
      </PageContainer>
    );
  }

  // Se non sei admin → accesso negato
  if (role !== 'ADMIN') {
    return (
      <PageContainer title="Accesso Negato" description="">
        <Box p={2}>
          <Typography variant="h6" color="error">
            Non hai i permessi per visualizzare questa pagina.
          </Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Genera Report" description="Genera Report">
      <Grid container spacing={3}>
        <Grid>
          <ReportComponent />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default ReportPage;
