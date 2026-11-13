import type { ReactNode } from "react";

type PageProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export default function Page({ title, subtitle, actions, children }: PageProps) {
  return (
    <div className="px-4 py-7 sm:px-9">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 h-1 w-9 rounded-full bg-linear-to-r from-primary to-brand-accent" />
          <h1 className="text-title text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-compact text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
