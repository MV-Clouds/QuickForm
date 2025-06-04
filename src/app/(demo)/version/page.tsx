import Link from "next/link";
import VersionControl from '@/VersionManagement/VersionControl'
import { ContentLayout } from "@/components/admin-panel/content-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";


export default function VersionPage() {
  return (
    <ContentLayout title="Version Management">
      <VersionControl formId= 'jhdb'/>
    </ContentLayout>
  );
}
