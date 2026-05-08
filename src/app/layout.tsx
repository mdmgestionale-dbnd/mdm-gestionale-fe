'use client';

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ReactNode } from "react";
import Head from "next/head";
import { baselightTheme } from "@/utils/theme/DefaultColors";
import './global.css';
import PwaInstallPrompt from "@/app/(DashboardLayout)/components/pwa/PwaInstallPrompt";
import PwaRegister from "@/app/(DashboardLayout)/components/pwa/PwaRegister";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it-IT">
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="application-name" content="MDM Gestionale" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="MDM Gestionale" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/images/logos/logo_transparent.png" />
      </Head>

      <body>
        <style jsx global>{`
          html, body {
            touch-action: pan-x pan-y;
            -ms-touch-action: pan-x pan-y;
            -webkit-user-select: text;
            user-select: text;
            margin: 0;
            padding: 0;
            font-size: 16px; /* Base leggibile su mobile */
            background:
              radial-gradient(circle at 12% 0%, rgba(46, 125, 50, 0.22), transparent 32%),
              radial-gradient(circle at 90% 12%, rgba(255, 215, 0, 0.12), transparent 28%),
              linear-gradient(180deg, #050805 0%, #0b0b0b 48%, #121212 100%);
            min-height: 100%;
          }

          /* Layout responsive */
          body, #__next {
            width: 100%;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }

          img, video, canvas {
            max-width: 100%;
            height: auto;
          }

          /* Evita overflow orizzontale */
          * {
            box-sizing: border-box;
          }
        `}</style>

        <ThemeProvider theme={baselightTheme}>
          <CssBaseline />
          <PwaRegister />
          <PwaInstallPrompt />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
