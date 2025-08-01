const Employee = require('../../models/masterModels/Employee');
const bcrypt = require('bcrypt');

// Create Employee
exports.createEmployee = async (req, res) => {
  try {
    const { employeeCode, employeeName, employeeEmail, employeePhone, employeeRole, employeeAddress, password } = req.body;

    // Check for existing email or code
    const existing = await Employee.findOne({ $or: [{ employeeEmail }, { employeeCode }] });
    if (existing) {
      return res.status(400).json({ message: 'Employee email or code already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newEmployee = new Employee({
      employeeCode,
      employeeName,
      employeeEmail,
      employeePhone,
      employeeRole,
      employeeAddress,
      password: hashedPassword
    });

    await newEmployee.save();
    res.status(201).json({ message: 'Employee created successfully', data: newEmployee });

  } catch (error) {
    res.status(500).json({ message: 'Error creating employee', error: error.message });
  }
};

// Get All Employees (optional filter by active)
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'active' }).select('-password');
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
    const { employeeName, employeeEmail, employeePhone, employeeRole, employeeAddress } = req.body;

    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        employeeName,
        employeeEmail,
        employeePhone,
        employeeRole,
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
