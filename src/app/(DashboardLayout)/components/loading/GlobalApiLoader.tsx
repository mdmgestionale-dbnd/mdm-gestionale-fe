'use client';

import React, { useEffect, useState } from 'react';
import { Box, Fade, LinearProgress, Paper, Typography } from '@mui/material';

export default function GlobalApiLoader() {
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const onLoading = (event: Event) => {
      const delta = Number((event as CustomEvent<{ delta?: number }>).detail?.delta || 0);
      setPending((current) => Math.max(0, current + delta));
    };

    window.addEventListener('mdm-api-loading', onLoading);
    return () => {
      window.removeEventListener('mdm-api-loading', onLoading);
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (pending > 0) {
      timer = setTimeout(() => setVisible(true), 180);
    } else {
      timer = setTimeout(() => setVisible(false), 250);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pending]);

  return (
    <Fade in={visible} unmountOnExit>
      <Box sx={{ position: 'fixed', top: { xs: 8, md: 16 }, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, width: { xs: 'calc(100% - 32px)', sm: 360 } }}>
        <Paper elevation={6} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ px: 2, py: 1, fontWeight: 700 }}>
            Caricamento dati in corso...
          </Typography>
        </Paper>
      </Box>
    </Fade>
  );
}
