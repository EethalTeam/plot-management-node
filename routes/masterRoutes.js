const express = require('express');
const router = express.Router();

const EmployeeController = require('../controllers/masterControllers/EmployeeControllers')
const LoginController = require('../controllers/masterControllers/LoginControllers')
const NotificationController = require('../controllers/masterControllers/NotificationControllers')
const StatusController = require('../controllers/masterControllers/StatusControllers')
const UnitController = require('../controllers/masterControllers/UnitControllers')
const SiteController = require('../controllers/masterControllers/SiteControllers')
const StateController = require('../controllers/masterControllers/StateControllers')
const CityController = require('../controllers/masterControllers/CityControllers')
const RoleController = require('../controllers/masterControllers/RoleControllers')
const RBACController = require('../controllers/masterControllers/RBACControllers')
const CallLogController = require('../controllers/masterControllers/callLogControllers')
const DocumentControllers = require('../controllers/masterControllers/DocumentControllers')

//Notification 

router.post("/notifications", NotificationController.createNotification);
router.post("/Notifications/getNotifications", NotificationController.getNotificationsByUnit);

router.post("/CallLogs/getAllCallLogs", CallLogController.getCallLogs)
router.post("/CallLogs/Qualify", CallLogController.qualifyCallLog)


//********* Login ***************************** */
router.post('/Auth/login', LoginController.verifyLogin);

//********************Employee routers ********************** */

router.post('/Employee/createEmployee', EmployeeController.createEmployee); 
router.post('/Employee/getAllEmployees', EmployeeController.getAllEmployees);
router.post('/Employee/updateEmployee', EmployeeController.updateEmployee); 
router.post('/Employee/softDeleteEmployee',EmployeeController.softDeleteEmployee)
// router.post('/exampleRole',EmployeeController.exampleRole)

//login Employee

router.post('/Employee/loginEmployee',EmployeeController.loginEmploye)
router.post('/Employee/logoutEmployee',EmployeeController.logoutEmployee)
router.post('/Employee/logoutUser',EmployeeController.logoutUser)
router.post('/Employee/checkLogin',EmployeeController.checkLogin)

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

//Site Routes
router.post('/Site/createSite', SiteController.createSite)
router.post('/Site/deleteSite', SiteController.deleteSite)
router.post('/Site/updateSite', SiteController.updateSite)
router.post('/Site/getAllSites', SiteController.getAllSites)

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

// //Role Routes
// router.post('/Role/createRole', RoleController.createRole)
// router.post('/Role/deleteRole', RoleController.deleteRole)
// router.post('/Role/updateRole', RoleController.updateRole)
// router.post('/Role/getAllRoles', RoleController.getAllRoles)


//RBACControllers
router.post('/RoleBased/createRole', RBACController.createRole)
router.post('/RoleBased/deleteRole', RBACController.deleteRole)
router.post('/RoleBased/updateRole', RBACController.updateRole)
router.post('/RoleBased/getAllRoles', RBACController.getAllRoles)
router.post('/RoleBased/getAllMenus', RBACController.getAllMenus)
router.post('/RoleBased/updateMenusAndAccess', RBACController.updateMenusAndAccess)
router.post('/RoleBased/getPermissions', RBACController.getPermissionsByRoleAndPath)

//DocumentControllers
router.post('/Document/createDocument',DocumentControllers.createDocument)
router.post('/Document/getAllDocument',DocumentControllers.getAllDocument)
router.post('/Document/getSingleDocument',DocumentControllers.getDocumentByName)
router.post('/Document/updateDocument',DocumentControllers.updateDocument)
router.post('/Document/deleteDocument',DocumentControllers.deleteDocument)

module.exports = router;