import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { List, Grid, Plus, PlusCircle, Filter, Search, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import 'antd/dist/reset.css'; // For Ant Design v5+
import { Select } from 'antd';
const { Option } = Select;

const DataTable = ({ forms, columns, data, handleCreateForm, handleEditForm, handleCloneForm }) => {
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
    data: filteredData,
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
    manualPagination: false,
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
    handleEditForm(forms.filter(val => val.Id == formId)[0]);

  };

  return (
    <div
      className="relative rounded-xl border w-[100%] border-gray-200 bg-white shadow-lg p-4 xl:w-[100%] lg:w-[100%]"
    // initial={{ opacity: 0, y: 0 }}
    // animate={{ opacity: 1, y: 0 }}
    // exit={{ opacity: 0, y: 0 }}
    // transition={{ duration: 0.4 }}
    >
      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <motion.div
            className="relative w-full max-w-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <input
              placeholder="Search forms..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 pl-10 text-black-400 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black-400 pointer-events-none">
              {/* <Search className="h-5 w-5" /> */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 16.5C14.0376 16.5 16.5 14.0376 16.5 11C16.5 7.96243 14.0376 5.5 11 5.5C7.96243 5.5 5.5 7.96243 5.5 11C5.5 14.0376 7.96243 16.5 11 16.5Z" stroke="#5F6165" stroke-width="1.5" />
                <path d="M15 15L19 19" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>

            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 w-40"
          >
            {/*  Filter icon
            <span className="text-sm font-medium text-gray-500">Filter</span> */}
            <Select
              value={statusFilter === 'all' ? 'Filter' : statusFilter}
              onChange={(value) => setStatusFilter(value)}
              className="w-20 h-9"
              size="middle"
              placeholder="Select status"
              prefix={<svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.07153 7H21.0715M7.7382 12H18.4049M10.9382 17H15.2049" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              }
              suffixIcon={null}
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
              className={`p-2 ${viewMode === 'table' ? 'text-white login-button' : 'text-gray-700'}   rounded-lg transition-colors`}
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              className={`p-2 ${viewMode === 'card' ? 'text-white login-button' : 'text-gray-700'}  rounded-lg transition-colors`}
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <button className="login-button flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:shadow-md"  onClick={() => handleCreateForm()}>
            <PlusCircle className="h-5 w-5" /> New Form
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
                  <div className="w-full sm:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 flex items-center justify-center" style={{ filter: 'brightness(0.75)' }}
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
            className="flex flex-col bg-white  overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Header Row */}
            <div className="flex bg-blue-50 rounded-lg border border-gray-200 px-4 py-3.5 mb-4">
              {table.getHeaderGroups().map((headerGroup) => (
                <div key={headerGroup.id} className="flex flex-1">
                  {headerGroup.headers.map((header) => (
                    <div
                      key={header.id}
                      className="flex-1 text-center  text-gray-700"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            typeof header.column.columnDef.header === 'string'
                              ? header.column.columnDef.header.toUpperCase()
                              : header.column.columnDef.header,
                            header.getContext()
                          )
                      }
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Body Rows */}
            <div className="flex flex-col space-y-4 pb-2">
              <AnimatePresence>
                {paginatedData.length ? (
                  table.getRowModel().rows.map((row, i) => (
                    <motion.div
                      key={row.id}
                      className="flex bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                    >
                      {row.getVisibleCells().map((cell, cellIndex) => (
                        <div
                          key={cell.id}
                          className={`flex-1 px-6 py-3 flex justify-center items-center text-sm ${cellIndex === 0 ? 'font-medium text-gray-900' : 'text-gray-700'}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ))}
                    </motion.div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-20 text-gray-500 rounded-lg border border-gray-200">
                    No results.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Pagination */}
      <div className="flex items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-sm text-gray-600 leading-none">
            Rows per page:
          </span>
          <Select
            value={pageSize}
            onChange={(value) => { setPageSize(Number(value)); setPageIndex(0); }}
            size="small"
            style={{ width: 75, height: 35, padding : 0,borderRadius: 8 }}
            suffixIcon ={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.7166 5.23204C11.858 5.08339 12.049 5 12.248 5C12.4471 5 12.6381 5.08339 12.7795 5.23204C12.8493 5.30503 12.9048 5.39204 12.9427 5.48799C12.9805 5.58395 13 5.68694 13 5.79097C13 5.895 12.9805 5.99799 12.9427 6.09395C12.9048 6.18991 12.8493 6.27691 12.7795 6.34991L8.53202 10.7683C8.39026 10.9168 8.19913 11 8 11C7.80087 11 7.60974 10.9168 7.46798 10.7683L3.22049 6.34991C3.15065 6.27691 3.0952 6.18991 3.05735 6.09395C3.01949 5.99799 3 5.895 3 5.79097C3 5.68694 3.01949 5.58395 3.05735 5.48799C3.0952 5.39204 3.15065 5.30503 3.22049 5.23204C3.36192 5.08339 3.55292 5 3.75197 5C3.95101 5 4.14201 5.08339 4.28345 5.23204L8.00163 8.8556L11.7166 5.23204Z" fill="#5F6165"/>
              </svg>
              }
          >
            {[6, 10, 20, 30, 40, 50].map((size) => (
              <Option key={size} value={size}>
                {size}
              </Option>
            ))}
          </Select>
        </div>
        {/* Custom Pagination UI */}
        <div className="flex items-center gap-2 select-none">
          {/* Left Arrow */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`rounded-lg border border-gray-200 bg-white p-2 shadow-sm ${pageIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
            onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
            disabled={pageIndex === 0}
            aria-label="Previous Page"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.11024 6.35993C4.0399 6.28967 4.00033 6.19435 4.00024 6.09493V5.90493C4.0014 5.80572 4.0408 5.71079 4.11024 5.63993L6.68024 3.07493C6.72719 3.0276 6.79108 3.00098 6.85774 3.00098C6.9244 3.00098 6.9883 3.0276 7.03524 3.07493L7.39024 3.42993C7.43728 3.47601 7.46378 3.53908 7.46378 3.60493C7.46378 3.67077 7.43728 3.73384 7.39024 3.77993L5.16524 5.99993L7.39024 8.21993C7.43757 8.26687 7.46419 8.33077 7.46419 8.39743C7.46419 8.46409 7.43757 8.52798 7.39024 8.57493L7.03524 8.92493C6.9883 8.97225 6.9244 8.99888 6.85774 8.99888C6.79108 8.99888 6.72719 8.97225 6.68024 8.92493L4.11024 6.35993Z" fill="#5F6165" />
            </svg>
          </motion.button>
          {/* Pagination Numbers */}
          {(() => {
            const totalPages = Math.ceil(filteredData.length / pageSize);
            if (totalPages <= 1) return null;
            const pageNumbers = [];
            const maxVisible = 3; // always show 3 pages in the middle
            let start = Math.max(1, pageIndex + 1 - 1);
            let end = Math.min(totalPages, start + maxVisible - 1);
            if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
            // Always show first and last
            if (start > 2) {
              pageNumbers.push(
                <motion.button key={1} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                  className={`mx-1 rounded-lg px-3 py-1 font-medium ${pageIndex + 1 === 1 ? 'bg-[#028AB0] text-white' : 'hover:bg-blue-50'}`}
                  style={pageIndex + 1 === 1 ? { background: '#EDF8FF', color: '#028AB0' } : { color: '#5F6165' }}
                  onClick={() => setPageIndex(0)}
                >1</motion.button>
              );
              pageNumbers.push(<span key="start-ellipsis" className="mx-1 text-gray-400">...</span>);
            } else {
              for (let i = 1; i < start; i++) {
                pageNumbers.push(
                  <motion.button key={i} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                    className={`mx-1 rounded-lg px-3 py-1 font-medium ${pageIndex + 1 === i ? 'bg-[#028AB0] text-white' : 'hover:bg-[#EDF8FF]'}`}
                    style={pageIndex + 1 === i ? { background: '#EDF8FF', color: '#028AB0' } : { color: '#5F6165' }}
                    onClick={() => setPageIndex(i - 1)}
                  >{i}</motion.button>
                );
              }
            }
            for (let i = start; i <= end; i++) {
              pageNumbers.push(
                <motion.button key={i} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                  className={`mx-1 rounded-lg px-3 py-1 font-medium ${pageIndex + 1 === i ? 'bg-[#028AB0] text-white' : 'text-gray-700 hover:bg-[#EDF8FF]'}`}
                  style={pageIndex + 1 === i ? { background: '#EDF8FF', color: '#028AB0' } : { color: '#5F6165' }}
                  onClick={() => setPageIndex(i - 1)}
                >{i}</motion.button>
              );
            }
            if (end < totalPages - 1) {
              pageNumbers.push(<span key="end-ellipsis" className="mx-1 text-gray-400">...</span>);
              pageNumbers.push(
                <motion.button key={totalPages} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                  className={`mx-1 rounded-lg px-3 py-1 font-medium ${pageIndex + 1 === totalPages ? 'bg-[#028AB0] text-white' : 'hover:bg-[#EDF8FF]'}`}
                  style={pageIndex + 1 === totalPages ? { background: '#EDF8FF', color: '#028AB0' } : { color: '#5F6165' }}
                  onClick={() => setPageIndex(totalPages - 1)}
                >{totalPages}</motion.button>
              );
            } else {
              for (let i = end + 1; i <= totalPages; i++) {
                pageNumbers.push(
                  <motion.button key={i} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                    className={`mx-1 rounded-lg px-3 py-1 font-medium ${pageIndex + 1 === i ? 'bg-[#028AB0] text-white' : 'hover:bg-[#EDF8FF]'}`}
                    style={pageIndex + 1 === i ? { background: '#028AB0', color: '#028AB0' } : { color: '#5F6165' }}
                    onClick={() => setPageIndex(i - 1)}
                  >{i}</motion.button>
                );
              }
            }
            return pageNumbers;
          })()}
          {/* Right Arrow */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`rounded-lg border border-gray-200 bg-white p-2 shadow-sm ${pageIndex + 1 >= Math.ceil(filteredData.length / pageSize) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
            onClick={() => setPageIndex((prev) => (prev + 1 < Math.ceil(filteredData.length / pageSize) ? prev + 1 : prev))}
            disabled={pageIndex + 1 >= Math.ceil(filteredData.length / pageSize)}
            aria-label="Next Page"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.88976 6.35993C7.9601 6.28967 7.99967 6.19435 7.99976 6.09493V5.90493C7.9986 5.80572 7.9592 5.71079 7.88976 5.63993L5.31976 3.07493C5.27281 3.0276 5.20892 3.00098 5.14226 3.00098C5.0756 3.00098 5.0117 3.0276 4.96476 3.07493L4.60976 3.42993C4.56272 3.47601 4.53622 3.53908 4.53622 3.60493C4.53622 3.67077 4.56272 3.73384 4.60976 3.77993L6.83476 5.99993L4.60976 8.21993C4.56243 8.26687 4.53581 8.33077 4.53581 8.39743C4.53581 8.46409 4.56243 8.52798 4.60976 8.57493L4.96476 8.92493C5.0117 8.97225 5.0756 8.99888 5.14226 8.99888C5.20892 8.99888 5.27281 8.97225 5.31976 8.92493L7.88976 6.35993Z" fill="#5F6165" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;