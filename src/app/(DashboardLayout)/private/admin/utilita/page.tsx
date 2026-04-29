'use client';

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import RoleGuard from '@/app/(DashboardLayout)/components/auth/RoleGuard';
import UtilitaComponent from '@/app/(DashboardLayout)/components/utilita/UtilitaComponent';

export default function Page() {
  return (
    <RoleGuard title="Utilita" roles={['ADMIN', 'SUPERVISORE']}>
      <PageContainer title="Utilita" description="Strumenti operativi">
        <UtilitaComponent />
      </PageContainer>
    </RoleGuard>
  );
}
