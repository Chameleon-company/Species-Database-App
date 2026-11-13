import type { ReactNode } from "react"
import { useTable, type ColumnDef, type RowData, type SortingState } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "#lib/utils"

import { Button } from "#components/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#components/select"
import { Skeleton } from "#components/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#components/table"
import { dataTableFeatures, type DataTableFeatures } from "#lib/data-table"

export type DataTableLabels = {
  rowsPerPage: string
  range: (from: number, to: number, total: number) => string
  previousPage: string
  nextPage: string
}

const DEFAULT_LABELS: DataTableLabels = {
  rowsPerPage: "Rows per page:",
  range: (from, to, total) => `${from}–${to} of ${total}`,
  previousPage: "Previous page",
  nextPage: "Next page",
}

type DataTableProps<TData extends RowData> = {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  getRowId?: (row: TData) => string
  loading?: boolean
  emptyLabel: ReactNode
  pageSizeOptions?: number[]
  initialPageSize?: number
  initialSorting?: SortingState
  labels?: Partial<DataTableLabels>
}

const SKELETON_ROWS = 5

/**
 * shadcn data table on TanStack Table v9 with client-side sorting and
 * pagination. Sortable column headers toggle ascending and descending.
 * Columns set widths through `meta.className`.
 */
function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  loading = false,
  emptyLabel,
  pageSizeOptions = [10, 20, 50],
  initialPageSize = pageSizeOptions[0],
  initialSorting = [],
  labels,
}: DataTableProps<TData>) {
  const text = { ...DEFAULT_LABELS, ...labels }
  const table = useTable(
    {
      features: dataTableFeatures,
      data,
      columns,
      getRowId: getRowId ? (row) => getRowId(row) : undefined,
      initialState: {
        sorting: initialSorting,
        pagination: { pageIndex: 0, pageSize: initialPageSize },
      },
    },
    (state) => state
  )

  const { pageIndex, pageSize } = table.state.pagination
  const total = data.length
  const from = total === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min(total, (pageIndex + 1) * pageSize)
  const rows = table.getRowModel().rows

  return (
    <div data-slot="data-table" className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <Table>
        <TableHeader className="bg-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-border hover:bg-muted">
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                const SortIcon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-12 px-3 text-label text-brand-text uppercase",
                      header.column.columnDef.meta?.className
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 uppercase hover:text-primary"
                      >
                        <table.FlexRender header={header} />
                        <SortIcon className={cn("size-3.5", !sorted && "opacity-40")} />
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <TableRow key={index} className="border-brand-line">
                {table.getAllLeafColumns().map((column) => (
                  <TableCell key={column.id} className="px-3 py-3">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length ? (
            rows.map((row) => (
              <TableRow key={row.id} className="border-brand-line hover:bg-background">
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn("px-3 py-3 text-compact", cell.column.columnDef.meta?.className)}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 border-t bg-muted px-4 py-2 text-compact">
        <div className="flex items-center gap-2">
          <span>{text.rowsPerPage}</span>
          <Select value={String(pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger size="sm" className="w-18 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="tabular-nums">{text.range(from, to, total)}</span>
          <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={text.previousPage}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={text.nextPage}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { DataTable }
