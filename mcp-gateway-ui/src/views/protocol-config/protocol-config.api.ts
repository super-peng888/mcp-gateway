import { listGroups, type ApiGroup } from "@/api/registry"
import type { ProtocolConfigSearch } from "./protocol-config.data"

export async function fetchProtocolGroups({
  search,
  sorter,
}: {
  search: ProtocolConfigSearch
  sorter: { field: string; order: "ascend" | "descend" | null }
}) {
  const res = await listGroups()
  let groups: ApiGroup[] = res.data

  if (search.id) {
    groups = groups.filter((g) =>
      g.name.toLowerCase().includes(search.id.toLowerCase())
    )
  }
  if (search.url) {
    groups = groups.filter((g) =>
      g.baseUrl.toLowerCase().includes(search.url.toLowerCase())
    )
  }
  if (search.description) {
    groups = groups.filter((g) =>
      g.description.toLowerCase().includes(search.description.toLowerCase())
    )
  }

  if (sorter.field && sorter.order) {
    const factor = sorter.order === "ascend" ? 1 : -1
    groups = [...groups].sort((a, b) => {
      const aVal = String(
        (a as unknown as Record<string, string>)[sorter.field] ?? ""
      )
      const bVal = String(
        (b as unknown as Record<string, string>)[sorter.field] ?? ""
      )
      return aVal.localeCompare(bVal) * factor
    })
  }

  return groups
}

export type { ApiGroup }
