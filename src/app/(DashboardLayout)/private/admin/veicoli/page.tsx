'use client';

import { Grid } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import VeicoliComponent from '@/app/(DashboardLayout)/components/veicoli/VeicoliComponent';
import RoleGuard from '@/app/(DashboardLayout)/components/auth/RoleGuard';

export default function VeicoliPage() {
  return (
    <RoleGuard title="Veicoli" roles={['ADMIN', 'SUPERVISORE', 'DIPENDENTE']}>
      <PageContainer title="Gestione Veicoli" description="Anagrafica mezzi e scadenze">
        <Grid container spacing={3}>
          <Grid>
            <VeicoliComponent />
          </Grid>
        </Grid>
      </PageContainer>
    </RoleGuard>
  );
}
