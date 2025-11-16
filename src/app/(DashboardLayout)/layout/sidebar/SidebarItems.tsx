import React from "react";
import Menuitems from "./MenuItems";
import { Box, useTheme, GlobalStyles } from "@mui/material";
import {
  Logo,
  Sidebar as MUI_Sidebar,
  Menu,
  MenuItem,
  Submenu,
} from "react-mui-sidebar";
import { IconPoint } from '@tabler/icons-react';
import Link from "next/link";
import { usePathname } from "next/navigation";

const renderMenuItems = (items: any, pathDirect: any) => {
  return items.map((item: any) => {
    const Icon = item.icon ? item.icon : IconPoint;
const theme = useTheme();
const itemIcon = <Icon stroke={1.5} size="1.3rem" color={theme.palette.text.primary} />;


    if (item.subheader) {
      return <Menu subHeading={item.subheader} key={item.subheader} />;
    }

    if (item.children) {
      return (
        <Submenu
          key={item.id}
          title={item.title}
          icon={itemIcon}
          borderRadius="7px"
        >
          {renderMenuItems(item.children, pathDirect)}
        </Submenu>
      );
    }

    return (
      <Box px={3} key={item.id}>
        <MenuItem
          key={item.id}
          isSelected={pathDirect === item?.href}
          borderRadius="8px"
          icon={itemIcon}
          link={item.href}
          component={Link}
        >
          {item.title}
        </MenuItem>
      </Box>
    );
  });
};

const SidebarItems = () => {
  const pathname = usePathname();
  const pathDirect = pathname;
  const theme = useTheme();

  return (
    <>
      {/* Global Styles per sidebar: testo e icone bianchi */}
      <GlobalStyles
        styles={{
          '.MuiListItemButton-root': {
            color: theme.palette.text.primary,
          },
          '.MuiListItemIcon-root': {
            color: theme.palette.text.primary,
          },
          '.MuiListItemText-root': {
            color: theme.palette.text.primary,
          },
          '.MuiTypography-root': {
            color: theme.palette.text.primary,
          },
          '.MuiListSubheader-root, .MuiListSubheader-gutters, .MuiListSubheader-sticky': {
            color: theme.palette.text.primary + ' !important',
          },
        }}
      />



      <MUI_Sidebar
        width="100%"
        showProfile={false}
        themeColor={theme.palette.primary.main}
        themeSecondaryColor={theme.palette.secondary.main}
      >
        <Logo
          img="/images/logos/logo_transparent.png"
          component={Link}
          href="/private/admin/assegnazioni"
        />
        {renderMenuItems(Menuitems, pathDirect)}
      </MUI_Sidebar>
    </>
  );
};

export default SidebarItems;
