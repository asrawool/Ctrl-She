import { supabase } from "@/lib/supabase";

export interface Inspection {
  id: string;
  name: string;
  framework: string;
  scheduled_date: string;
  status: string;
  assignee_ids?: string[];
  assigned_to?: string;
  created_by?: string;
  scope?: string;
  result?: string;
  findings?: string;
  completed_at?: string;
  completed_late?: boolean;
  delay_reason?: string;
}

export const isInspectionOverdue = (inspection: {
  status: string;
  scheduled_date: string;
}) => {
  return (
    inspection.status === "Overdue" ||
    (inspection.status === "Pending" &&
      new Date(inspection.scheduled_date) < new Date())
  );
};

export const checkAndMarkOverdue = async (
  inspectionList: Inspection[],
  onStatusUpdated?: (overdueIds: string[]) => void,
) => {
  try {
    const now = new Date();
    const overdueItems = inspectionList.filter(
      (i) =>
        i.status === "Pending" &&
        i.scheduled_date &&
        new Date(i.scheduled_date) < now,
    );
    if (overdueItems.length === 0) return;

    await Promise.allSettled(
      overdueItems.map((item) =>
        supabase
          .from("inspections")
          .update({ status: "Overdue" })
          .eq("id", item.id),
      ),
    );

    if (onStatusUpdated) {
      onStatusUpdated(overdueItems.map((item) => item.id));
    }

    // Send notifications (non-blocking)
    const notifPromises: PromiseLike<unknown>[] = [];
    for (const item of overdueItems) {
      const title = `Inspection overdue: ${item.name}`;
      const msg = `"${item.name}" (${item.framework}) scheduled for ${new Date(
        item.scheduled_date,
      ).toLocaleDateString()} is now overdue. Assignee(s): ${item.assigned_to || "none listed"}.`;

      if (item.created_by) {
        notifPromises.push(
          supabase.rpc("create_notification", {
            target_user_id: item.created_by,
            title,
            message: msg,
            type: "info",
            metadata: {
              category: "quality",
              priority: "high",
            },
          }),
        );
      }
      if (item.assignee_ids && item.assignee_ids.length > 0) {
        for (const assigneeId of item.assignee_ids) {
          notifPromises.push(
            supabase.rpc("create_notification", {
              target_user_id: assigneeId,
              title,
              message: msg,
              type: "info",
              metadata: {
                category: "quality",
                priority: "high",
              },
            }),
          );
        }
      }
    }
    if (notifPromises.length > 0) {
      await Promise.allSettled(notifPromises);
    }
  } catch (err) {
    console.warn("Failed to mark overdue inspections (non-blocking):", err);
  }
};
