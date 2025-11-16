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
        background: "radial-gradient(#d2f1df, #d3d7fa, #bad8f4)",
        animation: "gradient 15s ease infinite",
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Logo />
        <CircularProgress color="primary" />
        <Typography variant="h6" color="textSecondary">
          Caricamento in corso...
        </Typography>
      </Stack>
    </Box>
  );
};

export default Loading;
