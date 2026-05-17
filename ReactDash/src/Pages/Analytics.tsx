import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Divider,
  Chip,
  Alert,
} from "@mui/material";

import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LoginIcon from "@mui/icons-material/Login";
import TimerIcon from "@mui/icons-material/Timer";
import SpaIcon from "@mui/icons-material/Spa";
import ImageIcon from "@mui/icons-material/Image";
import WarningIcon from "@mui/icons-material/Warning";
import InsightsIcon from "@mui/icons-material/Insights";
import StarIcon from "@mui/icons-material/Star";

import { adminFetch } from "../utils/adminFetch";
import { translations } from "../translations";
import LanguageToggle from "../Components/LanguageToggle";
import { useLanguage } from "../LanguageContext";


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
  login_count: number | null;
  total_duration: number | null;
  average_duration: number | null;
  last_login: string | null;
};

const API_URL = import.meta.env.VITE_API_BASE;

function safeNumber(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

function formatLastLogin(lastLogin: string | null): string {
  if (!lastLogin) return "Never logged in";
  return new Date(lastLogin).toLocaleString();
}

function getActivityLabel(user: UserAnalytics): string {
  const loginCount = safeNumber(user.login_count);

  if (loginCount === 0) return "No Activity";
  if (loginCount < 3) return "Low Activity";
  return "Active User";
}

export default function Analytics() {
  const { lang, setLang } = useLanguage();

  const t = (key: string) => (translations as any)[key]?.[lang] || key;

  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiWarning, setApiWarning] = useState("");

  useEffect(() => {
    Promise.all([
      adminFetch(`${API_URL}/analytics/overview`).then((res) => res.json()),
      adminFetch(`${API_URL}/analytics/users`).then((res) => res.json()),
    ])
      .then(([overviewData, userData]) => {
        if (overviewData && !overviewData.error) {
          setOverview(overviewData);
        } else {
          setOverview(null);
          setApiWarning(
            "Some analytics data could not be loaded because the backend returned an error."
          );
          console.error("Overview API error:", overviewData);
        }

        if (Array.isArray(userData)) {
          setUsers(userData);
        } else {
          setUsers([]);
          setApiWarning(
            "User activity data could not be loaded because the backend returned an error."
          );
          console.error("Users API error:", userData);
        }
      })
      .catch((error) => {
        setOverview(null);
        setUsers([]);
        setApiWarning(
          "Analytics data could not be loaded. Please check the backend API connection."
        );
        console.error("Analytics API failed:", error);
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

  const sortedUsers = [...users].sort(
    (a, b) => safeNumber(b.login_count) - safeNumber(a.login_count)
  );

  const mostActiveUser = sortedUsers.length > 0 ? sortedUsers[0] : null;
  const usersWithNoLogin = users.filter((user) => safeNumber(user.login_count) === 0).length;
  const inactiveUsers = users.filter((user) => !user.is_active).length;

  return (
    <Box
      sx={{
        p: "28px 36px",
        backgroundColor: "#f7fbf2",
        fontFamily: "'DM Sans', sans-serif",
        minHeight: "100vh",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 4,
              background: "linear-gradient(90deg,#2d6a0a,#86b85a)",
              mb: 1,
            }}
          />
  
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{ color: "#1a2e10", fontSize: { xs: "1.8rem", md: "2.5rem" } }}
          >
            {t("analyticsDashboard")}
          </Typography>
        </Box>
  
      </Box>
  
      <Typography align="center" mb={5} sx={{ color: "#7a9464" }}>
        {t("analyticsDescription")}
      </Typography>
  
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
        gap={3}
        mb={6}
      >
        <StatCard icon={<PeopleIcon />} label={t("totalUsers")} value={overview?.total_users} />
        <StatCard icon={<CheckCircleIcon />} label={t("activeUsers")} value={overview?.active_users} />
        <StatCard icon={<LoginIcon />} label={t("totalLogins")} value={overview?.total_logins} />
        <StatCard icon={<TimerIcon />} label={t("avgSession")} value={overview?.average_session_duration} />
        <StatCard icon={<SpaIcon />} label={t("totalSpecies")} value={overview?.total_species} />
        <StatCard icon={<ImageIcon />} label={t("speciesWithMedia")} value={overview?.species_with_media} />
      </Box>
  
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(320px, 1fr))"
        gap={3}
        mb={2}
      >
        <Card
          elevation={0}
          sx={{
            border: "1px solid #d8edbd",
            borderRadius: 3,
            boxShadow: "0 2px 12px rgba(45,106,10,0.07)",
          }}
        >
          <CardContent>
            <Typography variant="h6" align="center" gutterBottom sx={{ color: "#1a2e10", fontWeight: 700 }}>
              {t("activeUsersOverTime")}
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
  
        <Card
          elevation={0}
          sx={{
            border: "1px solid #d8edbd",
            borderRadius: 3,
            boxShadow: "0 2px 12px rgba(45,106,10,0.07)",
          }}
        >
          <CardContent>
            <Typography variant="h6" align="center" gutterBottom sx={{ color: "#1a2e10", fontWeight: 700 }}>
              {t("loginFrequency")}
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
  
      <Divider sx={{ mb: 4, borderColor: "#d8edbd" }} />
  
      <Typography variant="h5" mb={3} sx={{ color: "#1a2e10", fontWeight: 700 }}>
        {t("userActivity")}
      </Typography>
  
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))"
        gap={3}
      >
        {users.map((user) => (
          <Card
            key={user.user_id}
            elevation={0}
            sx={{
              border: "1px solid #d8edbd",
              borderRadius: 3,
              boxShadow: "0 2px 12px rgba(45,106,10,0.07)",
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ color: "#1a2e10", fontWeight: 700 }}>
                {user.name}
              </Typography>
  
              <Typography color="text.secondary">
                {t("role")}: {user.role}
              </Typography>
  
              <Divider sx={{ my: 1, borderColor: "#d8edbd" }} />
  
              <Typography>{t("logins")}: {user.login_count}</Typography>
              <Typography>{t("totalDuration")}: {user.total_duration} min</Typography>
              <Typography>{t("avgDuration")}: {user.average_duration.toFixed(1)} min</Typography>
  
              <Typography>
                {t("lastLogin")}:{" "}
                {user.last_login ? new Date(user.last_login).toLocaleString() : "—"}
              </Typography>
  
              <Typography mt={1} color={user.is_active ? "success.main" : "error.main"}>
                {user.is_active ? t("active") : t("inactive")}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );

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
      <Card
        elevation={0}
        sx={{
          border: "1px solid #d8edbd",
          borderRadius: 3,
          boxShadow: "0 2px 12px rgba(45,106,10,0.07)",
        }}
      >
        <CardContent sx={{ textAlign: "center" }}>
          <Box fontSize={40} sx={{ color: "#2d6a0a" }}>
            {icon}
          </Box>
          <Typography variant="h5" sx={{ color: "#1a2e10", fontWeight: 700 }}>
            {value ?? "—"}
          </Typography>
          <Typography color="text.secondary">{label}</Typography>
        </CardContent>
      </Card>
    );
  }
}