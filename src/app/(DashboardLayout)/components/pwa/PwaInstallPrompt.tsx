'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Snackbar, Stack } from '@mui/material';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isIos() {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

export default function PwaInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const ios = useMemo(() => isIos(), []);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem('mdm-pwa-dismissed') === '1') return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setOpen(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    const iosTimer = window.setTimeout(() => {
      if (ios && !isStandalone() && localStorage.getItem('mdm-pwa-dismissed') !== '1') {
        setOpen(true);
      }
    }, 1600);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.clearTimeout(iosTimer);
    };
  }, [ios]);

  const dismiss = () => {
    localStorage.setItem('mdm-pwa-dismissed', '1');
    setOpen(false);
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    dismiss();
  };

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ mt: { xs: 1, md: 0 } }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={dismiss}
        sx={{ width: 'min(560px, calc(100vw - 24px))', borderRadius: 3 }}
        action={
          <Stack direction="row" spacing={1}>
            {event && <Button color="inherit" size="small" onClick={install}>Installa</Button>}
            <Button color="inherit" size="small" onClick={dismiss}>Non ora</Button>
          </Stack>
        }
      >
        {ios
          ? 'Per installare l’app su iPhone: Condividi -> Aggiungi alla schermata Home.'
          : 'Installa l’app sul dispositivo per aprirla come una vera app.'}
      </Alert>
    </Snackbar>
  );
}
