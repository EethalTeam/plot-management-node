// models/Employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  EmployeeCode: {
    type: String,
    required: true,
    unique: true
  },
  EmployeeName: {
    type: String,
    required: true
  },
  employeeEmail: {
    type: String,
    required: true,
    unique: true
  },
  employeePhone: {
    type: String,
    required: true
  },
  employeeRole: {
    type: String,
    enum: ['superadmin','admin', 'agent'],
    default: 'agent'
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role"
  },
  employeeAddress: {
    type: String
  },
  password: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
