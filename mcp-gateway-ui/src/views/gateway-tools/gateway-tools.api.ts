import { listTools } from "@/api/registry"
import type { GatewayTool } from "./gateway-tools.data"

export async function fetchGatewayTools({
  search,
  sorter,
}: {
  search: { toolName: string; groupName: string }
  sorter: { field: string; order: "ascend" | "descend" | null }
}) {
  const res = await listTools()
  let tools: GatewayTool[] = res.data.map((tool) => ({
    id: tool.endpointId,
    toolName: tool.toolName,
    endpointName: tool.endpointName,
    method: tool.method,
    path: tool.path,
    description: tool.description,
    groupName: tool.groupName,
    baseUrl: tool.baseUrl,
  }))

  if (search.toolName) {
    tools = tools.filter((t) =>
      t.toolName.toLowerCase().includes(search.toolName.toLowerCase())
    )
  }
  if (search.groupName) {
    tools = tools.filter((t) =>
      t.groupName.toLowerCase().includes(search.groupName.toLowerCase())
    )
  }

  if (sorter.field && sorter.order) {
    const factor = sorter.order === "ascend" ? 1 : -1
    tools = [...tools].sort((a, b) => {
      const aVal = String(
        (a as unknown as Record<string, string>)[sorter.field] ?? ""
      )
      const bVal = String(
        (b as unknown as Record<string, string>)[sorter.field] ?? ""
      )
      return aVal.localeCompare(bVal) * factor
    })
  }

  return tools
}
