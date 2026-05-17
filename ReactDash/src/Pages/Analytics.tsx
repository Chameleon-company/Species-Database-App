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
    <Box p={5}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">
          {t.analyticsDashboard}
        </Typography>

        <Box display="flex" gap={1}>
          <button onClick={() => changeLang("en")}>EN</button>
          <button onClick={() => changeLang("tet")}>TET</button>
        </Box>
      </Box>

      <Typography align="center" mb={5}>
      {t("analyticsDescription")}
      </Typography>

      {apiWarning && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          {apiWarning}
        </Alert>
      )}

      {/* OVERVIEW */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
        gap={3}
        mb={6}
      >
        <StatCard icon={<PeopleIcon />} label={t.totalUsers} value={overview?.total_users} />
        <StatCard icon={<CheckCircleIcon />} label={t.activeUsers} value={overview?.active_users} />
        <StatCard icon={<LoginIcon />} label={t.totalLogins} value={overview?.total_logins} />
        <StatCard icon={<TimerIcon />} label={t.avgSession} value={overview?.average_session_duration} />
        <StatCard icon={<SpaIcon />} label={t.totalSpecies} value={overview?.total_species} />
        <StatCard icon={<ImageIcon />} label={t.speciesWithMedia} value={overview?.species_with_media} />
      </Box>

      {/* CHARTS */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(320px, 1fr))"
        gap={3}
        mb={2}
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

      <Typography variant="caption" display="block" align="center" mb={6}>
        Charts currently use sample time-series data because backend historical session data is not available yet.
      </Typography>

      {/* SESSION INSIGHTS */}
      <Typography variant="h5" mb={3}>
        Session Tracking Insights
      </Typography>

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
        gap={3}
        mb={6}
      >
        <InsightCard
          icon={<StarIcon />}
          title="Most Active User"
          value={mostActiveUser ? mostActiveUser.name : "No users found"}
          description={
            mostActiveUser
              ? `${safeNumber(mostActiveUser.login_count)} login(s)`
              : "No login activity available"
          }
        />

        <InsightCard
          icon={<WarningIcon />}
          title="Users With No Login"
          value={users.length > 0 ? usersWithNoLogin : "—"}
          description="Users who have not logged in yet"
        />

        <InsightCard
          icon={<InsightsIcon />}
          title="Inactive Users"
          value={users.length > 0 ? inactiveUsers : "—"}
          description="Users currently marked as inactive"
        />
      </Box>

      <Divider sx={{ mb: 4, borderColor: "white" }} />

      {/* USER ACTIVITY */}
      <Typography variant="h5" mb={1}>
        {t.userActivity}
      </Typography>

      <Typography color="text.secondary" mb={3}>
        Session time is shown in minutes. Users are sorted by highest login count first.
      </Typography>

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))"
        gap={3}
      >
        {sortedUsers.length === 0 ? (
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6">No user activity data available</Typography>
              <Typography color="text.secondary">
                The backend analytics API is currently not returning user session data.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          sortedUsers.map((user) => (
            <Card key={user.user_id} elevation={3}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box>
                    <Typography variant="h6">{user.name}</Typography>
                    <Typography color="text.secondary">
                      {t.role}: {user.role}
                    </Typography>
                  </Box>

                  <Chip
                    label={user.is_active ? "ACTIVE" : "INACTIVE"}
                    color={user.is_active ? "success" : "error"}
                    size="small"
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                  Session Details
                </Typography>

                <Typography>{t.logins}: {safeNumber(user.login_count)}</Typography>
                <Typography>{t.totalDuration}: {safeNumber(user.total_duration)} min</Typography>
                <Typography>
                  {t.avgDuration}: {safeNumber(user.average_duration).toFixed(1)} min
                </Typography>
                <Typography>{t.lastLogin}: {formatLastLogin(user.last_login)}</Typography>

                <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                  <Chip
                    label={getActivityLabel(user)}
                    color={safeNumber(user.login_count) === 0 ? "warning" : "primary"}
                    size="small"
                  />

                  {safeNumber(user.login_count) === 0 && (
                    <Chip label="No login activity recorded" color="warning" size="small" />
                  )}
                </Box>
              </CardContent>
            </Card>
          ))
        )}
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
  value?: number | null;
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

function InsightCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <Card elevation={4}>
      <CardContent sx={{ textAlign: "center" }}>
        <Box fontSize={36}>{icon}</Box>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="h5" sx={{ my: 1 }}>
          {value}
        </Typography>
        <Typography color="text.secondary">{description}</Typography>
      </CardContent>
    </Card>
  );
}