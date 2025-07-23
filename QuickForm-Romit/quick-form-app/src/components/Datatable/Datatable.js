import React, { useState, useMemo, useEffect } from 'react';
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
import 'antd/dist/reset.css'; // For Ant Design v5+
import { Select } from 'antd';
const {Option} = Select;

const DataTable = ({ forms, columns, data, handleCreateForm, handleEditForm }) => {
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
  // Date formatting helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Status toggle handler
  const toggleStatus = (formId) => {
    // Implement your status toggle logic here
    console.log(`Toggling status for form ${formId}`);
  };

  // View form handler
  const handleViewForm = (formId) => {
    // Implement your view form logic here
    console.log(`Viewing form ${formId}`);
    handleEditForm(forms.filter(val => val.Id == formId)[0]);

  };

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
            placeholder="Search forms..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all shadow-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              className="w-28 h-9  font-bold"
              size="middle"
              placeholder="Select status"
            >
              <Option value="all">All Status</Option>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </motion.div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border border-gray-300 p-1 bg-gray-50 shadow-sm">
            <button
              className={`p-2 ${viewMode === 'table' ? 'text-white' : 'text-gray-700'}  rounded-lg transition-colors`}
              onClick={() => setViewMode('table')}
              style={{ background: `${viewMode === 'table' ? 'linear-gradient(to right, #0B295E, #1D6D9E)' : ''}` }}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              className={`p-2 ${viewMode === 'card' ? 'text-white' : 'text-gray-700'}  rounded-lg transition-colors`}
              onClick={() => setViewMode('card')}
              style={{ background: `${viewMode === 'card' ? 'linear-gradient(to right, #0B295E, #1D6D9E)' : ''}` }}
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
          <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:shadow-md" style={{ background: 'linear-gradient(to right, #0B295E, #1D6D9E)' }} onClick={() => handleCreateForm()}>
            Create Form <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
      {/* Card View */}
      <AnimatePresence mode="wait">
        {viewMode === 'card' && (
          <motion.div
            key="card-view"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {paginatedData.map((item, index) => (
              <motion.div
                key={item.id || index}
                className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-white border border-gray-100 h-full"
                whileHover={{ y: -5 }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                layout
              >
                <div className="flex flex-col sm:flex-row h-full">
                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {item.status === 'Active' ? 'Active' : 'Draft'}
                  </div>

                  {/* Form Preview Section - Left Side */}
                  <div className="w-full sm:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 flex items-center justify-center" style={{ filter: 'brightness(0.7)' }}
                  >
                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm w-full transform group-hover:scale-[1.02] transition-transform duration-300">
                      <div className="text-center font-bold text-lg mb-3 text-gray-800 truncate">
                        {item.formName || 'Form Title'}
                      </div>
                      {/* Dynamic, scrollable, interactive form preview */}
                      <div
                        className="space-y-3 overflow-y-auto"
                        style={{ maxHeight: '220px', minHeight: '120px', scrollbarWidth: 'none', paddingRight: 4 }}
                      >
                        <AnimatePresence>
                          {Array.isArray(item.fields) && item.fields.length > 0 ? (
                            item.fields
                              .sort((a, b) => (a.Order_Number__c || 0) - (b.Order_Number__c || 0))
                              .map((field, idx) => (
                                <motion.div
                                  key={field.Id || idx}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                                  whileHover={{ scale: 1.03, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
                                  className="flex flex-col gap-1 bg-gray-50 rounded-md px-3 py-2 border border-gray-100 hover:border-indigo-300 transition-all"
                                >
                                  <label className="text-xs font-semibold text-gray-700 truncate" title={field.Name}>{field.Name}</label>
                                  {(() => {
                                    switch ((field.Field_Type__c || '').toLowerCase()) {
                                      case 'text':
                                      case 'shorttext':
                                        return <input type="text" className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" placeholder={'Enter ' + field.Name} disabled />;
                                      case 'number':
                                        return <input type="number" className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" placeholder={'Enter ' + field.Name} disabled />;
                                      case 'textarea':
                                        return <textarea className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none resize-none" rows={2} placeholder={'Enter ' + field.Name} disabled />;
                                      case 'date':
                                        return <input type="date" className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" disabled />;
                                      case 'datetime':
                                        return <input type="datetime-local" className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" disabled />;
                                      case 'checkbox':
                                        return <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" disabled />;
                                      case 'dropdown':
                                        return (
                                          <select className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" disabled>
                                            <option>{field.Name}</option>
                                          </select>
                                        );
                                      default:
                                        return <input type="text" className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white focus:border-indigo-400 focus:outline-none" placeholder={field.Name} disabled />;
                                    }
                                  })()}

                                </motion.div>
                              ))


                          ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-400 text-sm text-center py-6">
                              No fields to preview.
                            </motion.div>
                          )}
                          <div className='text-center'>
                            <motion.button whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              style={{ background: 'linear-gradient(to right, #0B295E, #1D6D9E)' }}
                              className="mt-2 px-4 py-1 bg-blue-500 text-white font-bold rounded hover:bg-blue-700 transition duration-300"
                            >
                              Submit
                            </motion.button>
                          </div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Details Section - Right Side */}
                  <div className="w-full sm:w-1/2 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg truncate">{item.formName}</h3>
                          <p className="text-md text-black-500 mt-6 font-bold">Version : {item.activeVersion || 'V1'}</p>
                        </div>

                        {/* Toggle Switch */}
                        <motion.label
                          className="flex items-center cursor-pointer mt-12"
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={item.status === 'Active'}
                              onChange={() => toggleStatus(item.id)}
                            />
                            <div className={`block text-white w-20 h-6 rounded-full ${item.status === 'Active' ? 'bg-green-500 px-3 py-0.5' : 'px-6 py-0.5 bg-gray-300'}`}>{item.status === 'Active' ? 'Active' : 'Inactive'}</div>
                            <motion.div
                              className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-md`}
                              animate={{
                                x: item.status === 'Active' ? 55 : 0
                              }}
                              transition={{ type: "spring", stiffness: 700, damping: 30 }}
                            ></motion.div>
                          </div>
                        </motion.label>
                      </div>

                      <div className="text-md text-gray-600 mt-10">
                        <div className='flex gap-5'>
                          <p className=" text-gray-500">Last Modified</p>
                          <p>{formatDate(item.lastmodDate) || 'N/A'}</p>
                        </div>
                        <div className="mt-2 flex">
                          <p className=" text-gray-500">Submissions</p>
                          <p>{item.submissionCount || 0}</p>
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-2 rounded-lg font-medium shadow-md  mt-4"
                      style={{ border: '1px solid #0B295E' }}
                      onClick={() => handleViewForm(item.id)}
                    >
                      View Form
                    </motion.button>
                  </div>
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
          <Select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }}
            className="rounded-md bg-white w-42 text-sm text-gray-700 shadow-sm"
          >
            {[10, 20, 30, 40, 50].map((size) => (
              <Option key={size} value={size}>
                Show {size}
              </Option>
            ))}
          </Select>
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