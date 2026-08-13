const express = require("express");
const router = express.Router();
const cacheMiddleware = require("../middlewares/cacheMiddleware");

const EmployeeController = require("../controllers/masterControllers/EmployeeControllers");
const LoginController = require("../controllers/masterControllers/LoginControllers");
const NotificationController = require("../controllers/masterControllers/NotificationControllers");
const StatusController = require("../controllers/masterControllers/StatusControllers");
const UnitController = require("../controllers/masterControllers/UnitControllers");
const SiteController = require("../controllers/masterControllers/SiteControllers");
const StateController = require("../controllers/masterControllers/StateControllers");
const CityController = require("../controllers/masterControllers/CityControllers");
const CountryController = require("../controllers/masterControllers/CountryControllers");
const RoleController = require("../controllers/masterControllers/RoleControllers");
const RBACController = require("../controllers/masterControllers/RBACControllers");
const CallLogController = require("../controllers/masterControllers/callLogControllers");
const DocumentControllers = require("../controllers/masterControllers/DocumentControllers");
const LeadStatusControllers = require("../controllers/masterControllers/LeadStatusControllers");
const LeadSourceControllers = require("../controllers/masterControllers/LeadSourceControllers");
const CompanyControllers = require("../controllers/masterControllers/CompanyControllers");
const VisitorVerientControllers = require("../controllers/masterControllers/VisitorVerientControllers");
const MASTER_CACHE_TTL_SECONDS = 36000;
const employeeCacheKeys = ["app:master:employees", "app:master:agents"];
const statusCacheKeys = ["app:master:statuses"];
const unitCacheKeys = ["app:master:units:*"];
const siteCacheKeys = ["app:master:sites:*"];
const stateCacheKeys = ["app:master:states:*", "app:master:city:states", "app:master:country:states"];
const cityCacheKeys = ["app:master:cities:*"];
const countryCacheKeys = ["app:master:countries", "app:master:state:countries"];
const roleBasedCacheKeys = ["app:master:roles", "app:master:menus"];
const documentCacheKeys = ["app:master:documents"];
const leadStatusCacheKeys = ["app:master:lead-statuses"];
const leadSourceCacheKeys = ["app:master:lead-sources"];
const companyCacheKeys = ["app:master:companies"];
const visitorVariantCacheKeys = ["app:master:visitor-variants"];
const callLogCacheKeys = ["app:master:call-logs:*"];

//Notification

// router.post("/notifications", NotificationController.createNotification);
// router.post(
//   "/Notifications/getNotifications",
//   NotificationController.getNotificationsByUnit
// );

router.post("/Notifications/createNotifications", NotificationController.createNotification);
router.post("/Notifications/getNotifications", NotificationController.getNotificationsByEmployee);
router.post("/Notifications/updateNotificationStatus", NotificationController.updateNotificationStatus);
router.post("/Notifications/markAsSeen", NotificationController.markAsSeen);

router.post("/CallLogs/getAllCallLogs", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, cacheMiddleware.withBody("app:master:call-logs")), CallLogController.getCallLogs);
router.post("/CallLogs/Qualify", cacheMiddleware.invalidate(callLogCacheKeys), CallLogController.qualifyCallLog);

//********* Login ***************************** */
router.post("/Auth/login", LoginController.verifyLogin);

//********************Employee routers ********************** */

router.post("/Employee/createEmployee", cacheMiddleware.invalidate(employeeCacheKeys), EmployeeController.createEmployee);
router.post("/Employee/getAllEmployees", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:employees"), EmployeeController.getAllEmployees);
router.post("/Employee/getAllAgent", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:agents"), EmployeeController.getAllAgent)
router.post("/Employee/updateEmployee", cacheMiddleware.invalidate(employeeCacheKeys), EmployeeController.updateEmployee);
router.post("/Employee/deleteEmployee", cacheMiddleware.invalidate(employeeCacheKeys), EmployeeController.deleteEmployee);
// router.post('/exampleRole',EmployeeController.exampleRole)

//login Employee

router.post("/Employee/loginEmployee", EmployeeController.loginEmploye);
router.post("/Employee/logoutEmployee", EmployeeController.logoutEmployee);
router.post("/Employee/logoutUser", EmployeeController.logoutUser);
router.post("/Employee/checkLogin", EmployeeController.checkLogin);

//Status Routes
router.post("/Status/createStatus", cacheMiddleware.invalidate(statusCacheKeys), StatusController.createStatus);
router.post("/Status/deleteStatus", cacheMiddleware.invalidate(statusCacheKeys), StatusController.softDeleteStatus);
router.post("/Status/updateStatus", cacheMiddleware.invalidate(statusCacheKeys), StatusController.updateStatus);
router.post("/Status/getAllStatus", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:statuses"), StatusController.getAllStatus);

//Unit Routes
router.post("/Unit/createUnit", cacheMiddleware.invalidate(unitCacheKeys), UnitController.createUnit);
router.post("/Unit/deleteUnit", cacheMiddleware.invalidate(unitCacheKeys), UnitController.deleteUnit);
router.post("/Unit/updateUnit", cacheMiddleware.invalidate(unitCacheKeys), UnitController.updateUnit);
router.post("/Unit/getAllUnits", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, cacheMiddleware.withBody("app:master:units")), UnitController.getAllUnits);

//Site Routes
router.post("/Site/createSite", cacheMiddleware.invalidate(siteCacheKeys), SiteController.createSite);
router.post("/Site/deleteSite", cacheMiddleware.invalidate(siteCacheKeys), SiteController.deleteSite);
router.post("/Site/updateSite", cacheMiddleware.invalidate(siteCacheKeys), SiteController.updateSite);
router.post("/Site/getAllSites", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, cacheMiddleware.withBody("app:master:sites")), SiteController.getAllSites);

//State Routes
router.post("/State/createState", cacheMiddleware.invalidate(stateCacheKeys), StateController.createState);
router.post("/State/deleteState", cacheMiddleware.invalidate(stateCacheKeys), StateController.deleteState);
router.post("/State/updateState", cacheMiddleware.invalidate(stateCacheKeys), StateController.updateState);
router.post("/State/getAllStates", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, cacheMiddleware.withBody("app:master:states")), StateController.getAllStates);
router.post("/State/getAllCountry", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:state:countries"), StateController.getAllCountry);

//City Routes
router.post("/City/createCity", cacheMiddleware.invalidate(cityCacheKeys), CityController.createCity);
router.post("/City/deleteCity", cacheMiddleware.invalidate(cityCacheKeys), CityController.deleteCity);
router.post("/City/updateCity", cacheMiddleware.invalidate(cityCacheKeys), CityController.updateCity);
router.post("/City/getAllCitys", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, cacheMiddleware.withBody("app:master:cities")), CityController.getAllCitys);
router.post("/City/getAllStates", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:city:states"), CityController.getAllStates);

//CountryController
router.post("/Country/createCountry", cacheMiddleware.invalidate(countryCacheKeys), CountryController.createCountry);
router.post("/Country/getAllCountry", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:countries"), CountryController.getAllCountry);
router.post("/Country/getSingleCountry", CountryController.getCountryByName);
router.post("/Country/updateCountry", cacheMiddleware.invalidate(countryCacheKeys), CountryController.updateCountry);
router.post("/Country/deleteCountry", cacheMiddleware.invalidate(countryCacheKeys), CountryController.deleteCountry);
router.post("/Country/getAllStates", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:country:states"), CountryController.getAllStates);

// //Role Routes
// router.post('/Role/createRole', RoleController.createRole)
// router.post('/Role/deleteRole', RoleController.deleteRole)
// router.post('/Role/updateRole', RoleController.updateRole)
// router.post('/Role/getAllRoles', RoleController.getAllRoles)

//RBACControllers
router.post("/RoleBased/createRole", cacheMiddleware.invalidate(roleBasedCacheKeys), RBACController.createRole);
router.post("/RoleBased/deleteRole", cacheMiddleware.invalidate(roleBasedCacheKeys), RBACController.deleteRole);
router.post("/RoleBased/updateRole", cacheMiddleware.invalidate(roleBasedCacheKeys), RBACController.updateRole);
router.post("/RoleBased/getAllRoles", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:roles"), RBACController.getAllRoles);
router.post("/RoleBased/getAllMenus", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:menus"), RBACController.getAllMenus);
router.post(
  "/RoleBased/updateMenusAndAccess",
  cacheMiddleware.invalidate(roleBasedCacheKeys),
  RBACController.updateMenusAndAccess
);
router.post(
  "/RoleBased/getPermissions",
  RBACController.getPermissionsByRoleAndPath
);

//DocumentControllers
router.post("/Document/createDocument", cacheMiddleware.invalidate(documentCacheKeys), DocumentControllers.createDocument);
router.post("/Document/getAllDocument", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:documents"), DocumentControllers.getAllDocument);
router.post(
  "/Document/getSingleDocument",
  DocumentControllers.getDocumentByName
);
router.post("/Document/updateDocument", cacheMiddleware.invalidate(documentCacheKeys), DocumentControllers.updateDocument);
router.post("/Document/deleteDocument", cacheMiddleware.invalidate(documentCacheKeys), DocumentControllers.deleteDocument);

//LeadStatusControllers
router.post(
  "/LeadStatus/createLeadStatus",
  cacheMiddleware.invalidate(leadStatusCacheKeys),
  LeadStatusControllers.createLeadStatus
);
router.post(
  "/LeadStatus/getAllLeadStatus",
  cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:lead-statuses"),
  LeadStatusControllers.getAllLeadStatus
);
router.post(
  "/LeadStatus/getSingleLeadStatus",
  LeadStatusControllers.getLeadStatusByName
);
router.post(
  "/LeadStatus/updateLeadStatus",
  cacheMiddleware.invalidate(leadStatusCacheKeys),
  LeadStatusControllers.updateLeadStatus
);
router.post(
  "/LeadStatus/deleteLeadStatus",
  cacheMiddleware.invalidate(leadStatusCacheKeys),
  LeadStatusControllers.deleteLeadStatus
);

//LeadSourceControllers

router.post(
  "/LeadSource/createLeadSource",
  cacheMiddleware.invalidate(leadSourceCacheKeys),
  LeadSourceControllers.createLeadSource
);
router.post(
  "/LeadSource/getAllLeadSource",
  cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:lead-sources"),
  LeadSourceControllers.getAllLeadSource
);
router.post(
  "/LeadSource/getSingleLeadSource",
  LeadSourceControllers.getLeadSourceByName
);
router.post(
  "/LeadSource/updateLeadSource",
  cacheMiddleware.invalidate(leadSourceCacheKeys),
  LeadSourceControllers.updateLeadSource
);
router.post(
  "/LeadSource/deleteLeadSource",
  cacheMiddleware.invalidate(leadSourceCacheKeys),
  LeadSourceControllers.deleteLeadSource
);

//CompanyControllers

router.post("/Company/createCompany", cacheMiddleware.invalidate(companyCacheKeys), CompanyControllers.createCompany);
router.post("/Company/getAllCompany", cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:companies"), CompanyControllers.getAllCompany);
router.post("/Company/getSingleCompany", CompanyControllers.getCompanyByName);
router.post("/Company/updateCompany", cacheMiddleware.invalidate(companyCacheKeys), CompanyControllers.updateCompany);
router.post("/Company/deleteCompany", cacheMiddleware.invalidate(companyCacheKeys), CompanyControllers.deleteCompany);

//VisitorVerientControllers
router.post(
  "/VisitorVerient/createVisitorVerient",
  cacheMiddleware.invalidate(visitorVariantCacheKeys),
  VisitorVerientControllers.createVisitorVerient
);
router.post(
  "/VisitorVerient/getAllVisitorVariant",
  cacheMiddleware(MASTER_CACHE_TTL_SECONDS, "app:master:visitor-variants"),
  VisitorVerientControllers.getAllVisitorVariant
);
router.post(
  "/VisitorVerient/getSingleVisitorVerient",
  VisitorVerientControllers.getVisitorVerientByName
);
router.post(
  "/VisitorVerient/updateVisitorVerient",
  cacheMiddleware.invalidate(visitorVariantCacheKeys),
  VisitorVerientControllers.updateVisitorVerient
);
router.post(
  "/VisitorVerient/deleteVisitorVerient",
  cacheMiddleware.invalidate(visitorVariantCacheKeys),
  VisitorVerientControllers.deleteVisitorVerient
);

module.exports = router;
