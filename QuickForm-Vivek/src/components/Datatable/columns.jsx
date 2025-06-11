import React from 'react';
import { ArrowUpDown } from 'lucide-react';

export const Form = {
  id: '',
  srNo: 0,
  formName: '',
  activeVersion: '',
  submissionCount: 0,
  status: 'active',
};

export const columns = [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
      />
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'srNo',
    header: 'Sr No',
    cell: ({ row }) => <div className="text-center">{row.index + 1}</div>,
  },
  {
    accessorKey: 'formName',
    header: ({ column }) => (
      <button
        className="flex items-center mx-auto font-semibold text-gray-700 hover:text-indigo-600"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Form Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </button>
    ),
    cell: ({ row }) => <div className="font-medium text-center">{row.getValue('formName')}</div>,
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
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status');
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
    id: 'actions',
    cell: ({ row }) => (
      <div className="text-center">
        <button className="p-2 rounded-full hover:bg-gray-100">
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
      </div>
    ),
  },
];