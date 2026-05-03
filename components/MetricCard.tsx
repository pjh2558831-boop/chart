import type { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  badge?: ReactNode;
}

export default function MetricCard({ title, value, description, badge }: MetricCardProps) {
  return (
    <div className="relative rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <p className="mt-2 break-words text-2xl font-bold text-slate-950">{value}</p>
      {description ? <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p> : null}
    </div>
  );
}
