/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type React from "react"
import type {
  TablePaginationConfig,
  SorterResult,
  TableRowSelection,
} from "antd/es/table/interface"
import type {
  ContextMenuItemConfig,
  ToolbarAction,
} from "@/components/DataTable"
import type { TableProps } from "antd"

export interface SearchField<
  S extends Record<string, string> = Record<string, string>,
> {
  key: keyof S & string
  label?: string
  placeholder?: string
  icon?: React.ReactNode
  render?: (value: string, onChange: (value: string) => void) => React.ReactNode
}

export interface TableQueryParams<
  S extends Record<string, string> = Record<string, string>,
> {
  pagination: { current: number; pageSize: number }
  sorter: { field: string; order: "ascend" | "descend" | null }
  search: S
}

export interface TableInstance<T = unknown> {
  setTableProps: (props: Partial<TableBindValues<T>>) => void
}

export interface TableBindValues<
  T = unknown,
  S extends Record<string, string> = Record<string, string>,
> {
  columns: TableProps<T>["columns"]
  rowKey: string | ((record: T) => string | number)
  dataSource: T[]
  loading: boolean
  pagination: TablePaginationConfig | false
  onChange: (
    pagination: TablePaginationConfig,
    filters: unknown,
    sorter: SorterResult<T> | SorterResult<T>[]
  ) => void
  searchFormSchema: SearchField<S>[]
  searchValues: S
  onSearch: (values: S) => void
  onSearchValuesChange: (values: S) => void
  toolbarActions: ToolbarAction[]
  extraActions?: ToolbarAction[]
  contextMenuItems?: (record: T) => ContextMenuItemConfig<T>[]
  emptyText?: React.ReactNode
  scroll?: { x?: number | string | true; y?: number | string }
  rowSelection?: TableRowSelection<T>
  onRow?: TableProps<T>["onRow"]
}

export interface TableActionType<
  T = unknown,
  S extends Record<string, string> = Record<string, string>,
> {
  reload: () => void
  run: (overrides?: Partial<TableQueryParams<S>>) => Promise<void>
  getDataSource: () => T[]
  getRawDataSource: () => T[]
  setTableData: (data: T[]) => void
  setPagination: (
    pagination: Partial<{ current: number; pageSize: number }>
  ) => void
  getPagination: () => { current: number; pageSize: number }
  setLoading: (loading: boolean) => void
  setSearchParams: (params: Partial<S>) => void
  getSearchParams: () => S
  clearSearchParams: () => void
  setContextMenuItems: (
    items: ((record: T) => ContextMenuItemConfig<T>[]) | undefined
  ) => void
  setExtraActions: (actions: ToolbarAction[]) => void
  getSelectedRowKeys: () => React.Key[]
  setSelectedRowKeys: (keys: React.Key[]) => void
  clearSelection: () => void
}

export interface UseTableOptions<
  T,
  S extends Record<string, string> = Record<string, string>,
> {
  columns: TableProps<T>["columns"]
  rowKey: string | ((record: T) => string | number)
  fetcher: (
    params: TableQueryParams<S>
  ) => Promise<T[] | { list: T[]; total: number }>
  defaultPagination?: Partial<{ current: number; pageSize: number }>
  defaultSort?: { field: string; order: "ascend" | "descend" }
  searchFormSchema?: SearchField<S>[]
  toolbarActions?: ToolbarAction[]
  extraActions?: ToolbarAction[]
  contextMenuItems?: (record: T) => ContextMenuItemConfig<T>[]
  emptyText?: React.ReactNode
  scroll?: { x?: number | string | true; y?: number | string }
  onRow?: TableProps<T>["onRow"]
  onBeforeFetch?: () => void | Promise<void>
  onAfterFetch?: (data: T[]) => void | Promise<void>
  manual?: boolean
}

export interface UseTableReturn<
  T,
  S extends Record<string, string> = Record<string, string>,
> {
  registerTable: (instance: TableInstance<T>) => void
  actions: TableActionType<T, S>
  error: string | null
  loading: boolean
  searchValues: S
  onSearch: (values: S) => void
  onSearchValuesChange: (values: S) => void
  selectedRowKeys: React.Key[]
}

function normalizeSorter<T>(sorter: SorterResult<T> | SorterResult<T>[]) {
  const single = Array.isArray(sorter) ? sorter[0] : sorter
  const order = single?.order
  const field = single?.field
    ? Array.isArray(single.field)
      ? single.field.join(".")
      : String(single.field)
    : ""
  return { field, order: order ?? null } as {
    field: string
    order: "ascend" | "descend" | null
  }
}

export function useTable<
  T,
  S extends Record<string, string> = Record<string, string>,
>(options: UseTableOptions<T, S>): UseTableReturn<T, S> {
  const {
    columns,
    rowKey,
    fetcher,
    defaultPagination = {},
    defaultSort,
    searchFormSchema = [],
    toolbarActions = [],
    extraActions = [],
    contextMenuItems,
    emptyText,
    scroll,
    onRow,
    onBeforeFetch,
    onAfterFetch,
    manual = false,
  } = options

  const initialSearch = useMemo(() => {
    const values = {} as S
    searchFormSchema.forEach((f) => {
      ;(values as Record<string, string>)[f.key] = ""
    })
    return values
  }, [searchFormSchema])

  const [data, setData] = useState<T[]>([])
  const [rawData, setRawData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    ...defaultPagination,
  })
  const [sorter, setSorter] = useState<{
    field: string
    order: "ascend" | "descend" | null
  }>({
    field: defaultSort?.field ?? "",
    order: defaultSort?.order ?? null,
  })
  const [searchParams, setSearchParams] = useState<S>(initialSearch)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const instanceRef = useRef<TableInstance<T> | null>(null)
  const bindValuesRef = useRef<TableBindValues<T, S> | null>(null)

  const run = useCallback(
    async (overrides: Partial<TableQueryParams<S>> = {}) => {
      const query: TableQueryParams<S> = {
        pagination: overrides.pagination ?? pagination,
        sorter: overrides.sorter ?? sorter,
        search: overrides.search ?? searchParams,
      }

      setLoading(true)
      setError(null)
      instanceRef.current?.setTableProps({ loading: true })

      try {
        await onBeforeFetch?.()
        const result = await fetcher(query)

        let list: T[]
        let serverPaginated = false

        if (Array.isArray(result)) {
          list = result
        } else {
          list = result.list
          serverPaginated = true
        }

        if (!serverPaginated) {
          const { current, pageSize } = query.pagination
          const start = (current - 1) * pageSize
          list = list.slice(start, start + pageSize)
        }

        const raw = Array.isArray(result) ? result : result.list
        setRawData(raw)
        setData(list)
        instanceRef.current?.setTableProps({ dataSource: list })
        await onAfterFetch?.(list)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed"
        setError(message)
        setData([])
        setRawData([])
        instanceRef.current?.setTableProps({ dataSource: [] })
      } finally {
        setLoading(false)
        instanceRef.current?.setTableProps({ loading: false })
      }
    },
    [fetcher, onBeforeFetch, onAfterFetch, pagination, sorter, searchParams]
  )

  const reload = useCallback(() => run(), [run])

  const onSearchValuesChange = useCallback((values: S) => {
    setSearchParams(values)
    instanceRef.current?.setTableProps({ searchValues: values })
  }, [])

  const onSearch = useCallback(
    (values: S) => {
      const nextPagination = { ...pagination, current: 1 }
      setSearchParams(values)
      setPagination(nextPagination)
      run({ pagination: nextPagination, search: values })
    },
    [pagination, run]
  )

  const onTableChange = useCallback(
    (
      nextPagination: TablePaginationConfig,
      _filters: unknown,
      nextSorter: SorterResult<T> | SorterResult<T>[]
    ) => {
      const normalized = normalizeSorter(nextSorter)
      const mergedPagination = {
        current: nextPagination.current ?? pagination.current,
        pageSize: nextPagination.pageSize ?? pagination.pageSize,
      }
      setPagination(mergedPagination)
      setSorter(normalized)
      run({ pagination: mergedPagination, sorter: normalized })
    },
    [pagination, run]
  )

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (manual) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run()
  }, [manual])
  /* eslint-enable react-hooks/exhaustive-deps */

  const total = useMemo(() => {
    if (Array.isArray(rawData)) return rawData.length
    return data.length
  }, [rawData, data])

  const rowSelectionConfig: TableRowSelection<T> = useMemo(
    () => ({
      selectedRowKeys,
      onChange: (keys: React.Key[]) => {
        setSelectedRowKeys(keys)
        instanceRef.current?.setTableProps({
          rowSelection: { ...rowSelectionConfig, selectedRowKeys: keys },
        })
      },
    }),
    [selectedRowKeys]
  )

  const tablePagination: TablePaginationConfig = useMemo(
    () => ({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total,
      showSizeChanger: false,
      showTotal: (t, range) =>
        `Showing ${range[0]} to ${range[1]} of ${t} entries`,
    }),
    [pagination, total]
  )

  const bindValues: TableBindValues<T, S> = useMemo(
    () => ({
      columns,
      rowKey,
      dataSource: data,
      loading,
      pagination: tablePagination,
      onChange: onTableChange,
      searchFormSchema,
      searchValues: searchParams,
      onSearch,
      onSearchValuesChange,
      toolbarActions,
      extraActions,
      contextMenuItems,
      emptyText,
      scroll,
      rowSelection: rowSelectionConfig,
      onRow,
    }),
    [
      columns,
      rowKey,
      data,
      loading,
      tablePagination,
      onTableChange,
      searchFormSchema,
      searchParams,
      onSearch,
      onSearchValuesChange,
      toolbarActions,
      extraActions,
      contextMenuItems,
      emptyText,
      scroll,
      rowSelectionConfig,
      onRow,
    ]
  )

  useEffect(() => {
    bindValuesRef.current = bindValues
    instanceRef.current?.setTableProps(
      bindValues as unknown as TableBindValues<T>
    )
  }, [bindValues])

  const registerTable = useCallback((instance: TableInstance<T>) => {
    instanceRef.current = instance
    if (bindValuesRef.current) {
      instance.setTableProps(
        bindValuesRef.current as unknown as TableBindValues<T>
      )
    }
  }, [])

  const actions: TableActionType<T, S> = useMemo(
    () => ({
      reload,
      run,
      getDataSource: () => data,
      getRawDataSource: () => rawData,
      setTableData: (next) => {
        setData(next)
        setRawData(next)
        instanceRef.current?.setTableProps({ dataSource: next })
      },
      setPagination: (next) => {
        const merged = { ...pagination, ...next }
        setPagination(merged)
        instanceRef.current?.setTableProps({ pagination: merged })
      },
      getPagination: () => pagination,
      setLoading: (value) => {
        setLoading(value)
        instanceRef.current?.setTableProps({ loading: value })
      },
      setSearchParams: (params) => {
        const next = { ...searchParams, ...params } as S
        setSearchParams(next)
        instanceRef.current?.setTableProps({ searchValues: next })
      },
      getSearchParams: () => searchParams,
      clearSearchParams: () => {
        setSearchParams(initialSearch)
        onSearch(initialSearch)
      },
      setContextMenuItems: (items) => {
        instanceRef.current?.setTableProps({
          contextMenuItems: items,
        } as unknown as TableBindValues<T>)
      },
      setExtraActions: (actions) => {
        instanceRef.current?.setTableProps({
          extraActions: actions,
        } as unknown as TableBindValues<T>)
      },
      getSelectedRowKeys: () => selectedRowKeys,
      setSelectedRowKeys: (keys) => {
        setSelectedRowKeys(keys)
        instanceRef.current?.setTableProps({
          rowSelection: { ...rowSelectionConfig, selectedRowKeys: keys },
        })
      },
      clearSelection: () => {
        setSelectedRowKeys([])
        instanceRef.current?.setTableProps({
          rowSelection: { ...rowSelectionConfig, selectedRowKeys: [] },
        })
      },
    }),
    [
      data,
      rawData,
      pagination,
      searchParams,
      initialSearch,
      reload,
      run,
      onSearch,
      selectedRowKeys,
      rowSelectionConfig,
    ]
  )

  return {
    registerTable,
    actions,
    error,
    loading,
    searchValues: searchParams,
    onSearch,
    onSearchValuesChange,
    selectedRowKeys,
  }
}
