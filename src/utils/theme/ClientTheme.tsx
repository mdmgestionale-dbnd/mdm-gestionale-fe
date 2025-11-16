// utils/theme/ClientTheme.tsx
import { createTheme } from "@mui/material/styles";

const clientTheme = createTheme({
  palette: {
    background: {
      default: "#1E1E1E",
      paper: "#121212",
    },
    primary: { main: "#C9A856" },
    secondary: { main: "#2E8B57" },
    text: {
      primary: "#F5F5DC",
      secondary: "#B0B0B0",
    },
    divider: "rgba(255,255,255,0.08)",
  },
  typography: {
    fontFamily: "Outfit, Poppins, sans-serif",
    h6: { fontWeight: 600, color: "#C9A856" },
    body1: { color: "#F5F5DC" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: "12px", padding: "10px 18px" },
        contained: {
          color: "#121212",
          backgroundColor: "#F5F5DC",
          "&:hover": { backgroundColor: "#e7e7d8" },
          "&.Mui-disabled": {
            backgroundColor: "rgba(201,168,86,0.4)", // più chiaro
            color: "rgba(18,18,18,0.7)",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: "#FFFFFF",
          backgroundColor: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.24)",
          borderRadius: 10,
          "&:hover": { backgroundColor: "rgba(255,255,255,0.18)" },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: "#1E1E1E", color: "#F5F5DC", borderRadius: "14px" },
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 16 } },
    },
  },
});

export default clientTheme;
