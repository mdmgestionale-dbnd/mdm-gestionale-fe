import React, { useEffect, useState } from 'react';
import { Box, AppBar, Toolbar, styled, Stack, IconButton, Badge, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import Link from 'next/link';
// components
import Profile from './Profile';
import { IconBellRinging, IconMenu } from '@tabler/icons-react';
import { useWS } from '@/app/(DashboardLayout)/ws/WSContext';
import { apiJson } from '@/lib/api';
import { useBroadcastRefresh } from '@/hooks/useBroadcastRefresh';
import { usePathname } from 'next/navigation';

interface ItemType {
  toggleMobileSidebar:  (event: React.MouseEvent<HTMLElement>) => void;
}

const Header = ({toggleMobileSidebar}: ItemType) => {

  // const lgUp = useMediaQuery((theme) => theme.breakpoints.up('lg'));
  // const lgDown = useMediaQuery((theme) => theme.breakpoints.down('lg'));


  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none',
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    [theme.breakpoints.up('lg')]: {
      minHeight: '70px',
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
    minHeight: 58,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
  }));

  const { wsConnesso } = useWS();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const loadUnread = async () => {
    try {
      const data = await apiJson<unknown[]>('/api/notifiche?soloNonLette=true');
      setUnread(data.length);
    } catch {
      setUnread(0);
    }
  };

  useEffect(() => {
    loadUnread();
  }, []);

  useBroadcastRefresh(loadUnread);

  const title = (() => {
    if (pathname.includes('/cantieri')) return 'Cantieri';
    if (pathname.includes('/ferie')) return 'Ferie';
    if (pathname.includes('/veicoli')) return 'Veicoli';
    if (pathname.includes('/notifiche')) return 'Notifiche';
    if (pathname.includes('/utenze')) return 'Utenze';
    if (pathname.includes('/utilita')) return 'Utilita';
    if (pathname.includes('/impostazioni')) return 'Impostazioni';
    return 'Calendario';
  })();

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        <IconButton
          color="inherit"
          aria-label="menu"
          onClick={toggleMobileSidebar}
          sx={{
            display: {
              lg: "none",
              xs: "none",
            },
          }}
        >
          <IconMenu width="20" height="20" />
        </IconButton>

        <Box sx={{ display: { xs: 'block', lg: 'none' }, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.1 }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">Gestionale operativo</Typography>
        </Box>
        <Box flexGrow={1} />

        <IconButton
          size="large"
          aria-label="notifiche"
          color="inherit"
          aria-controls="msgs-menu"
          aria-haspopup="true"
          component={Link}
          href="/private/admin/notifiche"
        >
          <Badge badgeContent={unread} color="warning">
            <IconBellRinging size="21" />
          </Badge>
        </IconButton>
{/* Stato WebSocket */}
{(
  <Box
    sx={{
      px: 2,
      py: 0.5,
      borderRadius: 1,
      bgcolor: wsConnesso ? 'success.main' : 'error.main',
      color: 'common.white',
      fontWeight: 'bold',
      fontSize: '0.875rem',
      whiteSpace: 'nowrap',
      display: { xs: 'none', sm: 'block' },
    }}
  >
    {wsConnesso ? 'Connesso' : 'Riconnessione'}
  </Box>
)}
        <Stack spacing={1} direction="row" alignItems="center">
          {/* <Button variant="contained" component={Link} href="/authentication/login"   disableElevation color="primary" >
            Login
          </Button> */}
          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

Header.propTypes = {
  sx: PropTypes.object,
};

export default Header;
