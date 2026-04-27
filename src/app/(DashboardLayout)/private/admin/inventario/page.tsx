'use client';

import { Grid } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import InventarioComponent from '@/app/(DashboardLayout)/components/inventario/InventarioComponent';
import RoleGuard from '@/app/(DashboardLayout)/components/auth/RoleGuard';

export default function InventarioPage() {
  return (
    <RoleGuard title="Inventario" roles={['ADMIN', 'SUPERVISORE', 'DIPENDENTE']}>
      <PageContainer title="Gestione Inventario" description="Magazzino, articoli e movimenti">
        <Grid container spacing={3}>
          <Grid>
            <InventarioComponent />
          </Grid>
        </Grid>
      </PageContainer>
    </RoleGuard>
  );
}
