import type { ReactNode } from "react"

interface PageContainerProps {
  children: ReactNode
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-5 overflow-hidden px-6 py-5">
      {children}
    </div>
  )
}
