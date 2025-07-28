const mongoose = require('mongoose');

const menuPermissionSchema = new mongoose.Schema({
  menuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuRegistry',
    required: true
  },
  formId: {
    type: String,
    required: true
  },
  parentFormId: {
    type: String,
    default: null
  },
  title: {
    type: String
  },
  isEnable: {
    type: Boolean,
    default: false
  },
  isView: {
    type: Boolean,
    default: false
  },
  isAdd: {
    type: Boolean,
    default: false
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  isDelete: {
    type: Boolean,
    default: false
  },
  isNotification: {
    type: Boolean,
    default: false
  },
  unitAccess: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit'
    }
  ]
}, { _id: false }); // prevent _id creation for each menu item

const userRightsSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true // 1 doc per employee
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  menus: [menuPermissionSchema] // Embedded array of menu permissions
}, { timestamps: true });

module.exports = mongoose.model('UserRights', userRightsSchema);
