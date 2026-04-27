'use client';

import { Grid } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import CantieriManagement from '@/app/(DashboardLayout)/components/cantieri/CantieriManagement';
import RoleGuard from '@/app/(DashboardLayout)/components/auth/RoleGuard';

export default function CantieriPage() {
  return (
    <RoleGuard title="Cantieri" roles={['ADMIN', 'SUPERVISORE', 'DIPENDENTE']}>
      <PageContainer title="Gestione Cantieri" description="Clienti, cantieri e allegati">
        <Grid container spacing={3}>
          <Grid>
            <CantieriManagement />
          </Grid>
        </Grid>
      </PageContainer>
    </RoleGuard>
  );
}
