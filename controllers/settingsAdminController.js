import User from "../models/User.js";
import Role from "../models/Role.js";
import Permission from "../models/Permission.js";
import { logActivity } from "../utils/activityLogger.js";

const normalizeRoleName = (name = "") => String(name).trim().toLowerCase();

const validatePermissionKeys = async (permissionKeys = []) => {
  const normalized = [...new Set((permissionKeys || []).map((k) => String(k).trim().toLowerCase()))].filter(Boolean);

  if (normalized.length === 0) {
    return { ok: true, keys: [] };
  }

  const found = await Permission.find({ key: { $in: normalized } }).select("key");
  const foundSet = new Set(found.map((item) => item.key));
  const missing = normalized.filter((key) => !foundSet.has(key));

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Unknown permission keys: ${missing.join(", ")}`,
    };
  }

  return { ok: true, keys: normalized };
};

export const getAllUsers = async (req, res) => {
  try {
    const [users, roles, permissions] = await Promise.all([
      User.find().select("_id name email role status createdAt updatedAt").sort({ createdAt: -1 }),
      Role.find().sort({ name: 1 }),
      Permission.find().sort({ category: 1, key: 1 }),
    ]);

    return res.json({ users, roles, permissions });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch admin settings data" });
  }
};

export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    return res.json({ roles });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch roles" });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, description = "", permissions = [] } = req.body || {};
    const normalizedName = normalizeRoleName(name);

    if (!normalizedName) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const existing = await Role.findOne({ name: normalizedName });
    if (existing) {
      return res.status(409).json({ message: "Role already exists" });
    }

    const permissionValidation = await validatePermissionKeys(permissions);
    if (!permissionValidation.ok) {
      return res.status(400).json({ message: permissionValidation.error });
    }

    const role = await Role.create({
      name: normalizedName,
      description,
      permissions: permissionValidation.keys,
      isSystem: false,
    });

    await logActivity({
      userId: req.authUserId,
      action: "role_created",
      entityType: "role",
      entityId: role._id,
      metadata: {
        name: role.name,
        permissions: role.permissions,
      },
    });

    return res.status(201).json(role);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create role" });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body || {};

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (name !== undefined) {
      const normalizedName = normalizeRoleName(name);
      if (!normalizedName) {
        return res.status(400).json({ message: "Role name cannot be empty" });
      }

      if (role.isSystem && normalizedName !== role.name) {
        return res.status(400).json({ message: "System role name cannot be changed" });
      }

      if (normalizedName !== role.name) {
        const duplicate = await Role.findOne({ name: normalizedName, _id: { $ne: id } });
        if (duplicate) {
          return res.status(409).json({ message: "Role name already in use" });
        }
      }

      role.name = normalizedName;
    }

    if (description !== undefined) {
      role.description = description;
    }

    if (permissions !== undefined) {
      const permissionValidation = await validatePermissionKeys(permissions);
      if (!permissionValidation.ok) {
        return res.status(400).json({ message: permissionValidation.error });
      }
      role.permissions = permissionValidation.keys;
    }

    await role.save();

    await logActivity({
      userId: req.authUserId,
      action: "role_updated",
      entityType: "role",
      entityId: role._id,
      metadata: {
        name: role.name,
        permissions: role.permissions,
      },
    });

    return res.json(role);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update role" });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.isSystem) {
      return res.status(400).json({ message: "Cannot delete system roles" });
    }

    const usersWithRole = await User.countDocuments({ role: role.name });
    if (usersWithRole > 0) {
      return res.status(400).json({ message: "Cannot delete role assigned to users" });
    }

    await Role.deleteOne({ _id: id });

    return res.json({ message: "Role deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete role" });
  }
};

export const getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ category: 1, key: 1 });
    return res.json({ permissions });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch permissions" });
  }
};

export const createPermission = async (req, res) => {
  try {
    const { key, label, description = "", category } = req.body || {};
    const normalizedKey = String(key || "").trim().toLowerCase();

    if (!normalizedKey || !label || !category) {
      return res.status(400).json({ message: "key, label and category are required" });
    }

    const exists = await Permission.findOne({ key: normalizedKey });
    if (exists) {
      return res.status(409).json({ message: "Permission already exists" });
    }

    const permission = await Permission.create({
      key: normalizedKey,
      label,
      description,
      category,
    });

    await logActivity({
      userId: req.authUserId,
      action: "permission_created",
      entityType: "permission",
      entityId: permission._id,
      metadata: {
        key: permission.key,
        category: permission.category,
      },
    });

    return res.status(201).json(permission);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create permission" });
  }
};

export const assignRoleToUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!role) {
      return res.status(400).json({ message: "role is required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let roleDoc = null;

    if (String(role).match(/^[0-9a-fA-F]{24}$/)) {
      roleDoc = await Role.findById(role);
    }

    if (!roleDoc) {
      roleDoc = await Role.findOne({ name: normalizeRoleName(role) });
    }

    if (!roleDoc) {
      return res.status(404).json({ message: "Role not found" });
    }

    user.role = roleDoc.name;
    await user.save();

    await logActivity({
      userId: req.authUserId,
      action: "role_assigned",
      entityType: "user",
      entityId: user._id,
      metadata: {
        assignedRole: roleDoc.name,
      },
    });

    return res.json({
      message: "Role assigned successfully",
      user,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to assign role" });
  }
};
