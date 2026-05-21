'use client';

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import RoleGuard from '@/app/(DashboardLayout)/components/auth/RoleGuard';
import CarteComponent from '@/app/(DashboardLayout)/components/carte/CarteComponent';

export default function Page() {
  return (
    <RoleGuard title="Carte" roles={['ADMIN', 'SUPERVISORE', 'DIPENDENTE']}>
      <PageContainer title="Carte" description="Carte aziendali">
        <CarteComponent />
      </PageContainer>
    </RoleGuard>
  );
}
