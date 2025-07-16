import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { List, Grid, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DataTable = ({ columns, data,handleCreateForm,handleEditForm }) => {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(6);
  const [viewMode, setViewMode] = useState('table');
  const [statusFilter, setStatusFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('');

  // Apply filtering and pagination to both views
  const filteredData = useMemo(() => {
    let filtered = data;
    if (statusFilter !== 'all') filtered = filtered.filter((item) => item.status === statusFilter);
    if (nameFilter.trim() !== '') filtered = filtered.filter((item) => (item.formName || '').toLowerCase().includes(nameFilter.toLowerCase()));
    return filtered;
  }, [data, statusFilter, nameFilter]);

  // Paginated data for both views
  const paginatedData = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pageIndex, pageSize]);

  // Update pageIndex if filteredData shrinks
  React.useEffect(() => {
    if (pageIndex > 0 && pageIndex * pageSize >= filteredData.length) {
      setPageIndex(0);
    }
  }, [filteredData, pageIndex, pageSize]);

  // Table instance should use filteredData
  const table = useReactTable({
    data: paginatedData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex, pageSize },
    },
    manualPagination: true,
    pageCount: Math.ceil(filteredData.length / pageSize),
  });

  return (
    <motion.div
      className="relative mx-auto max-w-7xl rounded-xl border border-gray-200 bg-white shadow-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
    >
      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <input
            placeholder="Filter names..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all shadow-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all shadow-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border border-gray-300 bg-gray-50 shadow-sm">
            <button 
              className={`p-2 ${viewMode === 'table' ? 'bg-blue-500 text-white' : 'text-gray-700'} rounded-l-lg transition-colors`}
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              className={`p-2 ${viewMode === 'card' ? 'text-white' : 'text-gray-700'} rounded-r-lg transition-colors`}
              onClick={() => setViewMode('card')}
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
          <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:shadow-md" style={{ background: 'linear-gradient(to right, #0B295E, #1D6D9E)' }} onClick={()=>handleCreateForm()}>
            Create Form <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Card View */}
      <AnimatePresence mode="wait">
        {viewMode === 'card' && (
          <motion.div
            key="card-view"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
          >
            {paginatedData.map((item, index) => (
              <motion.div
                key={item.id || index}
                className={`rounded-xl overflow-hidden transition-all duration-300 ease-in-out group ${
                  item.status === 'active'
                    ? 'shadow-lg hover:shadow-xl hover:scale-[1.02] border border-transparent hover:border-indigo-400'
                    : 'shadow-inner bg-gray-100 text-gray-500 border border-gray-300'
                } flex flex-col h-full`}
                whileHover={{ scale: 1.03 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100">
                  <form className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white/50"
                        disabled
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Location <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white/50"
                        disabled
                        placeholder="Where are you?"
                      />
                    </div>
                  </form>
                </div>
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                    <span className="font-semibold text-gray-800">{item.formName}</span>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {item.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Submissions:</span>
                      <span className="font-semibold text-gray-800">{item.submissionCount || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Version:</span>
                      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        {item.activeVersion || 'V.0.1'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-2">
                  <button className="flex items-center text-indigo-600 hover:text-indigo-800">
                    Preview
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" d="M5 12h14"></path>
                    </svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Table View */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' && (
          <motion.div
            key="table-view"
            className=""
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
          >
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                <AnimatePresence>
                  {paginatedData.length ? (
                    table.getRowModel().rows.map((row, i) => (
                      <motion.tr
                        key={row.id}
                        className="border-b border-gray-200 hover:bg-indigo-50 transition-all"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-6 py-4 text-gray-700">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="h-20 text-center text-gray-500">
                        No results.
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600">
            Page {pageIndex + 1} of {Math.max(1, Math.ceil(filteredData.length / pageSize))}
          </p>
          <motion.select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 shadow-sm"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {[10, 20, 30, 40, 50].map((size) => (
              <motion.option key={size} value={size} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Show {size}
              </motion.option>
            ))}
          </motion.select>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 px-4 py-2 text-white hover:from-blue-600 hover:to-blue-600 transition-all disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-md"
            onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
            disabled={pageIndex === 0}
          >
            Previous
          </button>
          <button
            className="rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 px-4 py-2 text-white hover:from-blue-600 hover:to-blue-600 transition-all disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-md"
            onClick={() => setPageIndex((prev) => (prev + 1 < Math.ceil(filteredData.length / pageSize) ? prev + 1 : prev))}
            disabled={pageIndex + 1 >= Math.ceil(filteredData.length / pageSize)}
          >
            Next
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DataTable;