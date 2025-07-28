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
  employeeAddress: {
    type: String
  },
  password: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
