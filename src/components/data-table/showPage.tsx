import { Form, columns } from "./columns"
import { DataTable } from "./datatable"

async function getData(): Promise<Form[]> {
  // Fetch data from your API here.
  return [
    {
        id: "m5gr84i9",
        srNo: 1,
        formName: "User Registration",
        activeVersion: "v2.1",
        submissionCount: 316,
        status: "active",
    },
    {
        id: "3u1reuv4",
        srNo: 2,
        formName: "Feedback Survey",
        activeVersion: "v1.5",
        submissionCount: 242,
        status: "active",
    },
    {
        id: "derv1ws0",
        srNo: 3,
        formName: "Contact Us",
        activeVersion: "v3.0",
        submissionCount: 837,
        status: "draft",
    },
    {
        id: "5kma53ae",
        srNo: 4,
        formName: "Order Form",
        activeVersion: "v2.3",
        submissionCount: 874,
        status: "archived",
    },
    {
        id: "bhqecj4p",
        srNo: 5,
        formName: "Support Ticket",
        activeVersion: "v1.2",
        submissionCount: 721,
        status: "active",
    },
    {
      id: "m5gr84i9",
      srNo: 6,
      formName: "User Registration",
      activeVersion: "v2.1",
      submissionCount: 316,
      status: "active",
  },
  {
      id: "3u1reuv4",
      srNo: 7,
      formName: "Feedback Survey",
      activeVersion: "v1.5",
      submissionCount: 242,
      status: "active",
  },
  {
      id: "derv1ws0",
      srNo: 8,
      formName: "Contact Us",
      activeVersion: "v3.0",
      submissionCount: 837,
      status: "draft",
  },
  {
      id: "5kma53ae",
      srNo: 9,
      formName: "Order Form",
      activeVersion: "v2.3",
      submissionCount: 874,
      status: "archived",
  },
  {
      id: "bhqecj4p",
      srNo: 10,
      formName: "Support Ticket",
      activeVersion: "v1.2",
      submissionCount: 721,
      status: "active",
  },
]
}

export default async function showPage() {
  const data = await getData()

  // Sort data in descending order based on submissionCount
  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data.sort((a, b) => b.submissionCount - a.submissionCount)} />
    </div>
  )
}
