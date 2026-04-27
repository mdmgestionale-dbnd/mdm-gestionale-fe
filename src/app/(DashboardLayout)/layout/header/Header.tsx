import React, { useEffect, useState } from 'react';
import { Box, AppBar, Toolbar, styled, Stack, IconButton, Badge } from '@mui/material';
import PropTypes from 'prop-types';
import Link from 'next/link';
// components
import Profile from './Profile';
import { IconBellRinging, IconMenu } from '@tabler/icons-react';
import { useWS } from '@/app/(DashboardLayout)/ws/WSContext';
import { apiJson } from '@/lib/api';
import { useBroadcastRefresh } from '@/hooks/useBroadcastRefresh';

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
  }));

  const { wsConnesso } = useWS();
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
              xs: "inline",
            },
          }}
        >
          <IconMenu width="20" height="20" />
        </IconButton>

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
        <Box flexGrow={1} />
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
