'use client'

import { useEffect, useState } from 'react';
import { Grid, Box, Typography } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import AssegnazioniPage from '@/app/(DashboardLayout)/components/assegnazioni/AssegnazioniPage';

const Utenze = () => {
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
      <PageContainer title="Utenze" description="">
        <Box>Caricamento...</Box>
      </PageContainer>
    );
  }

  // Se non sei admin → accesso negato
  if (role !== 'ADMIN' && role !== 'SUPERVISORE' && role !== 'DIPENDENTE') {
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
    <PageContainer title="Gestione Utenze" description="Gestione Utenze">
      <Grid container spacing={3}>
        <Grid>
          <AssegnazioniPage />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Utenze;
