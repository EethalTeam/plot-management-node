const express = require('express');
const router = express.Router();
const LogControllers = require('../controllers/mainControllers/ActivityLogControllers')
const MenuControllers = require('../controllers/mainControllers/MenuControllers')
const UserRightsControllers = require('../controllers/mainControllers/UserRightsControllers')

router.post('/Log/getAllLogs', LogControllers.getAllLogs )
router.post('/Log/getFilteredLogs', LogControllers.getFilteredLogs )
router.post('/Log/createLog', LogControllers.logCreate )
router.post('/Log/logCountChange', LogControllers.logCountChange )

router.post('/Menu/createMenu', MenuControllers.createMenu)
router.post('/Menu/insertManyMenus', MenuControllers.InsertMany)
router.post('/Menu/updateMenu', MenuControllers.updateMenu)
router.post('/Menu/getAllMenus', MenuControllers.getAllMenus)
router.post('/Menu/getAllParentsMenu', MenuControllers.getAllParentsMenu)


router.post('/UserRights/getUserRightsByEmployeeId', UserRightsControllers.getUserRightsByEmployee)
router.post('/UserRights/getAllUserRights', UserRightsControllers.getAllUserRights)
router.post('/UserRights/createUserRights', UserRightsControllers.createUserRights)
router.post('/UserRights/updateUserRights', UserRightsControllers.updateUserRights)
router.post('/UserRights/getAllMenus', UserRightsControllers.getAllMenus)
router.post('/UserRights/getAllEmployees', UserRightsControllers.getAllEmployees)

module.exports = router;