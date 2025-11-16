"use client";

import React from "react";
import { Box, CircularProgress, Typography, Stack } from "@mui/material";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";

const Loading = () => {
  return (
    <Box
      height="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{
        background: "linear-gradient(135deg, #e3f2fd, #f3e5f5)",
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Logo />
        <CircularProgress color="secondary" />
        <Typography variant="h6" color="textSecondary">
          Caricamento dashboard...
        </Typography>
      </Stack>
    </Box>
  );
};

export default Loading;
