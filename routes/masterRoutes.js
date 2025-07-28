const express = require('express');
const router = express.Router();

const EmployeeController = require('../controllers/masterControllers/EmployeeControllers')
const LoginController = require('../controllers/masterControllers/LoginControllers')
const NotificationController = require('../controllers/masterControllers/NotificationControllers')


//Notification 

router.post("/notifications", NotificationController.createNotification);
router.post("/Notifications/getNotifications", NotificationController.getNotificationsByUnit);


//********* Login ***************************** */
router.post('/Auth/login', LoginController.verifyLogin);

//********************Employee routers ********************** */
// Create Employee
router.post('/Employee/createEmployee', EmployeeController.createEmployee); 

// Get all Employees
router.post('/Employee/getAllEmployees', EmployeeController.getAllEmployees); 

// Update Employee
router.post('/Employee/updateEmployee', EmployeeController.updateEmployee); 

module.exports = router;