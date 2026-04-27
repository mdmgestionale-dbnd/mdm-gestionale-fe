'use client';

import { Grid } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import FerieComponent from '@/app/(DashboardLayout)/components/ferie/FerieComponent';
import RoleGuard from '@/app/(DashboardLayout)/components/auth/RoleGuard';

export default function FeriePage() {
  return (
    <RoleGuard title="Ferie e Assenze" roles={['ADMIN', 'SUPERVISORE', 'DIPENDENTE']}>
      <PageContainer title="Ferie, Malattie e Permessi" description="Richieste e approvazioni">
        <Grid container spacing={3}>
          <Grid>
            <FerieComponent />
          </Grid>
        </Grid>
      </PageContainer>
    </RoleGuard>
  );
}
