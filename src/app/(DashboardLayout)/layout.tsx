"use client";
import { styled, Container, Box } from "@mui/material";
import React, { useState } from "react";
import Header from "@/app/(DashboardLayout)/layout/header/Header";
import Sidebar from "@/app/(DashboardLayout)/layout/sidebar/Sidebar";
import { WSProvider } from "@/app/(DashboardLayout)/ws/WSContext";
import GlobalApiLoader from "@/app/(DashboardLayout)/components/loading/GlobalApiLoader";
import MobileDock from "@/app/(DashboardLayout)/components/mobile/MobileDock";


const MainWrapper = styled("div")(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100%",
}));

const PageWrapper = styled("div")(() => ({
  display: "flex",
  flexGrow: 1,
  paddingBottom: "calc(92px + env(safe-area-inset-bottom))",
  flexDirection: "column",
  zIndex: 1,
  background:
    "radial-gradient(circle at top left, rgba(46, 125, 50, 0.22), transparent 34%), radial-gradient(circle at 88% 4%, rgba(255, 215, 0, 0.10), transparent 30%), linear-gradient(180deg, #050805 0%, #0b0b0b 52%, #121212 100%)",
}));

interface Props {
  children: React.ReactNode;
}



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  return (
    <WSProvider>
    <GlobalApiLoader />
    <MainWrapper className="mainwrapper">
      {/* ------------------------------------------- */}
      {/* Sidebar */}
      {/* ------------------------------------------- */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onSidebarClose={() => setMobileSidebarOpen(false)}
      />
      {/* ------------------------------------------- */}
      {/* Main Wrapper */}
      {/* ------------------------------------------- */}
      <PageWrapper className="page-wrapper">
        {/* ------------------------------------------- */}
        {/* Header */}
        {/* ------------------------------------------- */}
        <Header toggleMobileSidebar={() => setMobileSidebarOpen(true)} />
        {/* ------------------------------------------- */}
        {/* PageContent */}
        {/* ------------------------------------------- */}
        <Container
          sx={{
            paddingTop: { xs: "14px", md: "20px" },
            px: { xs: 1.5, sm: 2, md: 3 },
            maxWidth: { xs: "100%", xl: "1320px" },
          }}
          maxWidth={false}
        >
          {/* ------------------------------------------- */}
          {/* Page Route */}
          {/* ------------------------------------------- */}
          <Box sx={{ minHeight: "calc(100vh - 170px)" }}>{children}</Box>
          {/* ------------------------------------------- */}
          {/* End Page */}
          {/* ------------------------------------------- */}
        </Container>
        <MobileDock />
      </PageWrapper>
    </MainWrapper>
    </WSProvider>
  );
}
