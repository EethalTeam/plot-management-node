const Employee = require('../../models/masterModels/Employee');
// const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

// const defaultMenus = require('./defaultMenu.json')
// const UserRights = require('../../models/masterModels/UserRights')
// const MenuRegistry = require('../../models/masterModels/MenuRegistry')
// const RoleBased = require("../../models/masterModels/RBAC")

 

// Create Employee
exports.createEmployee = async (req, res) => {
  try {
    const {
      EmployeeCode, EmployeeName, employeeEmail,
      employeePhone, roleId, employeeAddress, password, TelecmiID, TelecmiPassword,SiteId
    } = req.body;

    const existing = await Employee.findOne({
      $or: [{ employeeEmail }, { EmployeeCode }]
    });

    if (existing) {
      return res.status(400).json({ message: "Employee email or code already exists" });
    }

    const savedEmployee = await Employee.create({
      EmployeeCode,
      EmployeeName,
      employeeEmail,
      employeePhone,
      roleId,
      employeeAddress,
      password,
      TelecmiID,
      TelecmiPassword,
      SiteId
      
    });

    // ✅ Populate RoleName before returning
    const populated = await Employee.findById(savedEmployee._id)
      .populate("roleId", "RoleName").populate('SiteId',"sitename")

    return res.status(201).json({ data: populated });

  } catch (error) {
    return res.status(500).json({
      message: "Error creating employee",
      error: error.message
    });
  }
};

// 4. Fetch all menu registry items
// const allMenus = await RoleBased.find({})
//   .populate("permissions.menuId", "formId parentFormId title")
//   .lean();

// // Step 1: Build menuPermissions for selected role
// let menuPermissions = allMenus
//   .filter(val => String(val._id) === String(roleId))
//   .flatMap(menu =>
//     menu.permissions.map(v => ({
//       menuId: v.menuId._id,
//       formId: v.menuId.formId,
//       parentFormId: v.menuId.parentFormId || null,
//       title: v.menuId.title,
//       isEnable: true,
//       isView: v.isView,
//       isAdd: v.isAdd,
//       isEdit: v.isEdit,
//       isDelete: v.isDelete
//     }))
//   );

// Step 2: Ensure parent menus are also enabled
// const parentIds = [
//   ...new Set(menuPermissions.map(m => m.parentFormId).filter(Boolean))
// ];
// for (const parentId of parentIds) {
//   const alreadyExists = menuPermissions.some(m => String(m.menuId) === String(parentId));
//   if (!alreadyExists) {
//     const parentMenu = await MenuRegistry.findOne({formId:parentId}).lean();
//     if (parentMenu) {
//       menuPermissions.push({
//         menuId: parentMenu._id,
//         formId: parentMenu.formId,
//         parentFormId: parentMenu.parentFormId || null,
//         title: parentMenu.title,
//         isEnable: true
//       });
//     }
//   }
// }

// Step 3: Create user rights doc
// const userRights = new UserRights({
//   employeeId: newEmployee._id,
//   menus: menuPermissions
// });
// await userRights.save();
//     res.status(201).json({ message: 'Employee created successfully', data: newEmployee });

//   } catch (error) {
//     res.status(500).json({ message: 'Error creating employee', error: error.message });
//   }
// };

// exports.exampleRole = async(req,res)=>{
//   try {
//    const roleId="68a44c033dce40b3d0327c03"
//         const allMenus = await RoleBased.find({}).populate("permissions.menuId","formId parentFormId title").lean();

//         // 5. Build userRights.menus array
//         const menuPermissions = allMenus.filter(val=>String(val._id) === String(roleId)).flatMap((menu) => {
//          return menu.permissions.map(v=>({
//             menuId: v.menuId._id,
//             formId: v.menuId.formId,
//             parentFormId: v.menuId.parentFormId || null,
//             title: v.menuId.title,
//             isView: v.isView,
//             isAdd: v.isAdd,
//             isEdit: v.isEdit,
//             isDelete: v.isDelete
//           }))
//         });

//   } catch (error) {
//     res.status(500).json({ message: 'Error creating employee', error: error.message });
//   }

// }
// Get All Employees (optional filter by active)
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true }).populate('roleId', 'RoleName').populate('SiteId','sitename');
    res.status(200).json({ data: employees });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
};

// Get Employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const { _id } = req.body;

    const employee = await Employee.findById(_id)
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    res.status(200).json({ data: employee });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employee', error: error.message });
  }
};

// Update Employee
 


  exports.updateEmployee = async (req, res) => {
  try {
    const {
      _id,
      EmployeeCode,
      EmployeeName,
      employeeEmail,
      employeePhone,
      roleId,
      employeeAddress,
      password,
      TelecmiID,
      TelecmiPassword,
      SiteId,
      
    } = req.body;

    //  Build update object safely
    const updateData = {
      EmployeeCode,
      EmployeeName,
      employeeEmail,
      employeePhone,
      roleId,
      employeeAddress,
      password,
      TelecmiID,
      TelecmiPassword,
    
    };

    //  Add SiteId only if it exists
    if (SiteId) {
      updateData.SiteId = SiteId;
    }

    const updated = await Employee.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Employee not found" });
    }

    //  Safe populate (no error if SiteId is missing)
    const populated = await Employee.findById(updated._id)
      .populate("roleId", "RoleName")
      .populate("SiteId", "sitename");

    res.status(200).json({
      message: "Employee updated successfully",
      data: populated
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Soft Delete Employee (set status to 'inactive')
exports.deleteEmployee = async (req, res) => {
  try {
    const { _id } = req.body;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    const employee = await Employee.findByIdAndDelete(_id);

    if (!employee) {
      return res.status(400).json({ message: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




// LOGIN employee
exports.loginEmploye = async (req, res) => {
  try {
    const { EmployeeCode, password } = req.body;
    // 1. Reject if request is from mobile device
    // const userAgent = req.headers["user-agent"] || "";
    // const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
    // if (isMobile) {
    //   return res.status(403).json({ message: "Login from mobile devices is not allowed" });
    // }

    // 2. Find employee by email
    const employee = await Employee.findOne({ EmployeeCode: EmployeeCode }).populate("roleId", "RoleName")
    if (!employee) {
      return res.status(404).json({ message: "Invalid Employee Code" });
    }

    // 4. Compare plain password (since not hashing yet)
    if (employee.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // 5. Mark employee as logged in
    // physio.isCurrentlyLoggedIn = true;
    // await physio.save();

    // 6. Success
    res.status(200).json({
      message: "Login successful",
      employee: {
        _id: employee._id,
        EmployeeName: employee.EmployeeName,
        EmployeeCode: employee.EmployeeCode,
        role: employee.roleId.RoleName,
        TelecmiID:employee.TelecmiID,
        TelecmiPassword:employee.TelecmiPassword,
        SiteId:employee.SiteId


      
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

exports.logoutEmployee = async (req, res) => {
  try {
    const { EmployeeCode } = req.body;

    const employee = await Employee.findOne({ EmployeeCode });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    employee.isCurrentlyLoggedIn = false;
    await employee.save();

    res.status(200).json({ message: "Logout successful" });

  } catch (error) {
    res.status(500).json({ message: "Logout failed", error: error.message });
  }
};

exports.logoutUser = async (_id) => {
  try {
    // Update lastActive or any other logout tracking if needed
    await Employee.findByIdAndUpdate(_id, { isCurrentlyLoggedIn: false });

  } catch (err) {
    console.error("❌ Error logging out user:", err.message);
  }
};

exports.checkLogin = async (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"]; // userId passed from frontend
    if (!userId) {
      return res.status(401).json({ message: "User ID missing" });
    }

    const user = await Employee.findById(userId);

    if (!user || !user.isCurrentlyLoggedIn) {
      return res.status(401).json({ message: "User not logged in" });
    }

    // ✅ User is valid and logged in
    req.user = user;
    next();
  } catch (err) {
    console.error("checkLogin error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



