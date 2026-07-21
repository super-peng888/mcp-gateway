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
    <div className="glass-sm glass-hover flex items-center gap-3 rounded-xl px-4 py-3">
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
