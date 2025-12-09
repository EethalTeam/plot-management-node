const Employee = require('../../models/masterModels/Employee');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const defaultMenus = require('./defaultMenu.json')
const UserRights = require('../../models/masterModels/UserRights')
const MenuRegistry = require('../../models/masterModels/MenuRegistry')
const RoleBased = require("../../models/masterModels/RBAC")

// Create Employee
exports.createEmployee = async (req, res) => {
  try {
    const { EmployeeCode, 
      EmployeeName, 
      employeeEmail, 
      employeePhone, 
      employeeRole,
      roleId, 
      employeeAddress, 
      password } = req.body;

    // Check for existing email or code
    const existing = await Employee.findOne({ $or: [{ employeeEmail }, { EmployeeCode }] });
    if (existing) {
      return res.status(400).json({ message: 'Employee email or code already exists' });
    }

    // const hashedPassword = await bcrypt.hash(password, 10);

    const newEmployee = new Employee({
      EmployeeCode,
      EmployeeName,
      employeeEmail,
      employeePhone,
      employeeRole,
      roleId,
      employeeAddress,
      password
      // password: hashedPassword
    });

    await newEmployee.save();

        // 4. Fetch all menu registry items
const allMenus = await RoleBased.find({})
  .populate("permissions.menuId", "formId parentFormId title")
  .lean();

// Step 1: Build menuPermissions for selected role
let menuPermissions = allMenus
  .filter(val => String(val._id) === String(roleId))
  .flatMap(menu =>
    menu.permissions.map(v => ({
      menuId: v.menuId._id,
      formId: v.menuId.formId,
      parentFormId: v.menuId.parentFormId || null,
      title: v.menuId.title,
      isEnable: true,
      isView: v.isView,
      isAdd: v.isAdd,
      isEdit: v.isEdit,
      isDelete: v.isDelete
    }))
  );

// Step 2: Ensure parent menus are also enabled
const parentIds = [
  ...new Set(menuPermissions.map(m => m.parentFormId).filter(Boolean))
];
for (const parentId of parentIds) {
  const alreadyExists = menuPermissions.some(m => String(m.menuId) === String(parentId));
  if (!alreadyExists) {
    const parentMenu = await MenuRegistry.findOne({formId:parentId}).lean();
    if (parentMenu) {
      menuPermissions.push({
        menuId: parentMenu._id,
        formId: parentMenu.formId,
        parentFormId: parentMenu.parentFormId || null,
        title: parentMenu.title,
        isEnable: true
      });
    }
  }
}

// Step 3: Create user rights doc
const userRights = new UserRights({
  employeeId: newEmployee._id,
  menus: menuPermissions
});
await userRights.save();
    res.status(201).json({ message: 'Employee created successfully', data: newEmployee });

  } catch (error) {
    res.status(500).json({ message: 'Error creating employee', error: error.message });
  }
};

exports.exampleRole = async(req,res)=>{
  try {
   const roleId="68a44c033dce40b3d0327c03"
        const allMenus = await RoleBased.find({}).populate("permissions.menuId","formId parentFormId title").lean();
    
        // 5. Build userRights.menus array
        const menuPermissions = allMenus.filter(val=>String(val._id) === String(roleId)).flatMap((menu) => {
         return menu.permissions.map(v=>({
            menuId: v.menuId._id,
            formId: v.menuId.formId,
            parentFormId: v.menuId.parentFormId || null,
            title: v.menuId.title,
            isView: v.isView,
            isAdd: v.isAdd,
            isEdit: v.isEdit,
            isDelete: v.isDelete
          }))
        });
    
  } catch (error) {
    res.status(500).json({ message: 'Error creating employee', error: error.message });
  }

}
// Get All Employees (optional filter by active)
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true }).select('-password');
    res.status(200).json({ data: employees });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
};

// Get Employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    res.status(200).json({ data: employee });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employee', error: error.message });
  }
};

// Update Employee
exports.updateEmployee = async (req, res) => {
  try {
    const {_id, EmployeeName, employeeEmail, employeePhone, employeeRole, roleId, employeeAddress } = req.body;

    const updated = await Employee.findByIdAndUpdate(
      _id,
      {
        EmployeeName,
        employeeEmail,
        employeePhone,
        employeeRole,
        roleId,
        employeeAddress
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Employee not found' });

    res.status(200).json({ message: 'Employee updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating employee', error: error.message });
  }
};

// Soft Delete Employee (set status to 'inactive')
exports.softDeleteEmployee = async (req, res) => {
  try {
    const deleted = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!deleted) return res.status(404).json({ message: 'Employee not found' });

    res.status(200).json({ message: 'Employee soft deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting employee', error: error.message });
  }
};



