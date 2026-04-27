'use client';

import React, { ReactNode, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import { hasRole, useCurrentUser } from '@/hooks/useCurrentUser';

type RoleGuardProps = {
  title: string;
  description?: string;
  roles: string[];
  children: ReactNode;
};

export default function RoleGuard({ title, description, roles, children }: RoleGuardProps) {
  const { user, loading, error } = useCurrentUser();

  useEffect(() => {
    if (error === 'UNAUTHORIZED') {
      window.location.href = '/authentication/login';
    }
  }, [error]);

  if (loading) {
    return (
      <PageContainer title={title} description={description || ''}>
        <Box>Caricamento...</Box>
      </PageContainer>
    );
  }

  if (!hasRole(user, roles)) {
    return (
      <PageContainer title="Accesso Negato" description="">
        <Box p={2}>
          <Typography variant="h6" color="error">
            Non hai i permessi per visualizzare questa pagina.
          </Typography>
        </Box>
      </PageContainer>
    );
  }

  return <>{children}</>;
}
