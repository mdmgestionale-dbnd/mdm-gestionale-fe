"use client";

import React, { useState } from "react";
import { Grid, Box, Card, Typography, CircularProgress } from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";
import AuthLogin from "../auth/AuthLogin";

const Login2 = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/auth/login`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
        headers: { "Content-Type": "application/json" },
        credentials: "include", // necessario per cookie JWT HttpOnly
      });

      if (!res.ok) {
        let message = "Credenziali non valide";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch (_) {}
        throw new Error(message);
      }

      // ✅ Se login OK → forza redirect
      window.location.href = "/";

    } catch (e: any) {
      setError(e.message || "Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Login" description="Pagina di accesso">
      <Box
        sx={{
          position: "relative",
          "&:before": {
            content: '""',
            background: "radial-gradient(#d2f1df, #d3d7fa, #3b3e42ff)",
            backgroundSize: "400% 400%",
            animation: "gradient 15s ease infinite",
            position: "absolute",
            height: "100%",
            width: "100%",
            opacity: 0.3,
          },
        }}
      >
        <Grid container spacing={0} justifyContent="center" sx={{ height: "100vh" }}>
          <Grid
            display="flex"
            justifyContent="center"
            alignItems="center"
            size={{ xs: 12, sm: 12, lg: 4, xl: 3 }}
          >
            <Card elevation={9} sx={{ p: 4, zIndex: 1, width: "100%", maxWidth: "500px" }}>
              <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                <Logo />
              </Box>

              <AuthLogin
                onSubmit={handleLogin}
                subtext={
                  <Typography variant="subtitle1" textAlign="center" color="textSecondary" mb={1}>
                    Inserisci le tue credenziali per accedere
                  </Typography>
                }
              />

              {loading && (
                <Box textAlign="center" mt={2}>
                  <CircularProgress size={26} />
                </Box>
              )}

              {error && (
                <Typography color="error" textAlign="center" mt={2}>
                  {error}
                </Typography>
              )}
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Login2;
