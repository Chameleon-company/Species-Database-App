import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@sda/ui/components/alert";
import { Button } from "@sda/ui/components/button";
import { useLanguage } from "../../useLanguage";

type LoadErrorProps = {
  children: ReactNode;
  onRetry: () => void;
};

export default function LoadError({ children, onRetry }: LoadErrorProps) {
  const { t } = useLanguage();

  return (
    <Alert variant="destructive" className="flex items-center gap-3 rounded-xl border-destructive/40 bg-destructive-soft">
      <CircleAlert />
      <AlertDescription className="flex-1 text-destructive">{children}</AlertDescription>
      <Button variant="outline" size="sm" onClick={onRetry} className="border-destructive/40 text-destructive hover:bg-card hover:text-destructive-hover">
        {t("retry")}
      </Button>
    </Alert>
  );
}
