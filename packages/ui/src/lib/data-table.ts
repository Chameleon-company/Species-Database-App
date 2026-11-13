import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  type CellData,
  type RowData,
  type TableFeatures,
} from "@tanstack/react-table"

declare module "@tanstack/react-table" {
  interface ColumnMeta<in out TFeatures extends TableFeatures, in out TData extends RowData, TValue extends CellData = CellData> {
    /** Classes for the column's header and body cells, e.g. a width. */
    className?: string
  }
}

/** Table features every `DataTable` registers: client-side sorting and pagination. */
export const dataTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, basic: sortFn_basic },
})

export type DataTableFeatures = typeof dataTableFeatures

export const dataTableColumnHelper = <TData extends RowData>() =>
  createColumnHelper<DataTableFeatures, TData>()
