import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Edit, Folder, Heart, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Columns = ({forms,handleEditForm , handleDeleteForm})=> [
  {
    header: 'Index',
    cell: ({ row }) => <div className="text-center">{row.index + 1}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'formName',
    header: ({ column }) => (
      <button
        className="flex items-center mx-auto font-semibold text-gray-700 hover:text-indigo-600"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Title
        {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
      </button>
    ),
    cell: ({ row }) => (<div className="font-medium text-center">{row.getValue('formName') || 'form'}</div>),
  },
  {
    accessorKey: 'activeVersion',
    header: 'Active Version',
    cell: ({ row }) => (
      <div className="text-center">
        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          {row.getValue('activeVersion')}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row, table }) => {
    const handleStatusChange = (formId)=>{
      console.log('Status changing for  ' , formId);
      
    }
      return (
        
        <div className="flex items-center justify-center gap-2">
          <motion.button
            onClick={()=>handleStatusChange(row.original.id)}
            className={`relative w-12 h-7 rounded-full border transition-colors duration-200 focus:outline-none ${row.getValue('status') === 'Active' ? 'bg-green-400 border-green-500' : 'bg-gray-300 border-gray-400'}`}
            initial={row.getValue('status') === 'Active'}
            disabled = {row.getValue('activeVersion') === 'None'}
            animate={{ backgroundColor: row.getValue('status') === 'Active' ? '#4ade80' : '#d1d5db', borderColor: row.getValue('status') === 'Active' ? '#22c55e' : '#9ca3af' }}
          >
            <motion.span
              className="absolute left-0 top-0 w-6 h-6 bg-white rounded-full shadow-md"
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{ x: row.getValue('status') === 'Active' ? 22 : 0 }}
            />
          </motion.button>
        </div>
      );
    },
  },
  {
    accessorKey: 'submissionCount',
    header: ({ column }) => (
      <button
        className="flex items-center mx-auto font-semibold text-gray-700 hover:text-indigo-600"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Submissions
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </button>
    ),
    cell: ({ row }) => <div className="text-center font-medium text-gray-600">{row.getValue('submissionCount')}</div>,
  },
  {
    accessorKey: 'lastmodDate',
    header: 'Modified Date',
    cell: ({ row }) => {
      const lastmodData = row.getValue('lastmodDate')
      return (
        <div className="text-center">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold `}
          >
            {lastmodData}
          </span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: function ActionsCell({ row }) {
      const [open, setOpen] = React.useState(false);
      const ref = React.useRef();

      // Close popup on outside click
      React.useEffect(() => {
        function handleClickOutside(event) {
          if (ref.current && !ref.current.contains(event.target)) {
            setOpen(false);
          }
        }
        if (open) {
          document.addEventListener('mousedown', handleClickOutside);
        } else {
          document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, [open]);

      const handleDelete = (formId) =>{
        handleDeleteForm(formId);
      }
      return (
        <div className="relative text-center" ref={ref}>
          <button
            className="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 z-[99999] mt-2 w-32 rounded-lg bg-white shadow-xl border border-gray-200 py-2 flex flex-col"
              >
                <button
                  className="px-4 py-2 text-sm hover:bg-indigo-50 text-indigo-700 font-medium transition-colors"
                  onClick={() => {
                    setOpen(false);
                    // console.log(row.original.id)
                    // console.log(forms.filter(val => val.Id == row.original.id ))
                    handleEditForm(forms.filter(val => val.Id == row.original.id )[0]);
                  }}
                >
                  {/* <Edit className='w-2 h-2'/>  */}
                  Edit
                </button>
                <button
                  className="px-4 py-2  text-sm hover:bg-red-50 text-red-600 font-medium transition-colors"
                  onClick={() => {
                    setOpen(false);
                    handleDelete(row.original.id);
                  }}
                >
                  {/* <Trash  className='w-4 h-4'/>  */}
                  Delete
                </button>
                <button
                  className="px-4 py-2  text-sm  font-medium transition-colors"
                  onClick={() => {
                    setOpen(false);
                    // handleDelete(row.original.id);
                  }}
                >
                  {/* <Heart  className='w-2 h-2'/>  */}
                  Add to favorites
                </button>
                <button
                  className="px-4 py-2 text-sm hover:bg-gray-50 text-gray-600 font-medium transition-colors"
                  onClick={() => {
                    setOpen(false);
                    // handleDelete(row.original.id);
                  }}
                >
                 {/* <Folder  className='w-2 h-2'/> */}
                  Add to folder
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    },
  },
];