'use client';

import { Grid } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import UserManagement from '@/app/(DashboardLayout)/components/utenze/UserManagement';
import RoleGuard from '@/app/(DashboardLayout)/components/auth/RoleGuard';

export default function UtenzePage() {
  return (
    <RoleGuard title="Utenze" roles={['ADMIN', 'SUPERVISORE']}>
      <PageContainer title="Gestione Utenze" description="Utenti e ruoli applicativi">
        <Grid container spacing={3}>
          <Grid>
            <UserManagement />
          </Grid>
        </Grid>
      </PageContainer>
    </RoleGuard>
  );
}
