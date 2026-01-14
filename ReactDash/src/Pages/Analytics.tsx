import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Divider,
} from "@mui/material";

import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LoginIcon from "@mui/icons-material/Login";
import TimerIcon from "@mui/icons-material/Timer";
import SpaIcon from "@mui/icons-material/Spa";
import ImageIcon from "@mui/icons-material/Image";

type Overview = {
  total_users: number;
  active_users: number;
  total_logins: number;
  average_session_duration: number;
  total_species: number;
  species_with_media: number;
};

type UserAnalytics = {
  user_id: number;
  name: string;
  role: string;
  is_active: boolean;
  login_count: number;
  total_duration: number;
  average_duration: number;
  last_login: string | null;
};

export default function Analytics() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`http://127.0.0.1:5000/analytics/overview`).then((res) =>
        res.json()
      ),
      fetch(`http://127.0.0.1:5000/analytics/users`).then((res) => res.json()),
    ])
      .then(([overviewData, userData]) => {
        setOverview(overviewData);
        setUsers(userData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={5}>
      <Typography variant="h4" align="center" gutterBottom>
        Analytics Dashboard
      </Typography>

      <Typography align="center" mb={5}>
        Overview of user activity and species database engagement
      </Typography>

      {/* OVERVIEW STATS */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
        gap={3}
        mb={6}
      >
        <StatCard
          icon={<PeopleIcon />}
          label="Total Users"
          value={overview?.total_users}
        />
        <StatCard
          icon={<CheckCircleIcon />}
          label="Active Users"
          value={overview?.active_users}
        />
        <StatCard
          icon={<LoginIcon />}
          label="Total Logins"
          value={overview?.total_logins}
        />
        <StatCard
          icon={<TimerIcon />}
          label="Avg Session (min)"
          value={overview?.average_session_duration}
        />
        <StatCard
          icon={<SpaIcon />}
          label="Total Species"
          value={overview?.total_species}
        />
        <StatCard
          icon={<ImageIcon />}
          label="Species with Media"
          value={overview?.species_with_media}
        />
      </Box>

      <Divider sx={{ mb: 4, borderColor: "white" }} />

      {/* USER ANALYTICS */}
      <Typography variant="h5" mb={3}>
        User Activity Breakdown
      </Typography>

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))"
        gap={3}
      >
        {users.map((user) => (
          <Card key={user.user_id} elevation={3}>
            <CardContent>
              <Typography variant="h6">{user.name}</Typography>
              <Typography color="text.secondary">Role: {user.role}</Typography>

              <Divider sx={{ my: 1 }} />

              <Typography>Logins: {user.login_count}</Typography>
              <Typography>Total Duration: {user.total_duration} min</Typography>
              <Typography>
                Avg Duration: {user.average_duration.toFixed(1)} min
              </Typography>
              <Typography>
                Last Login:{" "}
                {user.last_login
                  ? new Date(user.last_login).toLocaleString()
                  : "—"}
              </Typography>

              <Typography
                mt={1}
                color={user.is_active ? "success.main" : "error.main"}
              >
                {user.is_active ? "Active" : "Inactive"}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
}) {
  return (
    <Card elevation={4}>
      <CardContent
        sx={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Box fontSize={40}>{icon}</Box>
        <Typography variant="h5">{value ?? "—"}</Typography>
        <Typography color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
}
