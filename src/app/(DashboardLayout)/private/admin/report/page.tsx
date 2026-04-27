'use client';

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import RoleGuard from '@/app/(DashboardLayout)/components/auth/RoleGuard';
import ReportOreComponent from '@/app/(DashboardLayout)/components/report/ReportOreComponent';

export default function Page() {
  return (
    <RoleGuard title="Report Ore" roles={['ADMIN', 'SUPERVISORE']}>
      <PageContainer title="Report Ore" description="Resoconto ore lavorate">
        <ReportOreComponent />
      </PageContainer>
    </RoleGuard>
  );
}
