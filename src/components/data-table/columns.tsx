"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from '@/components/ui/button'
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Copy, Eye } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuContent } from '@/components/ui/dropdown-menu'

// Sample data


export type Form = {
    id: string
    srNo: number
    formName: string
    activeVersion: string
    submissionCount: number
    status: "active" | "draft" | "archived"
}

export const columns: ColumnDef<Form>[] = [
   
    {
        id: "select",
        header: ({ table }) => (
            <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && true)
                }
                onChange={(value) => table.toggleAllPageRowsSelected(!!value.target.checked)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <div className="text-center">
            <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                checked={row.getIsSelected()}
                onChange={(value) => row.toggleSelected(!!value.target.checked)}
                aria-label="Select row"
            /></div>
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "srNo",
        header: "Sr No",
        cell: ({ row }) => <div className="text-center">{row.index + 1}</div>,
    },
    {
        accessorKey: "formName",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="font-semibold text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Form Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => <div className="font-medium text-center ">{row.getValue("formName")}</div>,
    },
    {
        accessorKey: "activeVersion",
        header: "Active Version",
        cell: ({ row }) => (
            <div className=" text-center">
            <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {row.getValue("activeVersion")}
            </div></div>
        ),
    },
    {
        accessorKey: "submissionCount",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="font-semibold text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Submissions
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const count = row.getValue("submissionCount") as number
            return (
                <div className=" text-center font-medium">
                    <span className="text-gray-600 dark:text-gray-300">{count}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            const statusStyles = {
                active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 ",
                draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
                archived: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            }
            return (
                <div className="text-center">
                <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status as keyof typeof statusStyles]}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </div></div>
            )
        },
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
            const form = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                        align="end"
                        className="w-48 border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
                    >
                        <DropdownMenuLabel className="text-gray-700 dark:text-gray-300">
                            Actions
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                        <DropdownMenuItem 
                            className="flex items-center text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            onClick={() => navigator.clipboard.writeText(form.id)}
                        >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                            <Eye className="mr-2 h-4 w-4" />
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                        <DropdownMenuItem className="flex items-center text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]