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
import { adminFetch } from "../utils/adminFetch";
import { translations } from "../translations";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

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

const API_URL = import.meta.env.VITE_API_BASE;

export default function Analytics() {
  const [lang, setLang] = useState<"en" | "tet">(
    (localStorage.getItem("lang") as "en" | "tet") || "en"
  );
  const t = (key: string) =>
    (translations as any)[key]?.[lang] || key;

  const changeLang = (newLang: "en" | "tet") => {
    localStorage.setItem("lang", newLang);
    setLang(newLang);
  };

  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminFetch(`${API_URL}/analytics/overview`).then((res) => res.json()),
      adminFetch(`${API_URL}/analytics/users`).then((res) => res.json()),
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

  // Demo chart data for time-based analytics
  // Existing cards and user activity still use real backend data
  const activeUsersTrend = [
    { date: "Mon", users: 10 },
    { date: "Tue", users: 11 },
    { date: "Wed", users: 9 },
    { date: "Thu", users: 13 },
    { date: "Fri", users: 14 },
  ];

  const loginFrequencyTrend = [
    { date: "Mon", logins: 2 },
    { date: "Tue", logins: 4 },
    { date: "Wed", logins: 1 },
    { date: "Thu", logins: 3 },
    { date: "Fri", logins: 5 },
  ];

  return (
    <Box p={5}>
      <div className="flex justify-between mb-4 items-center">
  <h2 className="text-3xl font-bold">{t("analyticsDashboard")}</h2>

  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <button onClick={() => changeLang("en")}>EN</button>
    <button onClick={() => changeLang("tet")}>TET</button>
  </div>
</div>
      <Typography align="center" mb={5}>
      {t("analyticsDescription")}
      </Typography>

      {/* OVERVIEW */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
        gap={3}
        mb={6}
      >
        <StatCard
          icon={<PeopleIcon />}
          label={t("totalUsers")}
          value={overview?.total_users}
        />
        <StatCard
          icon={<CheckCircleIcon />}
          label={t("activeUsers")}
          value={overview?.active_users}
        />
        <StatCard
          icon={<LoginIcon />}
          label={t("totalLogins")}
          value={overview?.total_logins}
        />
        <StatCard
          icon={<TimerIcon />}
          label={t("avgSession")}
          value={overview?.average_session_duration}
        />
        <StatCard
          icon={<SpaIcon />}
          label={t("totalSpecies")}
          value={overview?.total_species}
        />
        <StatCard
          icon={<ImageIcon />}
          label={t("speciesWithMedia")}
          value={overview?.species_with_media}
        />
      </Box>

      {/* CHARTS */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(320px, 1fr))"
        gap={3}
        mb={6}
      >
        <Card elevation={4}>
          <CardContent>
            <Typography variant="h6" align="center" gutterBottom>
              Active Users Over Time
            </Typography>

            <Box sx={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeUsersTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#4CAF50" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={4}>
          <CardContent>
            <Typography variant="h6" align="center" gutterBottom>
              Login Frequency
            </Typography>

            <Box sx={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loginFrequencyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="logins" stroke="#1976d2" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Divider sx={{ mb: 4, borderColor: "white" }} />

      {/* USERS */}
      <Typography variant="h5" mb={3}>
      {t("userActivity")}
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
              <Typography color="text.secondary">
              {t("role")}: {user.role}
              </Typography>

              <Divider sx={{ my: 1 }} />

              <Typography>
              {t("logins")}: {user.login_count}
              </Typography>
              <Typography>
              {t("totalDuration")}: {user.total_duration} min
              </Typography>
              <Typography>
              {t("avgDuration")}: {user.average_duration.toFixed(1)} min
              </Typography>
              <Typography>
              {t("lastLogin")}:{" "}
                {user.last_login
                  ? new Date(user.last_login).toLocaleString()
                  : "—"}
              </Typography>

              <Typography
                mt={1}
                color={user.is_active ? "success.main" : "error.main"}
              >
                {user.is_active ? t("active") : t("inactive")}
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
      <CardContent sx={{ textAlign: "center" }}>
        <Box fontSize={40}>{icon}</Box>
        <Typography variant="h5">{value ?? "—"}</Typography>
        <Typography color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
}