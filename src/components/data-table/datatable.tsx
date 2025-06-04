"use client"

import React, {useState} from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, List, Grid, PlusIcon ,Pen ,Trash} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(6)
  const [viewMode, setViewMode] = useState<"table" | "card">("table")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [nameFilter, setNameFilter] = useState("")

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({
          pageIndex,
          pageSize,
        })
        setPageIndex(newState.pageIndex)
        setPageSize(newState.pageSize)
      }
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
  })

  const filteredData = React.useMemo(() => {
    let filtered = data;
    if (statusFilter !== "all") {
      filtered = filtered.filter((item: any) => item.status === statusFilter);
    }
    if (nameFilter.trim() !== "") {
      filtered = filtered.filter((item: any) =>
        item.formName.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }
    return filtered;
  }, [data, statusFilter, nameFilter]);

  return (
    <div className="relative mx-auto max-w-7xl rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
      {/* Filter and Columns Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <input
            placeholder="Filter names..."
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
            className="w-full max-w-sm rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-indigo-400 dark:focus:ring-indigo-700"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-700"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={`rounded-r-none ${viewMode === "table" ? "bg-blue-500 text-white" : "text-gray-700 dark:text-gray-300"}`}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
              className={`rounded-l-none ${viewMode === "card" ? "bg-blue-500 text-white" : "text-gray-700 dark:text-gray-300"}`}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
          
          {(viewMode === "table" || viewMode === "card") && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-white transition-all hover:from-blue-700 hover:to-blue-800 hover:text-white dark:from-indigo-600 dark:to-purple-700 dark:hover:from-indigo-700 dark:hover:to-purple-800"
                  >
                    Columns <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-lg bg-white shadow-xl dark:bg-gray-800">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize text-gray-900 hover:bg-indigo-50 dark:text-gray-100 dark:hover:bg-gray-700"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/dashboard">
              
                <Button
                  variant="outline"
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-white transition-all hover:from-blue-700 hover:to-blue-800 hover:text-white dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800"
                >
                  Create Form <PlusIcon className="w-5 h-5"/>  

                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Card View */}
      {viewMode === "card" && (
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 p-6">
       {filteredData.slice(
         pageIndex * pageSize,
         (pageIndex + 1) * pageSize
       ).map((item: any, index) => (
         <div 
           key={index} 
           className={`rounded-xl overflow-hidden transition-all duration-300 ease-in-out group
             ${item.status === "active" 
               ? 'shadow-lg hover:shadow-xl hover:scale-[1.02] border border-transparent hover:border-indigo-400' 
               : 'shadow-inner bg-gray-100 text-gray-500 border border-gray-300'
             }
             flex flex-col h-full`}
         >
           {/* Header Section */}
           <div className='relative'>
             
             {/* Action Buttons (visible on hover) */}
             <div className="absolute top-2 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-1000">
               <button className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors duration-200">
               <Pen  className="w-5 h-5"/>
               </button>
               <button className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors duration-200">
                 <Trash className="w-5 h-5"/>
               </button>
             </div>
             
            
           </div>
     
           {/* Form Preview Section */}
           <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
             <form className="space-y-3">
               <div>
                 <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
                 <input 
                   className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white/50 backdrop-blur-sm" 
                   disabled 
                   placeholder="John Doe" 
                 />
               </div>
               <div>
                 <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Location <span className="text-red-500">*</span></label>
                 <input 
                   className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white/50 backdrop-blur-sm" 
                   disabled 
                   placeholder="Where are you?" 
                 />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <input 
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white/50 backdrop-blur-sm" 
                     disabled 
                     placeholder="City" 
                   />
                 </div>
                 <div>
                   <input 
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white/50 backdrop-blur-sm" 
                     disabled 
                     placeholder="State" 
                   />
                 </div>
               </div>
             </form>
           </div>
     
           {/* Card Info Section */}
           <div className="p-5 flex-grow flex flex-col justify-between">
             <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
               <span className="font-semibold text-gray-800 dark:text-gray-200">{item.formName}</span>
               {/* <h3 className="text-lg font-semibold text-center">{item.formName}</h3> */}

               <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                 item.status === "active" 
                   ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                   : 'bg-gray-300 text-gray-600'
               }`}>
                 {item.status.toUpperCase()}
               </span>
             </div>
             
             <div className="space-y-3 text-sm">
               <div className="flex justify-between items-center">
                 <span className="font-medium text-gray-600 dark:text-gray-400">Submissions:</span>
                 <span className="font-semibold text-gray-800 dark:text-gray-200">{item.submissionCount || 1}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="font-medium text-gray-600 dark:text-gray-400">Version:</span>
                 <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                 {item.activeVersion || "V.0.1"}
                 </span>
               </div>
             </div>
           </div>
     
           {/* Footer Section */}
           <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
             <button className="flex items-center space-x-1 font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200">
               <span>Preview</span>
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                 <path d="M5 12h14M12 5l7 7-7 7"/>
               </svg>
             </button>
           </div>
         </div>
       ))}
     </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <>
          <Table className="w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-b border-gray-200 transition-colors hover:bg-indigo-50 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-6 py-4 text-gray-900 dark:text-gray-100">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-gray-500 dark:text-gray-400"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </p>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => {
              table.setPageSize(Number(e.target.value))
            }}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            {['more', 10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 px-4 py-2 text-white transition-all hover:from-blue-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 dark:from-teal-500 dark:to-cyan-600 dark:hover:from-teal-600 dark:hover:to-cyan-700"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 px-4 py-2 text-white transition-all hover:from-blue-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 dark:from-pink-600 dark:to-rose-600 dark:hover:from-pink-700 dark:hover:to-rose-700"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}