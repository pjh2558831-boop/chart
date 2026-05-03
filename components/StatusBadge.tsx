import type { ReactNode } from "react";

type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info";

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
};

interface StatusBadgeProps {
  label: ReactNode;
  tone?: BadgeTone | string;
}

export default function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const toneClass = tone in toneClasses ? toneClasses[tone as BadgeTone] : `${tone} border`;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClass}`}
    >
      {label}
    </span>
  );
}
