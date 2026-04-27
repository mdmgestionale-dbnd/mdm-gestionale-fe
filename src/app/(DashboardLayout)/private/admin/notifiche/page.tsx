'use client';

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import RoleGuard from '@/app/(DashboardLayout)/components/auth/RoleGuard';
import NotificheComponent from '@/app/(DashboardLayout)/components/notifiche/NotificheComponent';

export default function Page() {
  return (
    <RoleGuard title="Notifiche" roles={['ADMIN', 'SUPERVISORE', 'DIPENDENTE']}>
      <PageContainer title="Notifiche" description="Centro notifiche">
        <NotificheComponent />
      </PageContainer>
    </RoleGuard>
  );
}
