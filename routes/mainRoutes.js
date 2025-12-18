const express = require('express');
const router = express.Router();
const LogControllers = require('../controllers/mainControllers/ActivityLogControllers')
const MenuControllers = require('../controllers/mainControllers/MenuControllers')
const UserRightsControllers = require('../controllers/mainControllers/UserRightsControllers')
const VisitorControllers = require('../controllers/mainControllers/VisitorControllers')
const PlotControllers = require('../controllers/mainControllers/PlotControllers')
const DashBoardStats = require('../controllers/mainControllers/DashBoardStats')
const LeadControllers= require('../controllers/masterControllers/LeadControllers')
const upload = require('../utils/upload');

router.post('/Log/getAllLogs', LogControllers.getAllLogs )
router.post('/Log/getFilteredLogs', LogControllers.getFilteredLogs )
router.post('/Log/createLog', LogControllers.logCreate )
router.post('/Log/logCountChange', LogControllers.logCountChange )

//MenuControllers
 router.post('/Menu/createMenu', MenuControllers.createMenu)
//  router.post('/Menu/insertManyMenus', MenuControllers.InsertMany)
router.post('/Menu/updateMenu', MenuControllers.updateMenu)
router.post('/Menu/getAllMenus', MenuControllers.getAllMenus)
router.post('/Menu/deleteMenu', MenuControllers.deleteMenu)
router.post('/Menu/getAllParentsMenu', MenuControllers.getAllParentsMenu)
router.post('/Menu/getFormattedMenu', MenuControllers.getFormattedMenu)


router.post('/UserRights/getUserRightsByEmployeeId', UserRightsControllers.getUserRightsByEmployee)
router.post('/UserRights/getAllUserRights', UserRightsControllers.getAllUserRights)
router.post('/UserRights/createUserRights', UserRightsControllers.createUserRights)
router.post('/UserRights/updateUserRights', UserRightsControllers.updateUserRights)
router.post('/UserRights/getAllMenus', UserRightsControllers.getAllMenus)
router.post('/UserRights/getAllEmployees', UserRightsControllers.getAllEmployees)

router.post('/Visitor/getAllVisitor', VisitorControllers.getAllVisitors)
router.post('/Visitor/createVisitor', VisitorControllers.createVisitor)
router.post('/Visitor/updateVisitor', VisitorControllers.updateVisitor)
router.post('/Visitor/getAllPlots', VisitorControllers.getAllPlots)
router.post('/Visitor/getAllStatus', VisitorControllers.getAllStatus)
router.post('/Visitor/getAllEmployees', VisitorControllers.getAllEmployees)
router.post('/Visitor/addFollowUp', VisitorControllers.addFollowUp)
router.post('/Visitor/updateFollowUp', VisitorControllers.updateFollowUp)
router.post('/Visitor/getVisitorFollowUps', VisitorControllers.getVisitorFollowUps)
router.post('/Visitor/addPlotToVisitor', VisitorControllers.addPlotToVisitor)
router.post('/Visitor/updateVisitorPlot', VisitorControllers.updateVisitorPlot)
router.post('/Visitor/getVisitorPlots', VisitorControllers.getVisitorPlots)

router.post('/Plot/getAllPlots', PlotControllers.getAllPlots)
router.post('/Plot/createPlot', PlotControllers.createPlot)
router.post('/Plot/updatePlot', PlotControllers.updatePlot)
router.post('/Plot/deletePlots', PlotControllers.deletePlot)
router.post('/Plot/getAllStatus', PlotControllers.getAllStatus)
router.post('/Plot/getAllUnits', PlotControllers.getAllUnits)
router.post('/Plot/getAllVisitors', PlotControllers.getAllVisitors)
router.post('/Plot/updatePlotStatus', PlotControllers.updatePlotStatus)

router.post('/DashBoardStats', DashBoardStats.getDashboardStats)
router.post('/getPendingFollowUps', VisitorControllers.getPendingFollowUpsByEmployee)
router.post('/getCompletedFollowUps', VisitorControllers.getCompletedFollowUpsByEmployee)

router.post('/transferFollowUps', VisitorControllers.transferFollowUps)

router.post('/Lead/getAllLeads', LeadControllers.getAllLeads); 
router.post('/Lead/createLead',upload.array('leadFiles', 5),LeadControllers.createLead);
router.post('/Lead/updateLead',upload.array('leadFiles', 5), LeadControllers.updateLead); 
router.post('/Lead/deleteLeads', LeadControllers.deleteLead);
router.post('/Lead/getLeadById', LeadControllers.getLeadById);
router.post('/Lead/addLeadNote', LeadControllers.addLeadNote);
router.post('/Lead/addLeadDocument',upload.single('leadFile'),LeadControllers.addLeadDocument);

module.exports = router;