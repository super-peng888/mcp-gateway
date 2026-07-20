import type { ReactNode } from "react"

interface EmptyStateProps {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  /** tinted icon background+text pair */
  tone?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "bg-blue-500/10 text-blue-600",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <span
        className={`flex size-16 items-center justify-center rounded-2xl ${tone} shadow-[0_8px_24px_rgba(37,99,235,0.15)] ring-1 ring-white/50 backdrop-blur-sm`}
      >
        {icon}
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-slate-900">{title}</p>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
