import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Edit, Folder, Heart, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Columns = ({forms,handleEditForm , handleDeleteForm, handleCloneForm })=> [
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
        className="flex items-center mx-auto text-gray-700 hover:text-indigo-600 justify-center w-full"
        style={{ minWidth: 120, maxWidth: 200 }}
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        TITLE
      </button>
    ),
    cell: ({ row }) => {
      const value = row.getValue('formName') || 'form';
      const display = value.length > 10 ? value.slice(0, 15) + '...' : value;
      return (
        <div
          className="font-medium text-center truncate w-full mx-auto"
          style={{ minWidth: 120, maxWidth: 200 }}
          title={value.length > 10 ? value : undefined}
        >
          {display}
        </div>
      );
    },
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
      
    }
      return (
        
        <div className="flex items-center justify-center gap-2">
          <motion.button
            onClick={()=>handleStatusChange(row.original.id)}
            className={`relative w-12 h-7 rounded-full border transition-colors duration-200 focus:outline-none ${row.getValue('status') === 'Active' ? 'bg-green-400 border-green-500' : 'bg-gray-300 border-gray-400'}`}
            initial={row.getValue('status') === 'Active'}
            disabled = {row.getValue('activeVersion') === 'None'}
            animate={{ backgroundColor: row.getValue('status') === 'Active' ? '#00C853' : '#d1d5db', borderColor: row.getValue('status') === 'Active' ? '#22c55e' : '#9ca3af' }}
          >
            <motion.span
              className="absolute left-1 top-[3px] bg-white rounded-full shadow-md"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{ x: row.getValue('status') === 'Active' ? 19 : 0 , height : '20px' , width : '20px'}}
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
        className="flex items-center mx-auto  text-gray-700 hover:text-indigo-600"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        SUBMISSIONS
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
      const [dropUp, setDropUp] = React.useState(false);
      const ref = React.useRef();
      const btnRef = React.useRef();

      // Close popup on outside click or ESC
      React.useEffect(() => {
        function handleClickOutside(event) {
          if (ref.current && !ref.current.contains(event.target)) {
            setOpen(false);
          }
        }
        function handleEsc(event) {
          if (event.key === 'Escape') setOpen(false);
        }
        if (open) {
          document.addEventListener('mousedown', handleClickOutside);
          document.addEventListener('keydown', handleEsc);
        } else {
          document.removeEventListener('mousedown', handleClickOutside);
          document.removeEventListener('keydown', handleEsc);
        }
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
          document.removeEventListener('keydown', handleEsc);
        };
      }, [open]);

      // Dynamic dropdown direction
      React.useEffect(() => {
        if (open && btnRef.current && ref.current) {
          const btnRect = btnRef.current.getBoundingClientRect();
          const dropdownHeight = 280; // px, estimate
          const spaceBelow = window.innerHeight - btnRect.bottom;
          setDropUp(spaceBelow < dropdownHeight + 16); // 16px margin
        }
      }, [open]);

      const handleDelete = (formId) => {
        handleDeleteForm(formId);
      };
      return (
        <div className="relative text-center" ref={ref}>
          <button
            ref={btnRef}
            className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
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
                initial={{ opacity: 0, y: dropUp ? 10 : -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: dropUp ? 10 : -10, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className={`absolute right-0 z-[99999] w-40 rounded-md shadow-xl border border-gray-200 bg-white py-2 flex flex-col ${dropUp ? 'mb-2 bottom-full' : 'mt-2 top-full'}`}
                style={{ boxShadow: '0 8px 32px 0 rgba(60,60,60,0.12)' }}
              >
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 text-gray-800 font-medium transition-colors"
                  onClick={() => {
                    setOpen(false);
                    handleEditForm(forms.filter(val => val.Id === row.original.id )[0]);
                  }}
                >
                  <Edit className='w-4 h-4' />
                  Edit
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-50 text-red-600 font-medium transition-colors"
                  onClick={() => {
                    setOpen(false);
                    handleDelete(row.original.id);
                  }}
                >
                  <Trash className='w-4 h-4' />
                  Delete
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 text-gray-700 font-medium transition-colors"
                  onClick={() => {
                    setOpen(false);
                    // handle favorite logic here
                  }}
                >
                  <Heart className='w-4 h-4' />
                  Add to favorites
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 text-gray-700 font-medium transition-colors"
                  onClick={() => {
                    setOpen(false);
                    // handle folder logic here
                  }}
                >
                  <Folder className='w-4 h-4' />
                  Add to folder
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 text-gray-700 font-medium transition-colors"
                  onClick={() => {
                    setOpen(false);
                    // Find the full form object for the current row and pass it to clone handler
                    const formToClone = forms.find(f => f.Id === row.original.id);
                    handleCloneForm(formToClone);
                  }}
                >
                  {/* You can use an icon if you want, eg. a copy icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-6-4h6m2 1H6a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2z" />
                  </svg>
                  Clone
                </button>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    },
  },
];