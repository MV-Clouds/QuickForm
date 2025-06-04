import Notification from '@/NotificationSettings/NotificationSettingsModal'
import { ContentLayout } from "@/components/admin-panel/content-layout";

export default function NotificationPage() {
  return (
    <ContentLayout title="Notification">
      <Notification/>
    </ContentLayout>
  );
}
