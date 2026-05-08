'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Badge,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  IconBellRinging,
  IconBriefcase2,
  IconCalendarTime,
  IconCar,
  IconDots,
  IconLayoutDashboard,
  IconSettings,
  IconTools,
  IconUser,
} from '@tabler/icons-react';

type DockItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
};

const mainItems: DockItem[] = [
  { title: 'Calendario', href: '/private/admin/calendario', icon: <IconCalendarTime size={22} /> },
  { title: 'Cantieri', href: '/private/admin/cantieri', icon: <IconBriefcase2 size={22} /> },
  { title: 'Ferie', href: '/private/admin/ferie', icon: <IconLayoutDashboard size={22} /> },
  { title: 'Notifiche', href: '/private/admin/notifiche', icon: <IconBellRinging size={22} /> },
];

const moreItems: DockItem[] = [
  { title: 'Veicoli', href: '/private/admin/veicoli', icon: <IconCar size={22} /> },
  { title: 'Utenze', href: '/private/admin/utenze', icon: <IconUser size={22} /> },
  { title: 'Utilita', href: '/private/admin/utilita', icon: <IconTools size={22} /> },
  { title: 'Impostazioni', href: '/private/admin/impostazioni', icon: <IconSettings size={22} /> },
];

export default function MobileDock() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!isMobile) return null;

  const isSelected = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreSelected = moreItems.some((item) => isSelected(item.href));

  return (
    <>
      <Paper
        elevation={10}
        sx={{
          position: 'fixed',
          left: 12,
          right: 12,
          bottom: 'calc(10px + env(safe-area-inset-bottom))',
          zIndex: 1300,
          borderRadius: 5,
          px: 1,
          py: 0.8,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(18, 18, 18, 0.92)',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.48)',
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.5 }}>
          {mainItems.map((item) => {
            const selected = isSelected(item.href);
            return (
              <Box
                key={item.href}
                component={Link}
                href={item.href}
                sx={{
                  textDecoration: 'none',
                  color: selected ? 'primary.main' : 'text.secondary',
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    minHeight: 54,
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.35,
                    bgcolor: selected ? 'rgba(46, 125, 50, 0.24)' : 'transparent',
                  }}
                >
                  <Badge color="warning" variant="dot" invisible={!item.badge}>
                    {item.icon}
                  </Badge>
                  <Typography variant="caption" fontWeight={selected ? 800 : 600} sx={{ fontSize: 10.5, lineHeight: 1 }}>
                    {item.title}
                  </Typography>
                </Box>
              </Box>
            );
          })}
          <IconButton
            onClick={() => setOpen(true)}
            sx={{
              minHeight: 54,
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.35,
              color: moreSelected ? 'primary.main' : 'text.secondary',
              bgcolor: moreSelected ? 'rgba(46, 125, 50, 0.24)' : 'transparent',
            }}
          >
            <IconDots size={22} />
            <Typography variant="caption" fontWeight={moreSelected ? 800 : 600} sx={{ fontSize: 10.5, lineHeight: 1 }}>
              Altro
            </Typography>
          </IconButton>
        </Box>
      </Paper>

      <Drawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            pb: 'calc(18px + env(safe-area-inset-bottom))',
          },
        }}
      >
        <Box sx={{ width: 44, height: 5, borderRadius: 999, bgcolor: 'divider', mx: 'auto', mt: 1.5, mb: 1 }} />
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="h6" fontWeight={800}>Altro</Typography>
          <Typography variant="body2" color="text.secondary">Strumenti e impostazioni operative.</Typography>
        </Box>
        <List sx={{ px: 1 }}>
          {moreItems.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={isSelected(item.href)}
              onClick={() => setOpen(false)}
              sx={{ borderRadius: 3, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.title} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </>
  );
}
