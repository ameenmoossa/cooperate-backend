import express from "express";
import {
  getAllUsers,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  createPermission,
  assignRoleToUser,
} from "../controllers/settingsAdminController.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

router.use(requireAdmin);

router.get("/users", getAllUsers);

router.get("/roles", getRoles);
router.post("/roles", createRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

router.get("/permissions", getPermissions);
router.post("/permissions", createPermission);

router.put("/users/:id/role", assignRoleToUser);

export default router;
