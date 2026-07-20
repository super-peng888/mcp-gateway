import type { ReactNode } from "react"

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  extra?: ReactNode
}

export function PageHeader({ title, description, extra }: PageHeaderProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-[#111827]">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-[#6b7280]">{description}</p>
        )}
      </div>
      {extra && <div className="flex items-center gap-2">{extra}</div>}
    </div>
  )
}
