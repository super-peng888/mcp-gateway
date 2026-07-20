import type { ReactNode } from "react"

interface StatChipProps {
  icon?: ReactNode
  value: ReactNode
  label: string
  /** tinted background+text pair, e.g. "bg-blue-500/10 text-blue-700" */
  tone?: string
}

export function StatChip({
  icon,
  value,
  label,
  tone = "bg-blue-500/10 text-blue-700",
}: StatChipProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/50 bg-white/60 px-4 py-3 shadow-[0_4px_16px_rgba(16,24,40,0.06)] backdrop-blur-md transition-all hover:shadow-[0_8px_24px_rgba(16,24,40,0.1)] hover:-translate-y-0.5">
      {icon && (
        <span
          className={`flex size-8 items-center justify-center rounded-lg ${tone} ring-1 ring-white/50`}
        >
          {icon}
        </span>
      )}
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold text-slate-900">{value}</span>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
    </div>
  )
}
