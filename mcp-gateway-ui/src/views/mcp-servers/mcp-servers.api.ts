import { listServers } from "@/api/servers"
import type { McpServer } from "@/api/types"

export async function fetchMcpServers({
  search,
  sorter,
}: {
  search: { name: string; baseUrl: string }
  sorter: { field: string; order: "ascend" | "descend" | null }
}) {
  const res = await listServers()
  let servers: McpServer[] = res.data

  if (search.name) {
    servers = servers.filter((s) =>
      s.name.toLowerCase().includes(search.name.toLowerCase())
    )
  }
  if (search.baseUrl) {
    servers = servers.filter((s) =>
      s.baseUrl.toLowerCase().includes(search.baseUrl.toLowerCase())
    )
  }

  if (sorter.field && sorter.order) {
    const factor = sorter.order === "ascend" ? 1 : -1
    servers = [...servers].sort((a, b) => {
      const aVal = String(
        (a as unknown as Record<string, unknown>)[sorter.field] ?? ""
      )
      const bVal = String(
        (b as unknown as Record<string, unknown>)[sorter.field] ?? ""
      )
      return aVal.localeCompare(bVal) * factor
    })
  }

  return servers
}
