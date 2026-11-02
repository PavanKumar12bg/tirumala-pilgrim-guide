import type { ReactNode } from "react";
import { AppShell } from "./AppShell";

export function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AppShell>
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-6 text-foreground">
        <h1 className="text-2xl text-primary">{title}</h1>
        {children}
      </article>
    </AppShell>
  );
}

export const pageMeta = (title: string, description: string) => ({
  meta: [
    { title: `${title} — Tirumala Guide` }, { name: "description", content: description },
    { property: "og:title", content: `${title} — Tirumala Guide` }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ],
});
