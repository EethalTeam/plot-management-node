const express = require('express');
const router = express.Router();

const EmployeeController = require('../controllers/masterControllers/EmployeeControllers')
const LoginController = require('../controllers/masterControllers/LoginControllers')
const NotificationController = require('../controllers/masterControllers/NotificationControllers')
const StatusController = require('../controllers/masterControllers/StatusControllers')
const UnitController = require('../controllers/masterControllers/UnitControllers')
const StateController = require('../controllers/masterControllers/StateControllers')
const CityController = require('../controllers/masterControllers/CityControllers')

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

//Status Routes
router.post('/Status/createStatus', StatusController.createStatus)
router.post('/Status/deleteStatus', StatusController.softDeleteStatus)
router.post('/Status/updateStatus', StatusController.updateStatus)
router.post('/Status/getAllStatus', StatusController.getAllStatus)

//Unit Routes
router.post('/Unit/createUnit', UnitController.createUnit)
router.post('/Unit/deleteUnit', UnitController.deleteUnit)
router.post('/Unit/updateUnit', UnitController.updateUnit)
router.post('/Unit/getAllUnits', UnitController.getAllUnits)

//State Routes
router.post('/State/createState', StateController.createState)
router.post('/State/deleteState', StateController.deleteState)
router.post('/State/updateState', StateController.updateState)
router.post('/State/getAllStates', StateController.getAllStates)

//City Routes
router.post('/City/createCity', CityController.createCity)
router.post('/City/deleteCity', CityController.deleteCity)
router.post('/City/updateCity', CityController.updateCity)
router.post('/City/getAllCitys', CityController.getAllCitys)
router.post('/City/getAllStates', CityController.getAllStates)

module.exports = router;