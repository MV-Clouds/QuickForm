import React, { useRef, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const columns = ({forms,handleEditForm})=> [
  {
    header: 'INDEX',
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
        TITLE
        <ArrowUpDown className="ml-2 h-4 w-4" />
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
    cell: ({ row }) => {
      const status = row.getValue('status')
      const statusStyles = {
        active: 'bg-green-100 text-green-800',
        draft: 'bg-gray-100 text-gray-800',
        archived: 'bg-red-100 text-red-800',
      };
      return (
        <div className="text-center">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              statusStyles[status]
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
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
    cell: ({ row }) => {
      const [open, setOpen] = useState(false);
      const ref = useRef();

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
                  className="px-4 py-2 text-left text-sm hover:bg-indigo-50 text-indigo-700 font-medium transition-colors"
                  onClick={() => {
                    setOpen(false);
                    // console.log(row.original.id)
                    // console.log(forms.filter(val => val.Id == row.original.id ))
                    handleEditForm(forms.filter(val => val.Id == row.original.id )[0]);
                  }}
                >
                  Edit
                </button>
                <button
                  className="px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 font-medium transition-colors"
                  onClick={() => {
                    setOpen(false);
                    if (window.handleDeleteForm) window.handleDeleteForm(row.original);
                  }}
                >
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    },
  },
];