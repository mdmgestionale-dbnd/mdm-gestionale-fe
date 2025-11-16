'use client';

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ReactNode } from "react";
import Head from "next/head";
import { baselightTheme } from "@/utils/theme/DefaultColors";
import './global.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it-IT">
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
      </Head>

      <body>
        <style jsx global>{`
          html, body {
            touch-action: pan-x pan-y;
            -ms-touch-action: pan-x pan-y;
            -webkit-user-select: none;
            user-select: none;
            margin: 0;
            padding: 0;
            font-size: 16px; /* Base leggibile su mobile */
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
