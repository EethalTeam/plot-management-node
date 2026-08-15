const express = require("express");
const router = express.Router();
const LogControllers = require("../controllers/mainControllers/ActivityLogControllers");
const MenuControllers = require("../controllers/mainControllers/MenuControllers");
const UserRightsControllers = require("../controllers/mainControllers/UserRightsControllers");
const VisitorControllers = require("../controllers/mainControllers/VisitorControllers");
const PlotControllers = require("../controllers/mainControllers/PlotControllers");
// const DashBoardStats = require('../controllers/mainControllers/DashBoardStats')
const LeadControllers = require("../controllers/masterControllers/LeadControllers");
const DashboardControllers = require("../controllers/mainControllers/DashBoardControllers");
const upload = require("../utils/upload");
const ReportControllers = require('../controllers/mainControllers/ReportControllers')
const BackupControllers = require('../controllers/mainControllers/BackupControllers')
const PaymentControllers = require('../controllers/mainControllers/PaymentControllers')
const DealControllers = require('../controllers/mainControllers/DealControllers')
const EmailControllers = require('../controllers/mainControllers/EmailControllers')
const MeetingControllers = require('../controllers/mainControllers/MeetingControllers')
const ChannelControllers = require('../controllers/mainControllers/ChannelControllers')
const TeamControllers = require('../controllers/mainControllers/TeamControllers')
const AttendanceControllers = require('../controllers/mainControllers/AttendanceControllers')
const SecuritySettingControllers = require('../controllers/mainControllers/SecuritySettingControllers')
const WhatsAppController = require('../controllers/masterControllers/WhatsAppController')
const LeadDistributionControllers = require('../controllers/mainControllers/LeadDistributionControllers')
const CallLogControllers = require('../controllers/masterControllers/callLogControllers')
const WhatsAppFlowControllers = require('../controllers/mainControllers/WhatsAppFlowControllers')
const SequenceControllers = require('../controllers/mainControllers/SequenceControllers')

router.post("/Log/getActivityLog", LogControllers.getActivityLog);

router.post("/Channels/getChannelStatus", ChannelControllers.getChannelStatus);
router.post("/Channels/getIngestionLog", ChannelControllers.getIngestionLog);
router.post("/Channels/getAutoResponseSettings", ChannelControllers.getAutoResponseSettings);
router.post("/Channels/updateAutoResponseSetting", ChannelControllers.updateAutoResponseSetting);

router.post("/Security/getSettings", SecuritySettingControllers.getSecuritySettings);
router.post("/Security/updateSettings", SecuritySettingControllers.updateSecuritySettings);
router.post("/Security/getMyIp", SecuritySettingControllers.getMyIp);

router.post("/Channels/getKeywordTriggers", ChannelControllers.getKeywordTriggers);
router.post("/Channels/createKeywordTrigger", ChannelControllers.createKeywordTrigger);
router.post("/Channels/updateKeywordTrigger", ChannelControllers.updateKeywordTrigger);
router.post("/Channels/deleteKeywordTrigger", ChannelControllers.deleteKeywordTrigger);

router.post("/Team/getTeamRoster", TeamControllers.getTeamRoster);

router.post("/Attendance/getTodayForEmployee", AttendanceControllers.getTodayForEmployee);
router.post("/Attendance/getAllToday", AttendanceControllers.getAllToday);
router.post("/Attendance/checkIn", AttendanceControllers.checkIn);
router.post("/Attendance/checkOut", AttendanceControllers.checkOut);
router.post("/Attendance/startBreak", AttendanceControllers.startBreak);
router.post("/Attendance/endBreak", AttendanceControllers.endBreak);
router.post("/Attendance/getHistory", AttendanceControllers.getHistory);

router.post("/WhatsApp/getThreads", WhatsAppController.getThreads);
router.post("/WhatsApp/getThreadMessages", WhatsAppController.getThreadMessages);
router.post("/WhatsApp/sendMessage", WhatsAppController.sendMessage);

router.post("/CallLogs/getIvrCallLogs", CallLogControllers.fetchIvrCallLogs);
router.post("/CallLogs/getCallOutcome", CallLogControllers.getCallOutcome);
router.post("/CallLogs/saveCallOutcome", CallLogControllers.saveCallOutcome);

router.post("/WhatsAppFlow/getFlows", WhatsAppFlowControllers.getFlows);
router.post("/WhatsAppFlow/getFlow", WhatsAppFlowControllers.getFlow);
router.post("/WhatsAppFlow/createFlow", WhatsAppFlowControllers.createFlow);
router.post("/WhatsAppFlow/saveFlow", WhatsAppFlowControllers.saveFlow);
router.post("/WhatsAppFlow/deleteFlow", WhatsAppFlowControllers.deleteFlow);

router.post("/Sequence/getSequences", SequenceControllers.getSequences);
router.post("/Sequence/createSequence", SequenceControllers.createSequence);
router.post("/Sequence/saveSequence", SequenceControllers.saveSequence);
router.post("/Sequence/deleteSequence", SequenceControllers.deleteSequence);

router.post("/LeadDistribution/getSettings", LeadDistributionControllers.getSettings);
router.post("/LeadDistribution/updateEnabled", LeadDistributionControllers.updateEnabled);
router.post("/LeadDistribution/addToRotation", LeadDistributionControllers.addToRotation);
router.post("/LeadDistribution/removeFromRotation", LeadDistributionControllers.removeFromRotation);
router.post("/LeadDistribution/moveInRotation", LeadDistributionControllers.moveInRotation);
router.post("/LeadDistribution/getEligibleEmployees", LeadDistributionControllers.getEligibleEmployees);

//MenuControllers
router.post("/Menu/createMenu", MenuControllers.createMenu);
//  router.post('/Menu/insertManyMenus', MenuControllers.InsertMany)
router.post("/Menu/updateMenu", MenuControllers.updateMenu);
router.post("/Menu/getAllMenus", MenuControllers.getAllMenus);
router.post("/Menu/deleteMenu", MenuControllers.deleteMenu);
router.post("/Menu/getAllParentsMenu", MenuControllers.getAllParentsMenu);
router.post("/Menu/getFormattedMenu", MenuControllers.getFormattedMenu);

router.post(
  "/UserRights/getUserRightsByEmployeeId",
  UserRightsControllers.getUserRightsByEmployee
);
router.post(
  "/UserRights/getAllUserRights",
  UserRightsControllers.getAllUserRights
);
router.post(
  "/UserRights/createUserRights",
  UserRightsControllers.createUserRights
);
router.post(
  "/UserRights/updateUserRights",
  UserRightsControllers.updateUserRights
);
router.post("/UserRights/getAllMenus", UserRightsControllers.getAllMenus);
router.post(
  "/UserRights/getAllEmployees",
  UserRightsControllers.getAllEmployees
);

router.post("/Visitor/getAllVisitor", VisitorControllers.getAllVisitors);
router.post("/Visitor/createVisitor", VisitorControllers.createVisitor);
router.post("/Visitor/updateVisitor", VisitorControllers.updateVisitor);
router.post("/Visitor/getAllPlots", VisitorControllers.getAllPlots);
router.post("/Visitor/getAllStatus", VisitorControllers.getAllStatus);
router.post("/Visitor/getAllEmployees", VisitorControllers.getAllEmployees);
router.post("/Visitor/addFollowUp", VisitorControllers.addFollowUp);
router.post("/Visitor/updateFollowUp", VisitorControllers.updateFollowUp);
router.post(
  "/Visitor/getVisitorFollowUps",
  VisitorControllers.getVisitorFollowUps
);
router.post("/Visitor/addPlotToVisitor", VisitorControllers.addPlotToVisitor);
router.post("/Visitor/updateVisitorPlot", VisitorControllers.updateVisitorPlot);
router.post("/Visitor/getVisitorPlots", VisitorControllers.getVisitorPlots);
router.post("/Visitor/deleteVisitor", VisitorControllers.deleteVisitor);

router.post("/Plot/getAllPlots", PlotControllers.getAllPlots);
router.post("/Plot/createPlot", PlotControllers.createPlot);
router.post("/Plot/updatePlot", PlotControllers.updatePlot);
router.post("/Plot/deletePlots", PlotControllers.deletePlot);
router.post("/Plot/getAllStatus", PlotControllers.getAllStatus);
router.post("/Plot/getAllUnits", PlotControllers.getAllUnits);
router.post("/Plot/getAllVisitors", PlotControllers.getAllVisitors);
router.post("/Plot/updatePlotStatus", PlotControllers.updatePlotStatus);

// router.post('/DashBoardStats', DashBoardStats.getDashboardStats)
router.post(
  "/getPendingFollowUps",
  VisitorControllers.getPendingFollowUpsByEmployee
);
router.post(
  "/getCompletedFollowUps",
  VisitorControllers.getCompletedFollowUpsByEmployee
);

router.post("/transferFollowUps", VisitorControllers.transferFollowUps);

//DashboardControllers
router.post("/DashBoard/getAllDashBoard", DashboardControllers.getAllDashBoard);
router.post(
  "/DashBoard/getDayWiseAnsweredCalls",
  DashboardControllers.getDayWiseAnsweredCalls
); //for forntend bychartgetLeadsBySource
router.post(
  "/DashBoard/getLeadsBySource",
  DashboardControllers.getLeadsBySource
); //getLeadsBySource
router.post("/DashBoard/getCallStatusReport",DashboardControllers.getCallStatusReport);
router.post("/DashBoard/getLeadFollowup",DashboardControllers.getLeadFollowup);
router.post("/DashBoard/getVisitorFollowup",DashboardControllers.getVisitorFollowup);
router.post("/DashBoard/getSiteVisitAgenda",DashboardControllers.getSiteVisitAgenda);
router.post("/DashBoard/getPipelineOverviewStats",DashboardControllers.getPipelineOverviewStats);

router.post("/Lead/getAllLeads", LeadControllers.getAllLeads);
router.post("/Lead/bulkImportLeads", LeadControllers.bulkImportLeads);
router.post(
  "/Lead/createLead",
  upload.array("leadFiles", 5),
  LeadControllers.createLead
);
router.post(
  "/Lead/updateLead",
  upload.array("leadFiles", 5),
  LeadControllers.updateLead
);
router.post("/Lead/assignLead", LeadControllers.assignLead);
router.post("/Lead/deleteLeads", LeadControllers.deleteLead);
router.post("/Lead/getLeadById", LeadControllers.getLeadById);
router.post("/Lead/addLeadNote", LeadControllers.addLeadNote);
router.post(
  "/Lead/addLeadDocument",
  upload.single("leadFile"),
  LeadControllers.addLeadDocument
);
router.post("/Lead/getLeadNameByNumber",LeadControllers.getLeadNameByNumber)
router.post("/Lead/indiamart-webhook", LeadControllers.indiamartWebhook);
router.post("/Lead/justdial-webhook", LeadControllers.justdialWebhook);


//ReportControllers
// router.post("/Report/getAllReport",ReportControllers.getAllReport)
// router.post("/Report/AgentSummary",ReportControllers.AgentSummary)
// router.post("/Report/AgentProgress",ReportControllers.AgentProgress)
router.post("/Report/leadSourceSummary",ReportControllers.leadSourceSummary)
router.post("/Report/getMonthlyPerformance",ReportControllers.getMonthlyPerformance)
router.post("/Report/SiteDistribution",ReportControllers.siteDistribution)
// router.post("/Report/WeeklyLeadVelocity",ReportControllers.WeeklyLeadVelocity)
router.post("/Report/getAllAvailablePlots",ReportControllers.getAllAvailablePlots)
router.post("/Report/getCallSummary",ReportControllers.getCallSummary)
router.post("/Report/getLeadReports",ReportControllers.getLeadReports)
router.post("/Report/getVisitorReports",ReportControllers.getVisitorReports)

//BackupControllers
router.post("/Backup/runBackup", BackupControllers.runBackup)
router.post("/Backup/listBackups", BackupControllers.listBackups)
router.post("/Backup/restoreBackup", BackupControllers.restoreBackup)

//PaymentControllers
router.post("/Payment/createPlan", PaymentControllers.createPaymentPlan)
router.post("/Payment/getAllPlans", PaymentControllers.getAllPaymentPlans)
router.post("/Payment/getPlanByPlot", PaymentControllers.getPaymentPlanByPlot)
router.post("/Payment/getPlanById", PaymentControllers.getPaymentPlanById)
router.post("/Payment/recordPayment", PaymentControllers.recordPayment)
router.post("/Payment/getPlanTransactions", PaymentControllers.getPlanTransactions)
router.post("/Payment/deletePlan", PaymentControllers.deletePaymentPlan)

//DealControllers
router.post("/Deal/createDeal", DealControllers.createDeal)
router.post("/Deal/getAllDeals", DealControllers.getAllDeals)
router.post("/Deal/updateDeal", DealControllers.updateDeal)
router.post("/Deal/updateDealStage", DealControllers.updateDealStage)
router.post("/Deal/deleteDeal", DealControllers.deleteDeal)
router.post("/Deal/getQuotation", DealControllers.getQuotation)
router.post("/Deal/saveQuotation", DealControllers.saveQuotation)
router.post("/Deal/getDealDocuments", DealControllers.getDealDocuments)
router.post("/Deal/addDealDocument", upload.single("dealFile"), DealControllers.addDealDocument)
router.post("/Deal/deleteDealDocument", DealControllers.deleteDealDocument)

//EmailControllers
router.post("/Email/sendEmail", EmailControllers.sendEmail)
router.post("/Email/getEmailHistory", EmailControllers.getEmailHistory)

router.post("/Meeting/getAllMeetings", MeetingControllers.getAllMeetings)
router.post("/Meeting/createMeeting", MeetingControllers.createMeeting)
router.post("/Meeting/updateAttendeeRsvp", MeetingControllers.updateAttendeeRsvp)
router.post("/Meeting/updateReminder", MeetingControllers.updateReminder)
router.post("/Meeting/cancelMeeting", MeetingControllers.cancelMeeting)

module.exports = router;
