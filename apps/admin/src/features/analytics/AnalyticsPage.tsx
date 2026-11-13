import type { ComponentType, ReactNode } from "react";
import {
  CircleCheck,
  Hourglass,
  Images,
  LogIn,
  Sprout,
  Star,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Badge } from "@sda/ui/components/badge";
import { Card, CardContent } from "@sda/ui/components/card";
import { Separator } from "@sda/ui/components/separator";
import { Skeleton } from "@sda/ui/components/skeleton";
import { cn } from "@sda/ui/lib/utils";
import LoadError from "../../shared/ui/LoadError";
import Page from "../../shared/ui/Page";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";
import { useOverview, useUserActivity, type UserActivity } from "./api";

const count = (value: number | null | undefined) => (typeof value === "number" ? value : 0);

const titleCase = (name: string) =>
  name
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");

function activityKey(user: UserActivity) {
  const logins = count(user.login_count);
  if (logins === 0) return "activityInactive";
  if (logins < 3) return "activityModerate";
  return "activityActive";
}

const cardClass = "gap-0 rounded-xl py-0 shadow-card";

function StatCard({ Icon, label, value }: { Icon: ComponentType<{ className?: string }>; label: string; value?: number }) {
  return (
    <Card className={cardClass}>
      <CardContent className="flex flex-col items-center gap-1 px-4 py-6 text-center">
        <Icon className="size-6 text-primary" />
        <span className="mt-2 text-2xl font-bold">{value ?? "-"}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}:</span> {children}
    </p>
  );
}

export default function AnalyticsPage() {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;
  const overview = useOverview();
  const activity = useUserActivity();

  const users = activity.data ?? [];
  const mostActive = [...users]
    .filter((user) => count(user.login_count) > 0)
    .sort((a, b) => count(b.login_count) - count(a.login_count))[0];
  const loading = overview.isPending || activity.isPending;
  const minutes = (value: number | null) => `${(value ?? 0).toFixed(1)} min`;

  const stats = [
    { Icon: Users, label: t("totalUsers"), value: overview.data?.total_users },
    { Icon: CircleCheck, label: t("activeUsers"), value: overview.data?.active_users },
    { Icon: LogIn, label: t("totalLogins"), value: overview.data?.total_logins },
    { Icon: Hourglass, label: t("avgSession"), value: overview.data?.average_session_duration },
    { Icon: Sprout, label: t("totalSpecies"), value: overview.data?.total_species },
    { Icon: Images, label: t("speciesWithMedia"), value: overview.data?.species_with_media },
    { Icon: TriangleAlert, label: t("usersWithNoLogins"), value: users.filter((user) => count(user.login_count) === 0).length },
    { Icon: TriangleAlert, label: t("inactiveUsers"), value: users.filter((user) => !user.is_active).length },
  ];

  return (
    <Page title={t("analyticsDashboard")} subtitle={t("analyticsDescription")}>
      {(overview.isError || activity.isError) && (
        <LoadError
          onRetry={() => {
            overview.refetch();
            activity.refetch();
          }}
        >
          {t("errorGeneric")}
        </LoadError>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(13.75rem,1fr))] gap-6">
        {loading
          ? stats.map(({ label }) => <Skeleton key={label} className="h-36 rounded-xl" />)
          : stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      {mostActive && (
        <Card className={cn(cardClass, "bg-linear-to-br from-muted to-card")}>
          <CardContent className="flex items-center gap-4 px-6 py-5">
            <Star className="size-8 fill-primary text-primary" />
            <div>
              <p className="text-label text-muted-foreground uppercase">{t("mostActiveUser")}</p>
              <p className="text-lg font-bold">{titleCase(mostActive.name)}</p>
              <p className="text-sm text-icon">
                {count(mostActive.login_count)} {t("logins")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="my-2" />
      <h2 className="text-xl font-bold">{t("userActivity")}</h2>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(18.75rem,1fr))] gap-6">
        {users.map((user) => (
          <Card key={user.user_id} className={cardClass}>
            <CardContent className="flex flex-col gap-1 px-5 py-5">
              <p className="text-lg font-bold">{titleCase(user.name)}</p>
              <Badge className="mb-1 bg-brand-chip text-primary">{t(activityKey(user))}</Badge>
              <Line label={t("role")}>{user.role}</Line>
              <Separator className="my-2" />
              <Line label={t("logins")}>{count(user.login_count)}</Line>
              <Line label={t("totalDuration")}>{minutes(user.total_duration)}</Line>
              <Line label={t("avgDuration")}>{minutes(user.average_duration)}</Line>
              <Line label={t("lastLogin")}>{user.last_login ? new Date(user.last_login).toLocaleString() : "-"}</Line>
              <p className={cn("mt-2 text-sm font-medium", user.is_active ? "text-success" : "text-destructive")}>
                {user.is_active ? t("active") : t("inactive")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Page>
  );
}
