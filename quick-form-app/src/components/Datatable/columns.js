import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Edit, Folder, Heart, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Loader from '../Loader'
const StatusCell = ({ row }) => {
   // compute a stable normalized status value from the row
   const rawStatus = row.getValue?.('status') ?? row.original?.status ?? 'Inactive';
   const normalizedStatus = typeof rawStatus === 'string' ? rawStatus.trim() : rawStatus;
  const [localStatus, setLocalStatus] = useState(normalizedStatus);
  const [loading, setLoading] = useState(false);
  const fetchAccessToken = async (userId, instanceUrl) => {
    try {
      const response = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, instanceUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch access token");
      return data.access_token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      return null;
    }
  };
  useEffect(() => {
    if (!loading) {
      setLocalStatus(normalizedStatus);
    }
  }, [normalizedStatus, loading]);
  const handleStatusChange = async (formId) => {
    if (loading) return;
    const prevStatus = localStatus;
    const newStatus = localStatus === "Active" ? "Inactive" : "Active";
    setLocalStatus(newStatus); // optimistic
    setLoading(true);
    try {
      const userId = sessionStorage.getItem("userId");
      const instanceUrl = sessionStorage.getItem("instanceUrl");
      const token = await fetchAccessToken(userId, instanceUrl);

      const response = await fetch(process.env.REACT_APP_STATUS_CHANGE ,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, instanceUrl, token, status: newStatus, formId }),
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Update failed");
    } catch (error) {
      console.error("Error updating status:", error);
      setLocalStatus(prevStatus); // rollback
    } finally {
      setLoading(false);
    }
  };
  if(loading){
    return(
      <div>
        <Loader text={`${localStatus === "Inactive" ? "Inactivating form" : "Activating Form"}`} />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center gap-2 ">
      <motion.button
        onClick={() => handleStatusChange(row.original.id)}
        className={`relative w-12 h-7 rounded-full border transition-colors duration-200 focus:outline-none ${
          localStatus === "Active"
            ? "bg-green-400 border-green-500"
            : "bg-gray-300 border-gray-400"
        }`}
        disabled={row.getValue("activeVersion") === "None" || loading}
        animate={{
          backgroundColor: localStatus === "Active" ? "#00C853" : "#D1D5DB",
          borderColor: localStatus === "Active" ? "#22C55E" : "#9CA3AF",
        }}
      >
       {loading ? (
        <motion.div
          className="absolute left-1/2 top-1/2 w-4 h-4 border-2 border-white border-t-transparent rounded-full"
          style={{ x: "-50%", y: "-50%" }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      ) : (
        <motion.span
          className="absolute left-1 top-[3px] bg-white rounded-full shadow-md"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            x: localStatus === "Active" ? 19 : 0,
            height: "20px",
            width: "20px",
          }}
        />
      )}
      </motion.button>
    </div>
  );
};


export const Columns = ({ forms, handleEditForm, handleDeleteForm , handleFavoriteForm, handleCloneForm }) => [
  {
    header: 'Sr. No.',
    cell: ({ row , table }) => {
      const pageIndex = table.getState().pagination.pageIndex;
    const pageSize = table.getState().pagination.pageSize;

    // Use the actual rowModel length instead of manual slice
    const rowIndex = table.getRowModel().rows.findIndex(r => r.id === row.id);

    const srNo = pageIndex * pageSize + (rowIndex + 1);
    return <div className="text-center">{srNo}</div>;
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'formName',
    enableSorting: true,
    sortingFn: 'alphanumeric',
    header: ({ column }) => (
      <button
        className="flex items-center mx-auto text-gray-700 hover:text-indigo-600 justify-center w-full"
        style={{ minWidth: 120, maxWidth: 200 }}
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        TITLE
        <ArrowUpDown className="ml-2 h-4 w-4" />
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
    cell: ({ row, table }) => (<StatusCell row={row}/>)
  },
  {
    accessorKey: 'submissionCount',
    enableSorting: true,
    // Ensure numeric sort even if values come as strings/null
    sortingFn: (rowA, rowB, columnId) => {
      const a = Number(rowA.getValue(columnId) ?? 0);
      const b = Number(rowB.getValue(columnId) ?? 0);
      return a === b ? 0 : a > b ? 1 : -1;
    },
    header: ({ column }) => {
      return(<button
        className="flex items-center mx-auto  text-gray-700 hover:text-indigo-600"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        SUBMISSIONS
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </button>)
    },
    cell: ({ row }) => <div className="text-center font-medium text-gray-600">{row.getValue('submissionCount')}</div>,
  },
  {
    accessorKey: 'lastmodDate',
    enableSorting: true,
    sortingFn: (rowA, rowB, columnId) => {
      const a = new Date(rowA.getValue(columnId));
      const b = new Date(rowB.getValue(columnId));
      return a - b;
    },
    header: ({ column }) => (
      <button
        className="flex items-center mx-auto text-gray-700 hover:text-indigo-600"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        MODIFIED DATE
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </button>
    ),
    cell: ({ row }) => {
      const lastmodData = row.getValue('lastmodDate');
      return (
        <div className="text-center">
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {lastmodData || 'N/A'}
          </span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: function ActionsCell({ row }) {
      const [open, setOpen] = useState(false);
      const [dropUp, setDropUp] = useState(false);
      const ref = useRef();
      const btnRef = useRef();
      const [dropdownPos , setDropdownPos] = useState({ top: 0, left: 0 });
      // Close popup on outside click or ESC
      useEffect(() => {
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
      useEffect(() => {
        if (open && btnRef.current && ref.current) {
          const btnRect = btnRef.current.getBoundingClientRect();
          const dropdownHeight = 160; // px, estimate
          setDropdownPos({
            left: btnRect.left - 160,
            top: window.innerHeight - btnRect.bottom < dropdownHeight + 16 ? btnRect.top - dropdownHeight - 8 : btnRect.bottom + 8,
          });
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
            onClick={() => setOpen((v) => !v)}>
            <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="24.5" width="24" height="24" rx="4" transform="rotate(90 24.5 0)" fill="white" />
              <path d="M8 12C8 12.3978 7.84196 12.7794 7.56066 13.0607C7.27936 13.342 6.89782 13.5 6.5 13.5C6.10218 13.5 5.72064 13.342 5.43934 13.0607C5.15804 12.7794 5 12.3978 5 12C5 11.6022 5.15804 11.2206 5.43934 10.9393C5.72064 10.658 6.10218 10.5 6.5 10.5C6.89782 10.5 7.27936 10.658 7.56066 10.9393C7.84196 11.2206 8 11.6022 8 12ZM14 12C14 12.3978 13.842 12.7794 13.5607 13.0607C13.2794 13.342 12.8978 13.5 12.5 13.5C12.1022 13.5 11.7206 13.342 11.4393 13.0607C11.158 12.7794 11 12.3978 11 12C11 11.6022 11.158 11.2206 11.4393 10.9393C11.7206 10.658 12.1022 10.5 12.5 10.5C12.8978 10.5 13.2794 10.658 13.5607 10.9393C13.842 11.2206 14 11.6022 14 12ZM20 12C20 12.3978 19.842 12.7794 19.5607 13.0607C19.2794 13.342 18.8978 13.5 18.5 13.5C18.1022 13.5 17.7206 13.342 17.4393 13.0607C17.158 12.7794 17 12.3978 17 12C17 11.6022 17.158 11.2206 17.4393 10.9393C17.7206 10.658 18.1022 10.5 18.5 10.5C18.8978 10.5 19.2794 10.658 19.5607 10.9393C19.842 11.2206 20 11.6022 20 12Z" fill="#5F6165" />
            </svg>
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: dropUp ? 10 : -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: dropUp ? 10 : -10, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className={`w-40 rounded-md shadow-xl border border-gray-200 bg-white py-2 flex flex-col`}
                style={{ boxShadow: '0 8px 32px 0 rgba(18, 3, 3, 0.12)12)', position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 1000 }}
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
                    handleFavoriteForm(row.original.id);
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