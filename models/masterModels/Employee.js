// models/Employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  EmployeeCode: {
    type: String,
    required: true,
     
  },
  EmployeeName: {
    type: String,
    required: true
  },
  employeeEmail: {
    type: String,
    required: true,
   
  },
  TelecmiID:{
   type:String,
   trim:true
  },
  TelecmiPassword:{
   type:String,
   trim:true
  },
  employeePhone: {
    type: String,
    required: true
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoleBased"
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


const EmployeeModel = mongoose.model('Employee', employeeSchema);
module.exports = EmployeeModel
