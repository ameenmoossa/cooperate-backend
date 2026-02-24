import jwt from "jsonwebtoken";
import UserSettings from "../models/UserSettings.js";
import { logActivity } from "../utils/activityLogger.js";

const JWT_SECRET = process.env.JWT_SECRET || "corpconnect_dev_secret";

const sectionSchemas = {
  profile: {
    name: "string",
    avatar: "string",
    designation: "string",
    department: "string",
    bio: "string",
  },
  notifications: {
    chatNotifications: "boolean",
    emailNotifications: "boolean",
    mentionAlerts: "boolean",
    approvalAlerts: "boolean",
  },
  ai: {
    enableAssistant: "boolean",
    enableChatSummarization: "boolean",
    enableTaskSuggestions: "boolean",
    enableVoiceTranscription: "boolean",
  },
  privacy: {
    lastSeenVisibility: {
      type: "string",
      enum: ["everyone", "contacts", "nobody"],
    },
    readReceipts: "boolean",
    profileVisibility: {
      type: "string",
      enum: ["everyone", "contacts", "private"],
    },
  },
  preferences: {
    theme: {
      type: "string",
      enum: ["light", "dark"],
    },
    language: "string",
    timezone: "string",
  },
};

const unauthorized = (res, message = "Unauthorized") =>
  res.status(401).json({ message });

const badRequest = (res, message) => res.status(400).json({ message });

const getUserIdFromToken = (req, res) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    unauthorized(res, "Missing Bearer token");
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const tokenUserId = payload.userId || payload.id || payload._id;

    if (!tokenUserId) {
      unauthorized(res, "Token payload missing user id");
      return null;
    }

    return tokenUserId;
  } catch (err) {
    unauthorized(res, "Invalid or expired token");
    return null;
  }
};

const validateSectionPayload = (sectionKey, payload) => {
  const schema = sectionSchemas[sectionKey];

  if (!schema) {
    return { error: `Unsupported settings section: ${sectionKey}` };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: `${sectionKey} must be an object` };
  }

  const normalized = {};

  for (const key of Object.keys(payload)) {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      return { error: `Invalid field '${key}' in ${sectionKey}` };
    }

    const validator = schema[key];
    const value = payload[key];

    if (typeof validator === "string") {
      if (typeof value !== validator) {
        return {
          error: `Invalid type for ${sectionKey}.${key}: expected ${validator}`,
        };
      }
      normalized[key] = value;
      continue;
    }

    if (validator.type === "string") {
      if (typeof value !== "string") {
        return {
          error: `Invalid type for ${sectionKey}.${key}: expected string`,
        };
      }

      if (validator.enum && !validator.enum.includes(value)) {
        return {
          error: `Invalid value for ${sectionKey}.${key}. Allowed: ${validator.enum.join(", ")}`,
        };
      }

      normalized[key] = value;
      continue;
    }

    return { error: `Invalid validator for ${sectionKey}.${key}` };
  }

  return { normalized };
};

const buildDotSet = (sectionKey, normalizedPayload) => {
  const setOps = {};
  for (const [key, value] of Object.entries(normalizedPayload)) {
    setOps[`${sectionKey}.${key}`] = value;
  }
  return setOps;
};

const ensureSettings = async (userId) => {
  let settings = await UserSettings.findOne({ userId });
  if (!settings) {
    settings = await UserSettings.create({ userId });
  }
  return settings;
};

const logSettingsChange = async ({ userId, settingsId, action, section, changedKeys }) => {
  await logActivity({
    userId,
    action,
    entityType: "settings",
    entityId: settingsId,
    metadata: {
      section,
      changedFields: changedKeys,
    },
  });
};

export const getMySettings = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req, res);
    if (!userId) return;

    const settings = await ensureSettings(userId);
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch settings" });
  }
};

export const updateMySettings = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req, res);
    if (!userId) return;

    const allowedSections = [
      "profile",
      "notifications",
      "ai",
      "privacy",
      "preferences",
    ];

    const body = req.body || {};
    const presentSections = allowedSections.filter((section) => section in body);

    if (presentSections.length === 0) {
      return badRequest(
        res,
        "Provide at least one section: profile, notifications, ai, privacy, preferences"
      );
    }

    const $set = {};

    for (const section of presentSections) {
      const { normalized, error } = validateSectionPayload(section, body[section]);
      if (error) return badRequest(res, error);

      Object.assign($set, buildDotSet(section, normalized));
    }

    if (Object.keys($set).length === 0) {
      return badRequest(res, "No valid settings fields provided");
    }

    const updated = await UserSettings.findOneAndUpdate(
      { userId },
      { $set, $setOnInsert: { userId } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    await logSettingsChange({
      userId,
      settingsId: updated._id,
      action: "settings_updated",
      section: "multiple",
      changedKeys: Object.keys($set),
    });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update settings" });
  }
};

const updateSingleSection = (sectionKey, actionName) => async (req, res) => {
  try {
    const userId = getUserIdFromToken(req, res);
    if (!userId) return;

    const { normalized, error } = validateSectionPayload(sectionKey, req.body || {});
    if (error) return badRequest(res, error);

    if (Object.keys(normalized).length === 0) {
      return badRequest(res, `Provide at least one ${sectionKey} field`);
    }

    const $set = buildDotSet(sectionKey, normalized);

    const updated = await UserSettings.findOneAndUpdate(
      { userId },
      { $set, $setOnInsert: { userId } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    await logSettingsChange({
      userId,
      settingsId: updated._id,
      action: actionName,
      section: sectionKey,
      changedKeys: Object.keys(normalized),
    });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: `Failed to update ${sectionKey} settings` });
  }
};

export const updateAISettings = updateSingleSection("ai", "settings_ai_updated");
export const updateNotificationSettings = updateSingleSection(
  "notifications",
  "settings_notifications_updated"
);
export const updateProfileSettings = updateSingleSection(
  "profile",
  "settings_profile_updated"
);
