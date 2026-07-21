import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Table } from "antd"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { SearchForm } from "@/components/SearchForm"
import type {
  ContextMenuItemConfig,
  DataTableProps,
} from "@/components/DataTable"
import type { TableInstance, TableBindValues } from "@/hooks/useTable"

interface DataTableContextValue<T> {
  getRecord: (rowKey: string) => T | undefined
  contextMenuItems?: (record: T) => ContextMenuItemConfig<T>[]
}

const DataTableContext = createContext<DataTableContextValue<unknown>>({
  getRecord: () => undefined,
})

function DataTableRow(
  props: React.HTMLAttributes<HTMLTableRowElement> & { "data-row-key": string },
  ref: React.Ref<HTMLTableRowElement>
) {
  const { getRecord, contextMenuItems } = useContext(DataTableContext)
  const record = getRecord(String(props["data-row-key"]))
  const items = record && contextMenuItems ? contextMenuItems(record) : []

  if (!items?.length) {
    return <tr ref={ref} {...props} />
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <tr ref={ref} {...props} />
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52 rounded-xl border border-white/50 bg-white/80 p-1.5 shadow-[0_12px_32px_rgba(16,24,40,0.12)] backdrop-blur-xl">
        {items.map((item) =>
          item.separator ? (
            <ContextMenuSeparator
              key={item.key}
              className="-mx-1 my-1 h-px bg-white/60"
            />
          ) : (
            <ContextMenuItem
              key={item.key}
              disabled={item.disabled}
              onClick={() => item.onClick?.(record as never)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-900 hover:bg-blue-500/10"
            >
              {item.icon}
              {item.label}
            </ContextMenuItem>
          )
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

const ForwardedDataTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { "data-row-key": string }
>(DataTableRow)

const defaultBindValues: TableBindValues<never> = {
  columns: [],
  rowKey: "id",
  dataSource: [],
  loading: false,
  pagination: false,
  onChange: () => {},
  searchFormSchema: [],
  searchValues: {},
  onSearch: () => {},
  onSearchValuesChange: () => {},
  toolbarActions: [],
  extraActions: [],
  scroll: undefined,
  rowSelection: undefined,
  onRow: undefined,
}

/**
 * DataTable 变体：搜索表单与表格主体分离为两张独立的玻璃卡片。
 * 结构与 DataTable 一致，仅布局不同。
 */
export function DataTableSplit<T extends object>({
  register,
  className = "",
  title,
  titleExtra,
  toolbar,
  slots,
}: DataTableProps<T>) {
  const [bindValues, setBindValues] = useState<TableBindValues<T>>(
    defaultBindValues as unknown as TableBindValues<T>
  )
  const tableWrapperRef = useRef<HTMLDivElement>(null)
  const [bodyScrollY, setBodyScrollY] = useState<number | string>(
    bindValues.scroll?.y ?? "100%"
  )

  useEffect(() => {
    if (!register) return
    const instance: TableInstance<T> = {
      setTableProps: (props) =>
        setBindValues((prev) => ({ ...prev, ...props }) as TableBindValues<T>),
    }
    register(instance)
  }, [register])

  useEffect(() => {
    const wrapper = tableWrapperRef.current
    if (!wrapper) return

    let rafId: number
    const update = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const wrapperRect = wrapper.getBoundingClientRect()
        const header = wrapper.querySelector(
          ".ant-table-header"
        ) as HTMLElement | null
        const pagination = wrapper.querySelector(
          ".ant-table-pagination"
        ) as HTMLElement | null
        const headerH = header?.getBoundingClientRect().height ?? 0
        const paginationH = pagination?.getBoundingClientRect().height ?? 0
        const nextY = Math.max(0, wrapperRect.height - headerH - paginationH)

        setBodyScrollY((prev) => {
          const prevNum = typeof prev === "number" ? prev : 0
          if (Math.abs(prevNum - nextY) > 2) return nextY
          return prev
        })
      })
    }

    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(wrapper)

    const mutationObserver = new MutationObserver(() => {
      const header = wrapper.querySelector(
        ".ant-table-header"
      ) as HTMLElement | null
      const pagination = wrapper.querySelector(
        ".ant-table-pagination"
      ) as HTMLElement | null
      if (header) resizeObserver.observe(header)
      if (pagination) resizeObserver.observe(pagination)
      update()
    })
    mutationObserver.observe(wrapper, { childList: true, subtree: true })

    update()

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      cancelAnimationFrame(rafId)
    }
  }, [])

  const { dataSource, rowKey } = bindValues
  const recordMap = useMemo(() => {
    const map = new Map<string, T>()
    dataSource.forEach((record) => {
      const key =
        typeof rowKey === "function"
          ? rowKey(record)
          : (record as Record<string, unknown>)[rowKey as string]
      map.set(String(key), record)
    })
    return map
  }, [dataSource, rowKey])

  const contextValue: DataTableContextValue<T> = useMemo(
    () => ({
      getRecord: (key) => recordMap.get(key),
      contextMenuItems: bindValues.contextMenuItems as (
        record: unknown
      ) => ContextMenuItemConfig<unknown>[],
    }),
    [recordMap, bindValues.contextMenuItems]
  )

  const hasToolbarActions = bindValues.toolbarActions.length > 0
  const hasExtra = bindValues.extraActions && bindValues.extraActions.length > 0
  const hasSearchForm = bindValues.searchFormSchema.length > 0
  const hasLeftContent = hasToolbarActions || Boolean(slots?.leftToolBar)
  const hasRightContent =
    hasExtra || Boolean(toolbar) || Boolean(slots?.rightToolBar)
  const showHeader =
    hasLeftContent || hasRightContent || Boolean(title) || Boolean(titleExtra)

  const leftToolbar = (
    <div className="flex flex-wrap items-center gap-2">{slots?.leftToolBar}</div>
  )

  const rightToolbar = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {slots?.rightToolBar}
    </div>
  )

  const headerContent = (
    <div className="flex flex-nowrap items-center justify-between gap-3">
      {(title || titleExtra) && (
        <div className="flex items-center gap-3">
          {title && (
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          )}
          {titleExtra}
        </div>
      )}
      {hasLeftContent && leftToolbar}
      {hasRightContent && rightToolbar}
    </div>
  )

  return (
    <DataTableContext.Provider
      value={contextValue as DataTableContextValue<unknown>}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {/* 搜索卡片：独立的玻璃容器 */}
        {hasSearchForm && (
          <div className="glass shrink-0 rounded-2xl px-4 py-3">
            <SearchForm
              inline
              searchFormSchema={bindValues.searchFormSchema}
              values={bindValues.searchValues}
              onChange={bindValues.onSearchValuesChange}
              onSearch={bindValues.onSearch}
            />
          </div>
        )}

        {/* 表格主体卡片 */}
        <div
          className={`glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl ${className}`}
        >
          {showHeader && (
            <div className="flex flex-col gap-2 border-b border-white/40 px-4 py-3">
              {headerContent}
            </div>
          )}

          <div
            ref={tableWrapperRef}
            className="data-table min-h-0 flex-1 overflow-hidden px-4"
          >
            <Table<T>
              columns={bindValues.columns}
              dataSource={bindValues.dataSource}
              rowKey={bindValues.rowKey}
              loading={bindValues.loading}
              pagination={bindValues.pagination}
              onChange={bindValues.onChange}
              scroll={{
                x: bindValues.scroll?.x,
                y: bindValues.scroll?.y ?? bodyScrollY,
              }}
              rowSelection={bindValues.rowSelection}
              onRow={bindValues.onRow}
              locale={{ emptyText: bindValues.emptyText ?? "暂无数据" }}
              components={{
                body: {
                  row: ForwardedDataTableRow as unknown as React.ComponentType<
                    React.HTMLAttributes<HTMLTableRowElement>
                  >,
                },
              }}
            />
          </div>
        </div>
      </div>
    </DataTableContext.Provider>
  )
}
