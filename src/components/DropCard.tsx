"use client";

import { ReactNode } from "react";

type DropCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function DropCard({ title, subtitle, action, children }: DropCardProps) {
  return (
    <section className="w-full border border-[rgba(0,255,65,0.2)] bg-[var(--card)]/90 p-6 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
      <header className="mb-6 flex flex-col gap-3 border-b border-[rgba(0,255,65,0.12)] pb-4 text-left md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[0.3em] text-[var(--accent)]">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-[rgba(224,224,224,0.7)]">{subtitle}</p>}
        </div>
        {action && <div className="md:text-right">{action}</div>}
      </header>
      <div className="space-y-4 text-sm text-[var(--text)]">{children}</div>
    </section>
  );
}
