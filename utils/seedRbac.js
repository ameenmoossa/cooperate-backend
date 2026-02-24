import Role from "../models/Role.js";
import Permission from "../models/Permission.js";

const defaultPermissions = [
  {
    key: "chat.send",
    label: "Send Messages",
    description: "Can send chat messages",
    category: "chat",
  },
  {
    key: "group.create",
    label: "Create Groups",
    description: "Can create groups",
    category: "group",
  },
  {
    key: "approval.manage",
    label: "Manage Approvals",
    description: "Can approve or reject requests",
    category: "approval",
  },
  {
    key: "settings.manage",
    label: "Manage Settings",
    description: "Can manage admin settings",
    category: "settings",
  },
  {
    key: "ai.use",
    label: "Use AI",
    description: "Can use AI assistant features",
    category: "ai",
  },
  {
    key: "call.start",
    label: "Start Calls",
    description: "Can start calls",
    category: "call",
  },
];

const systemRoleMap = {
  admin: {
    description: "System administrator with full access",
    permissions: defaultPermissions.map((item) => item.key),
  },
  manager: {
    description: "Manager with group, approval and chat access",
    permissions: ["group.create", "approval.manage", "chat.send", "call.start"],
  },
  user: {
    description: "Standard user with basic chat access",
    permissions: ["chat.send"],
  },
};

export const seedRbacDefaults = async () => {
  try {
    const existingPermissions = await Permission.find().select("key");
    const existingPermissionSet = new Set(existingPermissions.map((item) => item.key));

    const missingPermissions = defaultPermissions.filter(
      (permission) => !existingPermissionSet.has(permission.key)
    );

    if (missingPermissions.length > 0) {
      await Permission.insertMany(missingPermissions);
    }

    const allPermissionKeys = (await Permission.find().select("key")).map((item) => item.key);

    const existingRoles = await Role.find().select("name isSystem");
    const existingRoleMap = new Map(existingRoles.map((role) => [role.name, role]));

    for (const [name, config] of Object.entries(systemRoleMap)) {
      const resolvedPermissions =
        name === "admin"
          ? allPermissionKeys
          : config.permissions.filter((key) => allPermissionKeys.includes(key));

      if (!existingRoleMap.has(name)) {
        await Role.create({
          name,
          description: config.description,
          permissions: resolvedPermissions,
          isSystem: true,
        });
        continue;
      }

      await Role.updateOne(
        { name },
        {
          $set: {
            description: config.description,
            permissions: resolvedPermissions,
            isSystem: true,
          },
        }
      );
    }

    console.log("RBAC defaults seeded");
  } catch (err) {
    console.error("RBAC seed error:", err.message);
  }
};
