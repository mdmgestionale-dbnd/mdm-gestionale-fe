'use client';

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import CalendarioComponent from '@/app/(DashboardLayout)/components/calendario/CalendarioComponent';
import RoleGuard from '@/app/(DashboardLayout)/components/auth/RoleGuard';

export default function CalendarioPage() {
  return (
    <RoleGuard title="Calendario" roles={['ADMIN', 'SUPERVISORE', 'DIPENDENTE']}>
      <PageContainer title="Calendario Attivita" description="Pianificazione cantieri e squadre">
        <CalendarioComponent />
      </PageContainer>
    </RoleGuard>
  );
}
