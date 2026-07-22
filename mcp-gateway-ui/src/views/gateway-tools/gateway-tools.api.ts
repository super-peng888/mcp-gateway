import { listTools } from "@/api/tools"
import type { ToolView } from "@/api/types"

export async function fetchGatewayTools({
  search,
  sorter,
}: {
  search: { toolName: string; serverName: string }
  sorter: { field: string; order: "ascend" | "descend" | null }
}) {
  const res = await listTools()
  let tools: ToolView[] = res.data

  if (search.toolName) {
    tools = tools.filter((t) =>
      t.name.toLowerCase().includes(search.toolName.toLowerCase())
    )
  }
  if (search.serverName) {
    tools = tools.filter((t) =>
      t.serverName.toLowerCase().includes(search.serverName.toLowerCase())
    )
  }

  if (sorter.field && sorter.order) {
    const factor = sorter.order === "ascend" ? 1 : -1
    tools = [...tools].sort((a, b) => {
      const aVal = String(
        (a as unknown as Record<string, unknown>)[sorter.field] ?? ""
      )
      const bVal = String(
        (b as unknown as Record<string, unknown>)[sorter.field] ?? ""
      )
      return aVal.localeCompare(bVal) * factor
    })
  }

  return tools
}
