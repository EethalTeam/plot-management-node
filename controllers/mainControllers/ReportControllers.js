const mongoose = require("mongoose");
const Lead = require("../../models/masterModels/Leads");
const Employee = require('../../models/masterModels/Employee')
const LeadSource = require('../../models/masterModels/LeadSource')
const Site = require('../../models/masterModels/Site')
const Visitor = require('../../models/masterModels/Visitor')
const Plot  = require('../../models/masterModels/Plot')
const Status = require("../../models/masterModels/Status");
const TelecmiLog = require("../../models/masterModels/TeleCMICallLog");


// exports.getAllReport = async(req,res) => {
//     try {
//         const lead = await Lead.find({})
//     const filter = {
//          lead: lead.length,
//     }
//     if(!filter){
//         res.status(400).json({message: "Error from backend getAllReport " })
//     }
//       res.status(200).json({
//         success:true,
//         data:filter
//       });
//     } catch (error) {
//          res.status(500).json({ message: error.message });
//     }
// }



const getDateFilter = (fromDate, toDate) => {
  if (!fromDate || !toDate) return {};
  return {
    createdAt: {
      $gte: new Date(fromDate),
      $lte: new Date(toDate)
    }
  };
};


const buildReportMatch = ({ fromDate, toDate, siteId, EmployeeId }) => {
  let match = {};

  // Date filter
  if (fromDate && toDate) {
    match.createdAt = {
      $gte: new Date(fromDate),
      $lte: new Date(toDate),
    };
  }

  // Site filter
  if (siteId && siteId !== "All") {
    match.leadSiteId = new mongoose.Types.ObjectId(siteId);
  }

  // Staff filter
  if (EmployeeId && EmployeeId !== "All") {
    match.leadAssignedId = new mongoose.Types.ObjectId(EmployeeId);
  }

  return match;
};


exports.getAllReport = async (req, res) => {
  try {
    const match = buildReportMatch(req.body);

    // TOTAL LEADS
    const totalLeads = await Lead.countDocuments(match);

    // FOLLOW UP
    const followUpCount = await Lead.countDocuments({
      ...match,
      status: "Follow Up"
    });

    // SITE VISIT
    const siteVisitCount = await Lead.countDocuments({
      ...match,
      status: "Site Visit"
    });

    // VISIT COMPLETED
    const visitCompletedCount = await Visitor.countDocuments({
      ...match,
      status: { $in: ["Visit Completed", "Converted"] }
    });

    // CONVERSION RATE
    const conversionRate =
      totalLeads > 0
        ? ((visitCompletedCount / totalLeads) * 100).toFixed(1)
        : 0;

    // TOP SOURCE
    const topSourceAgg = await Lead.aggregate([
      { $match: match },
      { $group: { _id: "$leadSourceId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "leadsources",
          localField: "_id",
          foreignField: "_id",
          as: "source"
        }
      },
      { $unwind: "$source" },
      { $project: { _id: 0, name: "$source.leadSourceName" } }
    ]);

    // TOP SITE
    const topSiteAgg = await Lead.aggregate([
      { $match: match },
      { $group: { _id: "$siteId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "sites",
          localField: "_id",
          foreignField: "_id",
          as: "site"
        }
      },
      { $unwind: "$site" },
      { $project: { _id: 0, name: "$site.sitename" } }
    ]);

    // // PLOT AVAILABLE (from Site collection)
    // const plotAvailableCount = await Plot.countDocuments({
    //   ...(match.siteId ? { _id: match.siteId } : {}),
    //   plotStatus: "Available"
    // });

    // 1️ Get "Available" status ID
const availableStatus = await Status.findOne({
  statusName: "Available"
}).select("_id");

// 2️ Build plot filter
let plotFilter = {
  isActive: true
};

if (availableStatus) {
  plotFilter.statusId = availableStatus._id;
}

if (match.siteId) {
  plotFilter.siteId = match.siteId;
}

// 3️ Count available plots
const plotAvailableCount = await Plot.countDocuments(plotFilter);

    res.status(200).json({
      success: true,
      data: {
        totalLeads,
        followUpCount,
        siteVisitCount,
        visitCompletedCount,
        plotAvailableCount,
        conversionRate,
        topSource: topSourceAgg[0]?.name || "N/A",
        topSite: topSiteAgg[0]?.name || "N/A"
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




exports.AgentSummary = async (req, res) => {
  try {
    const match = buildReportMatch(req.body);

    const data = await Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$assignedTo",
          leads: { $sum: 1 },
          converted: {
            $sum: { $cond: [{ $eq: ["$status", "Site Visit"] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "agent"
        }
      },
      { $unwind: "$agent" },
      {
        $project: {
          _id: 0,
          name: "$agent.EmployeeName",
          leads: 1,
          converted: 1
        }
      }
    ]);

    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


const getMonthRange = (monthYear) => {
  const [month, year] = monthYear.split(" ");
  const start = new Date(`${month} 1, ${year}`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
};

// exports.AgentProgress = async (req, res) => {
//   try {
//     const { agent,  fromDate, toDate ,siteId} = req.body;

//     const employee = await Employee.findOne({ EmployeeName: agent });
//     if (!employee) {
//       return res.status(404).json({ message: "Agent not found" });
//     }

//     const start = new Date(fromDate);
//     const end = new Date(toDate);

//     const progress = await Lead.aggregate([
//       {
//         $match: {
//           assignedTo: new mongoose.Types.ObjectId(employee._id),
//           createdAt:
//            {  $gte: new Date(fromDate),
//             $lte: new Date(toDate) }
//         }
//       },
//       {
//         $group: {
//           _id: { $week: "$createdAt" },
//           leads: { $sum: 1 },
//           converted: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "Converted"] }, 1, 0]
//             }
//           }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           week: "$_id",
//           leads: 1,
//           converted: 1
//         }
//       },
//       { $sort: { week: 1 } }
//     ]);

//     // Format for frontend
//     const formatted = progress.map((w, i) => ({
//       name: `Week ${i + 1}`,
//       leads: w.leads,
//       converted: w.converted
//     }));

//     return res.status(200).json({
//       success: true,
//       data: formatted
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


exports.AgentProgress = async (req, res) => {
  try {
    const { EmployeeId, fromDate, toDate, SiteId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(EmployeeId)) {
      return res.json({ success: true, data: [] });
    }

    const match = {
      assignedTo: new mongoose.Types.ObjectId(EmployeeId),
      createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) }
    };

    if (SiteId && mongoose.Types.ObjectId.isValid(SiteId)) {
      match.SiteId = new mongoose.Types.ObjectId(SiteId);
    }

    const data = await Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $week: "$createdAt" },
          leads: { $sum: 1 },
          converted: {
            $sum: { $cond: [{ $eq: ["$status", "Site Visit"] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({
      success: true,
      data: data.map((d, i) => ({
        name: `Week ${i + 1}`,
        leads: d.leads,
        converted: d.converted
      }))
    });

  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};



exports.leadSourceSummary = async (req, res) => {
  try {
     const { fromDate, toDate } = req.body;
    // const dateFilter = getDateFilter(fromDate, toDate);
 const match = buildReportMatch(req.body);
// console.log(match,"match")

    const data = await Lead.aggregate([
        { $match: match },
      {
        $group: {
          _id: "$leadSourceId",
          value: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "leadsources",          // collection name
          localField: "_id",
          foreignField: "_id",
          as: "source"
        }
      },
      { $unwind: "$source" },
      {
        $project: {
          _id: 0,
          name: "$source.leadSourceName",
          value: 1
        }
      },
      { $sort: { value: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.siteDistribution = async (req, res) => {
  try {
    //  const { fromDate, toDate } = req.body;
    // const dateFilter = getDateFilter(fromDate, toDate);

     const match = buildReportMatch(req.body);
console.log(match,"match")
    const data = await Lead.aggregate([
        { $match: match },
      {
        $group: {
          _id: "$leadSiteId",
          value: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "sites",
          localField: "_id",
          foreignField: "_id",
          as: "site"
        }
      },
      { $unwind: "$site" },
      {
        $project: {
          _id: 0,
          name: "$site.sitename",
          value: 1
        }
      },
      { $sort: { value: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.WeeklyLeadVelocity = async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;

    const start = new Date(fromDate);
    const end = new Date(toDate);

    const data = await Lead.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: { $week: "$createdAt" },
          leads: { $sum: 1 },
          sales: {
            $sum: {
              $cond: [{ $eq: ["$status", "Site Visit"] }, 1, 0]
            }
          }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Format for Recharts
    const formatted = data.map((item, index) => ({
      name: `Week ${index + 1}`,
      leads: item.leads,
      sales: item.sales
    }));

    return res.status(200).json({
      success: true,
      data: formatted
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


//  exports.getAllAvailablePlots = async (req, res) => {
//   try {
//     const { unitId, siteId } = req.body;

//     // 1️ Get "Available" status ID
//     const availableStatus = await Status.findOne({
//       statusName: "Available"
//     }).select("_id");

//     if (!availableStatus) {
//       return res.json({ success: true, data: [] });
//     }

//     // 2️ Build filter
//     let filter = {
//       statusId: availableStatus._id,
//       isActive: true
//     };

//     if (unitId) filter.unitId = unitId;
//     if (siteId) filter.siteId = siteId;

//     // 3️ Fetch plots
//     const plots = await Plot.find(filter)
//       .populate("siteId", "sitename location")
//       .populate("unitId", "UnitName UnitCode")
//       .populate("statusId", "statusName colorCode")
//       .collation({ locale: "en", numericOrdering: true })
//       .sort({ plotNumber: 1 });

//     res.status(200).json({
//       success: true,
//       data: plots
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

exports.getAllAvailablePlots = async (req, res) => {
  try {
    const { unitId, siteId } = req.body;

    let filter = { isActive: true };

    if (unitId) filter.unitId = unitId;
    if (siteId) filter.siteId = siteId;

    const plots = await Plot.find(filter)
      .populate("siteId", "sitename location")
      .populate("unitId", "UnitName UnitCode")
      .populate("statusId", "statusName colorCode")
      .collation({ locale: "en", numericOrdering: true })
      .sort({ plotNumber: 1 });

    res.status(200).json({
      success: true,
      data: plots
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// exports.getCallSummary = async (req, res) => {
//   try {
//     const { fromDate, toDate ,SiteId,EmployeeId} = req.body;

//     let match = {};

//     // DATE FILTER
//     if (fromDate && toDate) {
//       match.callDate = {
//         $gte: new Date(fromDate),
//         $lte: new Date(toDate)
//       };
//     }

//      if (SiteId && mongoose.Types.ObjectId.isValid(SiteId)) {
//       match.SiteId = new mongoose.Types.ObjectId(SiteId);
//     }

//     //  EMPLOYEE FILTER (apply only if selected) 
//     if (
//       EmployeeId &&
//       EmployeeId !== "All Agents" &&
//       mongoose.Types.ObjectId.isValid(EmployeeId)
//     ) {
//       match.EmployeeId = new mongoose.Types.ObjectId(EmployeeId);
//       //  change field name if schema uses something else
//     }

//     // console.log(match,"matchcheck")

//     // AGGREGATION
//     const summary = await TelecmiLog.aggregate([
//       { $match: match },
//       {
//         $group: {
//           _id: null,

//           totalCalls: { $sum: 1 },

//           answeredCalls: {
//             $sum: {
//               $cond: [{ $gt: ["$answeredsec", 0] }, 1, 0]
//             }
//           },

//           missedCalls: {
//             $sum: {
//               $cond: [{ $eq: ["$answeredsec", 0] }, 1, 0]
//             }
//           }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           totalCalls: 1,
//           answeredCalls: 1,
//           missedCalls: 1
//         }
//       }
//     ]);

//     return res.status(200).json({
//       success: true,
//       data: summary[0] || {
//         totalCalls: 0,
//         answeredCalls: 0,
//         missedCalls: 0
//       }
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };




exports.getCallSummary = async (req, res) => {
  try {
     const {  EmployeeId,fromDate, toDate } = req.body;

        let matchStage = {};
         if (EmployeeId) {
      const emp = await Employee.findById(EmployeeId).select("TelecmiID");
      if (emp?.TelecmiID) {
        matchStage.user = emp.TelecmiID; //  THIS IS THE KEY
      }
    }

        if (fromDate || toDate) {
            matchStage.createdAt = {};
            if (fromDate) matchStage.createdAt.$gte = new Date(new Date(fromDate).setHours(0, 0, 0, 0));
            if (toDate) matchStage.createdAt.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
        }

    const summary = await TelecmiLog.aggregate([
      { $match: matchStage },

      {
        $group: {
          _id: null,

          totalCalls: { $sum: 1 },

          answeredCalls: {
            $sum: {
              $cond: [{ $eq: ["$status", "answered"] }, 1, 0]
            }
          },

          missedCalls: {
            $sum: {
              $cond: [{ $eq: ["$status", "missed"] }, 1, 0]
            }
          },

          avgAnsweredDuration: {
            $avg: {
              $cond: [
                { $eq: ["$status", "answered"] },
                "$answeredsec",
                null
              ]
            }
          },

          avgMissedWaitTime: {
            $avg: {
              $cond: [
                { $eq: ["$status", "missed"] },
                "$waitedsec",
                null
              ]
            }
          }
        }
      }
    ]);

    const data = summary[0] || {
      totalCalls: 0,
      answeredCalls: 0,
      missedCalls: 0,
      avgAnsweredDuration: 0,
      avgMissedWaitTime: 0
    };

    res.status(200).json({
      success: true,
      data: {
        totalCalls: data.totalCalls,
        answeredCalls: data.answeredCalls,
        missedCalls: data.missedCalls,
        avgAnsweredDuration: Math.round(data.avgAnsweredDuration || 0),
        avgMissedWaitTime: Math.round(data.avgMissedWaitTime || 0)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getLeadReports = async (req, res) => {
    try {
        const { siteId, EmployeeId, fromDate, toDate } = req.body;

        let matchStage = {};
        if (siteId) matchStage.leadSiteId = new mongoose.Types.ObjectId(siteId);
        if (EmployeeId) {
            matchStage.$or = [
                { leadAssignedId: new mongoose.Types.ObjectId(EmployeeId) },
                { leadCreatedById: new mongoose.Types.ObjectId(EmployeeId) }
            ];
        }

        if (fromDate || toDate) {
            matchStage.createdAt = {};
            if (fromDate) matchStage.createdAt.$gte = new Date(new Date(fromDate).setHours(0, 0, 0, 0));
            if (toDate) matchStage.createdAt.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
        }

        const reports = await Lead.aggregate([
            { $match: matchStage },

            // Lookups for Names
            { $lookup: { from: 'leadstatuses', localField: 'leadStatusId', foreignField: '_id', as: 'statusDoc' } },
            { $lookup: { from: 'leadsources', localField: 'leadSourceId', foreignField: '_id', as: 'sourceDoc' } },
            { $lookup: { from: 'sites', localField: 'leadSiteId', foreignField: '_id', as: 'siteDoc' } },
            { $lookup: { from: 'employees', localField: 'leadAssignedId', foreignField: '_id', as: 'agentDoc' } },

            { $unwind: { path: '$statusDoc', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$sourceDoc', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$siteDoc', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$agentDoc', preserveNullAndEmptyArrays: true } },

            {
                $facet: {
                    // Summary Metrics including Follow Up and Site Visit counts
                    "counters": [
                        {
                            $group: {
                                _id: null,
                                totalLeads: { $sum: 1 },
                                followUpCount: {
                                    $sum: { $cond: [{ $eq: ["$statusDoc.leadStatustName", "Follow Up"] }, 1, 0] }
                                },
                                siteVisitCount: {
                                    $sum: { $cond: [{ $eq: ["$statusDoc.leadStatustName", "Site Visit"] }, 1, 0] }
                                },
                                 newCount: {
                                    $sum: { $cond: [{ $eq: ["$statusDoc.leadStatustName", "New"] }, 1, 0] }
                                }
                            }
                        }
                    ],

                    "topSources": [
                        { $group: { _id: "$sourceDoc.leadSourceName", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],

                    "topSites": [
                        { $group: { _id: "$siteDoc.sitename", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],

                    "agentPerformance": [
                        {
                            $group: {
                                _id: { 
                                    name: { $concat: ["$agentDoc.EmployeeName"] } 
                                },
                                totalAssigned: { $sum: 1 },
                                agentSiteVisits: {
                                    $sum: { $cond: [{ $eq: ["$statusDoc.leadStatustName", "Site Visit"] }, 1, 0] }
                                }
                            }
                        },
                        { $project: { _id: 0, agentName: "$_id.name", totalAssigned: 1, agentSiteVisits: 1 } }
                    ],

                    "weeklyVelocity": [
                        {
                            $group: {
                                _id: { $week: "$createdAt" },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { "_id": 1 } }
                    ]
                }
            }
        ]);

        const reportData = reports[0];
        const counters = reportData.counters[0] || { totalLeads: 0, followUpCount: 0, siteVisitCount: 0 ,newCount:0};
        
        // Calculate Conversion Rate (Site Visits / Total Leads)
        const conversionRate = counters.totalLeads > 0 
            ? ((counters.siteVisitCount / counters.totalLeads) * 100).toFixed(2) + "%" 
            : "0%";

        res.status(200).json({
            success: true,
            summary: {
                totalLeads: counters.totalLeads,
                followUpCount: counters.followUpCount,
                siteVisitCount: counters.siteVisitCount,
                newCount: counters.newCount,
                conversionRate: conversionRate
            },
            topSources: reportData.topSources,
            topSites: reportData.topSites,
            agentPerformance: reportData.agentPerformance,
            weeklyVelocity: reportData.weeklyVelocity
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getVisitorReports = async (req, res) => {
    try {
        const { siteId, EmployeeId, fromDate, toDate } = req.body;

        let matchStage = {};

        // 1. Filter by Employee
        if (EmployeeId) {
            matchStage.employeeId = new mongoose.Types.ObjectId(EmployeeId);
        }

        // 2. Filter by Site/Plot (Assuming siteId relates to the plots array)
        if (siteId) {
            matchStage["plots.plotId"] = new mongoose.Types.ObjectId(siteId);
        }

        // 3. Filter by Date Range (createdAt)
        if (fromDate || toDate) {
            matchStage.createdAt = {};
            if (fromDate) matchStage.createdAt.$gte = new Date(new Date(fromDate).setHours(0, 0, 0, 0));
            if (toDate) matchStage.createdAt.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
        }

        const stats = await Visitor.aggregate([
            { $match: matchStage },
            {
                $facet: {
                    "totalVisitors": [{ $count: "count" }],
                    
                    // Filter visitors who have "Visit Completed" in their followUps array
                    "completedVisits": [
                        { 
                            $match: { 
                                "followUps.followUpStatus": "Visit Completed" 
                            } 
                        },
                        { $count: "count" }
                    ],

                    // Visit Status Breakdown (To see both Completed and Not Yet)
                    "statusBreakdown": [
                        { $unwind: "$followUps" },
                        {
                            $group: {
                                _id: "$followUps.followUpStatus",
                                count: { $sum: 1 }
                            }
                        }
                    ],

                    // Agent-wise Visit Performance
                    "agentVisitStats": [
                        { $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'emp' } },
                        { $unwind: { path: "$emp", preserveNullAndEmptyArrays: true } },
                        {
                            $group: {
                                _id: { $concat: ["$emp.EmployeeName"]  },
                                totalAssigned: { $sum: 1 },
                                completed: {
                                    $sum: {
                                        $cond: [{ $in: ["Visit Completed", "$followUps.followUpStatus"] }, 1, 0]
                                    }
                                }
                            }
                        },
                        { $project: { agentName: "$_id", totalAssigned: 1, completed: 1, _id: 0 } }
                    ]
                }
            }
        ]);

        const result = stats[0];
        const total = result.totalVisitors[0]?.count || 0;
        const completed = result.completedVisits[0]?.count || 0;

        res.status(200).json({
            success: true,
            summary: {
                totalVisitors: total,
                visitCompletedCount: completed,
                visitPendingCount: total - completed,
                completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) + "%" : "0%"
            },
            agentPerformance: result.agentVisitStats,
            detailedBreakdown: result.statusBreakdown
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};