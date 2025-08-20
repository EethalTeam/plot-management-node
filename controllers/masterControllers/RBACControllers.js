const Role = require("../../models/masterModels/RBAC"); // adjust path as needed
const MenuRegistry = require("../../models/masterModels/MenuRegistry")

// Create Role
exports.createRole = async (req, res) => {
  try {
    const role = new Role(req.body); // includes RoleCode, RoleName, description, permissions
    await role.save();
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Update Role
exports.updateRole = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;

    const role = await Role.findByIdAndUpdate(
      _id,
      updateData, // includes RoleCode, RoleName, description, isActive, permissions
      { new: true, runValidators: true }
    );

    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    res.status(200).json({ success: true, data: role });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete Role
exports.deleteRole = async (req, res) => {
  try {
    const { roleId } = req.body;
    const role = await Role.findByIdAndDelete(roleId);

    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    res.status(200).json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getAllRoles = async (req, res) => {
    try {
      const roles = await Role.aggregate([
  {
    $unwind: "$permissions"
  },
  {
    $lookup: {
      from: "menuregistries", // your Menu collection name
      localField: "permissions.menuId",
      foreignField: "_id",
      as: "menuData"
    }
  },
  {
    $unwind: "$menuData"
  },
  {
    $group: {
      _id: "$_id",
      RoleName: { $first: "$RoleName" },
      permissions: {
        $push: {
          menuId: "$permissions.menuId",
          MenuName: "$menuData.title",
          isAdd: "$permissions.isAdd",
          isEdit: "$permissions.isEdit",
          isView: "$permissions.isView",
          isDelete: "$permissions.isDelete"
        }
      }
    }
  }
])
      res.status(200).json({ data: roles });
    } catch (error) {
      res.status(500).json({ message: "Error fetching roles", error });
    }
}

// Add Menu to Role
exports.addMenuToRole = async (req, res) => {
  try {
    const { roleId, menuId, isAdd, isEdit, isView, isDelete } = req.body;

    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    // check if menu already exists
    const existing = role.permissions.find((p) => p.menuId.toString() === menuId);
    if (existing) {
      return res.status(400).json({ success: false, message: "Menu already exists in role" });
    }

    role.permissions.push({ menuId, isAdd, isEdit, isView, isDelete });
    await role.save();

    res.status(200).json({ success: true, data: role });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Edit Menu in Role
exports.editMenuInRole = async (req, res) => {
  try {
    const { roleId, menuId, ...updateData } = req.body;

    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    const menu = role.permissions.find((p) => p.menuId.toString() === menuId);
    if (!menu) return res.status(404).json({ success: false, message: "Menu not found in role" });

    Object.assign(menu, updateData); // overwrite with whatever comes in body
    await role.save();

    res.status(200).json({ success: true, data: role });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete Menu from Role
exports.deleteMenuFromRole = async (req, res) => {
  try {
    const { roleId, menuId } = req.body;

    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    role.permissions = role.permissions.filter((p) => p.menuId.toString() !== menuId);
    await role.save();

    res.status(200).json({ success: true, data: role });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getAllMenus = async (req, res) => {
  try {
    // Step 1 → Fetch all menus and populate unitAccess with _id + name
    const menus = await MenuRegistry.find()
      .sort({ sortOrder: 1 })
      .lean(); // lean = plain JS objects

    // Step 2 → Create a lookup map of { formId → title }
    const menuMap = {};
    for (const menu of menus) {
      menuMap[menu.formId] = menu.title;
    }

    // Step 3 → Enrich each menu with parentTitle
    const enrichedMenus = menus.filter(menu => menu.parentFormId).map(menu => ({
      ...menu,
      parentTitle: menu.parentFormId ? menuMap[menu.parentFormId] || null : null
    }));

    // Step 4 → Send enriched menus
    res.status(200).json(enrichedMenus
    );

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching menus" });
  }
};
