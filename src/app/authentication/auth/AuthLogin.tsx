import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
} from "@mui/material";

import CustomTextField from "@/app/(DashboardLayout)/components/authentication/CustomTextField";

interface LoginType {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
  onSubmit: (username: string, password: string) => void;
}

const AuthLogin = ({ title, subtitle, subtext, onSubmit }: LoginType) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(username, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      {title ? (
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <Stack>
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            component="label"
            htmlFor="username"
            mb="5px"
          >
            Username
          </Typography>
          <CustomTextField
            variant="outlined"
            fullWidth
            id="username"
            value={username}
            onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setUsername(e.target.value)}
          />
        </Box>
        <Box mt="25px">
          <Typography
            variant="subtitle1"
            fontWeight={600}
            component="label"
            htmlFor="password"
            mb="5px"
          >
            Password
          </Typography>
          <CustomTextField
            type="password"
            variant="outlined"
            fullWidth
            id="password"
            value={password}
            onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setPassword(e.target.value)}
          />
        </Box>

        {/* 
        <Stack
          justifyContent="space-between"
          direction="row"
          alignItems="center"
          my={2}
        >
          <FormGroup>
            <FormControlLabel
              control={<Checkbox defaultChecked />}
              label="Remember this Device"
            />
          </FormGroup>
          <Typography
            component={Link}
            href="/"
            fontWeight="500"
            sx={{
              textDecoration: "none",
              color: "primary.main",
            }}
          >
            Forgot Password ?
          </Typography>
        </Stack>
        */}
      </Stack>

      <Box mt={3}>
        <Button color="primary" variant="contained" size="large" fullWidth type="submit">
          Login
        </Button>
      </Box>

      {subtitle}
    </form>
  );
};

export default AuthLogin;
