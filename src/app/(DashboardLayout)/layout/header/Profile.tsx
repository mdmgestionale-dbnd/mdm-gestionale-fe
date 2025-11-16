import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  Menu,
  Button,
  IconButton,
  Typography,
} from "@mui/material";

const Profile = () => {
  const router = useRouter();
  const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await fetch(`${backendUrl}/auth/me`, {
          method: "GET",
          credentials: "include", // necessario per cookie HttpOnly
        });

        if (res.ok) {
          const data = await res.json();
          setUsername(data.username || "Utente");
        } else {
          console.error("Impossibile ottenere l'utente corrente");
        }
      } catch (err) {
        console.error("Errore fetch current user:", err);
      }
    };

    fetchCurrentUser();
  }, []);

  const handleClick2 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };

  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const handleLogout = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      await fetch(`${backendUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      router.replace("/authentication/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <Box>
      <IconButton
        size="large"
        aria-label="profile"
        color="inherit"
        aria-controls="profile-menu"
        aria-haspopup="true"
        sx={{
          ...(typeof anchorEl2 === "object" && {
            color: "primary.main",
          }),
        }}
        onClick={handleClick2}
      >
        <Avatar
          src="/images/profile/user.jpg"
          alt="image"
          sx={{ width: 35, height: 35 }}
        />
      </IconButton>

      <Menu
        id="profile-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        sx={{ "& .MuiMenu-paper": { width: "220px" } }}
      >
        <Box mt={1} py={1} px={2}>
          <Typography
            variant="subtitle1"
            sx={{ mb: 1, fontWeight: "bold", textAlign: "center" }}
          >
            {username}
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Profile;
