import type { ReactNode } from "react";

type SectionTone = "default" | "blue" | "green" | "purple" | "yellow" | "red";

const toneClasses: Record<SectionTone, string> = {
  default: "border-t-slate-200",
  blue: "border-t-blue-500",
  green: "border-t-emerald-500",
  purple: "border-t-violet-500",
  yellow: "border-t-amber-500",
  red: "border-t-red-500",
};

interface ResultSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: SectionTone;
}

export default function ResultSection({
  title,
  description,
  children,
  tone = "default",
}: ResultSectionProps) {
  return (
    <section className={`rounded-lg border border-slate-200 border-t-4 bg-white p-5 shadow-soft ${toneClasses[tone]}`}>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
