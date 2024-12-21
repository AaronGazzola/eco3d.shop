"use client";

import { Switch } from "@/components/ui/switch";
import ConfirmDialog from "@/components/ux/ConfirmDialog";
import {
  useAdminNotificationsQuery,
  useUpdateAdminNotifications,
} from "@/hooks/admin.hooks";
import { useState } from "react";

export const AdminNotificationsToggle = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const { data: enabled } = useAdminNotificationsQuery();
  const { mutate: updateNotifications } = useUpdateAdminNotifications();

  const handleToggle = () => {
    setShowConfirm(true);
  };

  return (
    <div className="flex gap-4 items-center">
      <div className="text-lg">
        Notifications {enabled ? "enabled" : "disabled"}
      </div>
      <Switch checked={!!enabled} onCheckedChange={handleToggle} />

      <ConfirmDialog
        title={`${enabled ? "Disable" : "Enable"} order notifications?`}
        description={`Are you sure you want to ${enabled ? "stop" : "start"} receiving email notifications for new orders?`}
        onConfirm={() => {
          updateNotifications(!enabled);
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
        confirmText={enabled ? "Disable" : "Enable"}
        cancelText="Cancel"
        open={showConfirm}
      />
    </div>
  );
};
