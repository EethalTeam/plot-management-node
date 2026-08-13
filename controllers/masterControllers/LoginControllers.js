require('dotenv').config(); // ✅ Ensure this is at the top of your entry point (e.g., server.js)

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Employee = require('../../models/masterModels/Employee');

exports.verifyLogin = async (req, res) => {
  try {
    const { EmployeeCode, password } = req.body;

    // Find user
    const user = await Employee.findOne({ EmployeeCode }).populate('roleId', 'RoleName')

    if (!user) {
      return res.status(400).json({ message: "Employee Code does not exist" });
    }

    // Employee passwords were historically stored in plaintext (see
    // EmployeeControllers create/update). Try a real bcrypt compare first;
    // if that fails, fall back to a plaintext match and transparently
    // upgrade the stored value to a bcrypt hash so it self-heals over time.
    let isMatch = await bcrypt.compare(password, user.password).catch(() => false);
    if (!isMatch && password === user.password) {
      isMatch = true;
      user.password = await bcrypt.hash(password, 10);
    }
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const roleName = user.roleId?.RoleName || 'Agent';

    // ✅ Generate JWT token
    const token = jwt.sign(
      {
        _id: user._id,
        EmployeeCode: user.EmployeeCode,
        role: roleName
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Update last login
    const now = new Date();
    user.lastLogin = now;
    await user.save();

    // ✅ Format last login as date & time
    const lastLoginFormatted = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    res.status(200).json({
      message: "Login successful",
      data: {
        _id: user._id,
        EmployeeName: user.EmployeeName,
        EmployeeCode: user.EmployeeCode,
        lastLogin: lastLoginFormatted,
        role: roleName,
        token,
        tokenExpiry: "7 days",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};