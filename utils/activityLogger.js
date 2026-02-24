import ActivityLog from "../models/ActivityLog.js";

export const logActivity = async ({
  userId,
  groupId = null,
  action,
  entityType,
  entityId = null,
  metadata = {},
}) => {
  try {
    await ActivityLog.create({
      userId,
      groupId,
      action,
      entityType,
      entityId,
      metadata,
    });
  } catch (err) {
    console.error("Activity log error:", err.message);
  }
};