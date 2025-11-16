import { createTheme } from "@mui/material/styles";
import { Plus_Jakarta_Sans } from "next/font/google";

export const plus = Plus_Jakarta_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  fallback: ["Helvetica", "Arial", "sans-serif"],
});

const darkTheme = createTheme({
  direction: "ltr",
  palette: {
    mode: "dark",
    primary: {
      main: "#2E7D32", // verde aziendale
      light: "#60AD5E",
      dark: "#005005",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#FFD700", // giallo lampadina
      light: "#FFE54F",
      dark: "#BFA300",
      contrastText: "#000000",
    },
    success: {
      main: "#13DEB9",
      contrastText: "#FFFFFF",
    },
    info: {
      main: "#64B5F6",
      contrastText: "#FFFFFF",
    },
    error: {
      main: "#E53935",
      contrastText: "#FFFFFF",
    },
    warning: {
      main: "#FFB300",
      contrastText: "#000000",
    },
    grey: {
      100: "#121212",
      200: "#1A1A1A",
      300: "#212121",
      400: "#2A2A2A",
      500: "#7C8FAC",
      600: "#A3AEC6",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#C8CCD6",
    },
    background: {
      default: "#0B0B0B",
      paper: "#1A1A1A",
    },
    divider: "rgba(255, 255, 255, 0.12)",
  },
  typography: {
    fontFamily: plus.style.fontFamily,
    h1: { fontWeight: 600, fontSize: "2.25rem", lineHeight: "2.75rem" },
    h2: { fontWeight: 600, fontSize: "1.875rem", lineHeight: "2.25rem" },
    h3: { fontWeight: 600, fontSize: "1.5rem", lineHeight: "1.75rem" },
    h4: { fontWeight: 600, fontSize: "1.3125rem", lineHeight: "1.6rem" },
    h5: { fontWeight: 600, fontSize: "1.125rem", lineHeight: "1.6rem" },
    h6: { fontWeight: 600, fontSize: "1rem", lineHeight: "1.2rem" },
    button: { textTransform: "capitalize", fontWeight: 400 },
    body1: { fontSize: "0.875rem", fontWeight: 400, lineHeight: "1.334rem" },
    body2: { fontSize: "0.75rem", fontWeight: 400, lineHeight: "1rem" },
  },
});

export { darkTheme as baselightTheme };
