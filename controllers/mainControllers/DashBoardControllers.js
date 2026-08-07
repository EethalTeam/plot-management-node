const mongoose = require("mongoose");
const Lead = require("../../models/masterModels/Leads");
const Visitor = require('../../models/masterModels/Visitor')
const Callog = require("../../models/masterModels/TeleCMICallLog");
const PaymentPlan = require("../../models/masterModels/PaymentPlan");
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(timezone);

 
 
exports.getAllDashBoard = async (req, res) => {
  try {
    const { role, TelecmiID, EmployeeID, fromDate, toDate } = req.body;
    const indiaTz = "Asia/Kolkata";

    const start = fromDate 
      ? dayjs.tz(fromDate, indiaTz).startOf('day').toDate() 
      : dayjs().tz(indiaTz).startOf('day').toDate();

    const end = toDate 
      ? dayjs.tz(toDate, indiaTz).endOf('day').toDate() 
      : dayjs().tz(indiaTz).endOf('day').toDate();

    const callMatch = {
      answeredsec: { $gt: 0 },
      callDate: { $gte: start, $lte: end },
    };

    if (role === "AGENT") {
      if (!TelecmiID) return res.status(200).json({ lead: 0, callog: 0, calls: [] });
      callMatch.user = TelecmiID;
    }

    const leadMatch = {
      createdAt: { $gte: start, $lte: end },
    };

    if (role === "AGENT" && EmployeeID) {
      const empObjectId = new mongoose.Types.ObjectId(EmployeeID);
      leadMatch.$or = [
        { leadCreatedById: empObjectId },
        { leadAssignedId: empObjectId },
      ];
    }

    const [leadCount, callCount, callDetails] = await Promise.all([
      mongoose.model('Lead').countDocuments(leadMatch),
      mongoose.model('TelecmiLog').countDocuments(callMatch),
      mongoose.model('TelecmiLog')
        .find(callMatch)
        .select('callDate user answeredsec')
        .sort({ callDate: -1 })
    ]);

    const formattedCalls = callDetails.map(call => ({
      ...call._doc,
      timeIST: dayjs(call.callDate).tz(indiaTz).format('YYYY-MM-DD hh:mm:ss A')
    }));

    res.status(200).json({
      lead: leadCount,
      callog: callCount,
      calls: formattedCalls,
      debug: {
        message: "Range strictly locked to IST Midnight-to-Midnight.",
        queryRangeIST: {
          start: dayjs(start).tz(indiaTz).format('YYYY-MM-DD hh:mm:ss A'),
          end: dayjs(end).tz(indiaTz).format('YYYY-MM-DD hh:mm:ss A')
        },
        queryRangeUTC: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: error.message });
  }
};


// exports.getDayWiseAnsweredCalls = async (req, res) => {
//   try {
//     const { role, TelecmiID ,fromDate, toDate } = req.body;

//    const start = fromDate ? new Date(fromDate) : new Date();
//     const end = toDate ? new Date(toDate) : new Date();

//     start.setHours(0, 0, 0, 0);
//     end.setHours(23, 59, 59, 999);

//      const matchQuery = {
//       answeredsec: { $gt: 0 },
//       callDate: { $gte: start, $lte: end },
//     };

//     if (role === "AGENT") {
//       if (!TelecmiID) return res.status(200).json([]);
//       matchQuery.user = TelecmiID;
//     }

//     const logs = await Callog.aggregate([
//       { $match: matchQuery },
//       {
//         $group: {
//           _id: { $dayOfWeek: "$callDate" },
//           calls: { $sum: 1 },
//         },
//       },
//     ]);

//     const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

//     const result = days.map((day, index) => {
//       const found = logs.find((l) => l._id === index + 1);
//       return { day, calls: found ? found.calls : 0 };
//     });

//     res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



exports.getDayWiseAnsweredCalls = async (req, res) => {
  try {
    const { role, TelecmiID, fromDate, toDate } = req.body;
    const indiaTz = "Asia/Kolkata";

    const start = fromDate
      ? dayjs.tz(fromDate, indiaTz).startOf("day").toDate()
      : dayjs().tz(indiaTz).startOf("day").toDate();

    const end = toDate
      ? dayjs.tz(toDate, indiaTz).endOf("day").toDate()
      : dayjs().tz(indiaTz).endOf("day").toDate();

    const matchQuery = {
      answeredsec: { $gt: 0 },
      callDate: { $gte: start, $lte: end },
    };

    if (role === "AGENT") {
      if (!TelecmiID) return res.status(200).json([]);
      matchQuery.user = TelecmiID;
    }

    const logs = await Callog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dayOfWeek: "$callDate" },
          calls: { $sum: 1 },
        },
      },
    ]);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const result = days.map((day, index) => {
      const found = logs.find((l) => l._id === index + 1);
      return { day, calls: found ? found.calls : 0 };
    });

    res.status(200).json({
      result,
      debug: {
        message: "Range strictly locked to IST Midnight-to-Midnight.",
        queryRangeIST: {
          start: dayjs(start).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
          end: dayjs(end).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
        },
        queryRangeUTC: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// exports.getLeadsBySource = async (req, res) => {    //LeadSource byChart
//   try {
//     const data = await Lead.aggregate([
//        {
//         $lookup: {
//           from: "leadsources",          //  collection name
//           localField: "leadSourceId",   // field in Lead
//           foreignField: "_id",          //  field in LeadSource
//           as: "source"
//         }
//       },
//       { $unwind: "$source" },
//       {
//         $group: {
//           _id: "$source.leadSourceName", //  GROUP BY NAME
//           count: { $sum: 1 }
//         }
//       }
//     ]);

//     const total = data.reduce((sum, item) => sum + item.count, 0);

//     const result = data.map(item => ({
//       name: item._id,
//       value: Number(((item.count / total) * 100).toFixed(0)) // percentage
//     }));

//     res.status(200).json(result);

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getLeadsBySource = async (req, res) => {
//   try {
//     const { role, EmployeeId,fromDate, toDate  } = req.body;
//     console.log(req.body, "req.body");

//      const start = fromDate ? new Date(fromDate) : new Date();
//     const end = toDate ? new Date(toDate) : new Date();

//     start.setHours(0, 0, 0, 0);
//     end.setHours(23, 59, 59, 999);

//     const matchStage = {
//       createdAt: { $gte: start, $lte: end },
//     };

//     if (role === "AGENT") {
//       if (!EmployeeId) return res.status(200).json([]);
//       matchStage.$or = [
//             { leadCreatedById: new mongoose.Types.ObjectId(EmployeeId) },
//             { leadAssignedId: new mongoose.Types.ObjectId(EmployeeId) }
//           ]
//     }

//     const data = await Lead.aggregate([
//       { $match: matchStage },
//       {
//         $lookup: {
//           from: "leadsources",
//           localField: "leadSourceId",
//           foreignField: "_id",
//           as: "source",
//         },
//       },
//       { $unwind: "$source" },
//       {
//         $group: {
//           _id: "$source.leadSourceName",
//           count: { $sum: 1 },
//         },
//       },
//     ]);

//     const total = data.reduce((sum, item) => sum + item.count, 0);

//     const result = data.map((item) => ({
//       name: item._id,
//       value: total ? Number(((item.count / total) * 100).toFixed(0)) : 0,
//     }));

//     res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


exports.getLeadsBySource = async (req, res) => {
  try {
    const { role, EmployeeId, fromDate, toDate } = req.body;
    const indiaTz = "Asia/Kolkata";

    const start = fromDate
      ? dayjs.tz(fromDate, indiaTz).startOf("day").toDate()
      : dayjs().tz(indiaTz).startOf("day").toDate();

    const end = toDate
      ? dayjs.tz(toDate, indiaTz).endOf("day").toDate()
      : dayjs().tz(indiaTz).endOf("day").toDate();

    const matchStage = {
      createdAt: { $gte: start, $lte: end },
    };

    if (role === "AGENT") {
      if (!EmployeeId) return res.status(200).json([]);

      const empObjectId = new mongoose.Types.ObjectId(EmployeeId);

      matchStage.$or = [
        { leadCreatedById: empObjectId },
        { leadAssignedId: empObjectId },
      ];
    }

    const data = await Lead.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "leadsources",
          localField: "leadSourceId",
          foreignField: "_id",
          as: "source",
        },
      },
      { $unwind: "$source" },
      {
        $group: {
          _id: "$source.leadSourceName",
          count: { $sum: 1 },
        },
      },
    ]);

    const total = data.reduce((sum, item) => sum + item.count, 0);

    const result = data.map((item) => ({
      name: item._id,
      value: total
        ? Number(((item.count / total) * 100).toFixed(0))
        : 0,
    }));

    res.status(200).json({
      result,
      debug: {
        message: "Range strictly locked to IST Midnight-to-Midnight.",
        queryRangeIST: {
          start: dayjs(start).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
          end: dayjs(end).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
        },
        queryRangeUTC: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// exports.getCallStatusReport = async (req, res) => {
//   try {
//     const { TelecmiID, role ,fromDate, toDate } = req.body;

//     const start = fromDate ? new Date(fromDate) : new Date();
//     const end = toDate ? new Date(toDate) : new Date();

//     start.setHours(0, 0, 0, 0);
//     end.setHours(23, 59, 59, 999);

//     const matchQuery = {
//       callDate: { $gte: start, $lte: end },
//     };

//     //  If AGENT → restrict to own calls
//     if (role === "AGENT") {
//       if (!TelecmiID) {
//         return res.status(200).json([]);
//       }
//       matchQuery.user = TelecmiID;
//     }

//     // -------------------------
//     // AGGREGATION
//     // -------------------------
//     const report = await Callog.aggregate([
//       {
//         $match: matchQuery,
//       },
//       {
//         $project: {
//           statusType: {
//             $cond: [{ $gt: ["$answeredsec", 0] }, "Answered", "Missed"],
//           },
//         },
//       },
//       {
//         $group: {
//           _id: "$statusType",
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           name: "$_id",
//           value: "$count",
//         },
//       },
//     ]);

//     res.status(200).json(report);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



exports.getCallStatusReport = async (req, res) => {
  try {
    const { TelecmiID, role, fromDate, toDate } = req.body;
    const indiaTz = "Asia/Kolkata";

    const start = fromDate
      ? dayjs.tz(fromDate, indiaTz).startOf("day").toDate()
      : dayjs().tz(indiaTz).startOf("day").toDate();

    const end = toDate
      ? dayjs.tz(toDate, indiaTz).endOf("day").toDate()
      : dayjs().tz(indiaTz).endOf("day").toDate();

    const matchQuery = {
      callDate: { $gte: start, $lte: end },
    };

    // If AGENT → restrict to own calls
    if (role === "AGENT") {
      if (!TelecmiID) {
        return res.status(200).json([]);
      }
      matchQuery.user = TelecmiID;
    }

    const report = await Callog.aggregate([
      {
        $match: matchQuery,
      },
      {
        $project: {
          statusType: {
            $cond: [{ $gt: ["$answeredsec", 0] }, "Answered", "Missed"],
          },
        },
      },
      {
        $group: {
          _id: "$statusType",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          value: "$count",
        },
      },
    ]);

    res.status(200).json({
      report,
      debug: {
        message: "Range strictly locked to IST Midnight-to-Midnight.",
        queryRangeIST: {
          start: dayjs(start).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
          end: dayjs(end).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
        },
        queryRangeUTC: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// exports.getLeadFollowup = async (req, res) => {
//   try {
//     const { role, EmployeeId } = req.body;

//     const start = new Date();
//     start.setHours(0, 0, 0, 0);

//     const end = new Date(start);
//     end.setDate(start.getDate() + 3);
//     end.setHours(23, 59, 59, 999);

//     const pipeline = [
//       {
//         $lookup: {
//           from: "leadstatuses",
//           localField: "leadStatusId",
//           foreignField: "_id",
//           as: "status",
//         },
//       },
//       { $unwind: "$status" },

//       {
//         $match: {
//           "status.leadStatusName": "Follow Up",
//           FollowDate: { $gte: start, $lte: end },
//         },
//       },
//     ];

//     if (role === "AGENT" && EmployeeId) {
//       pipeline.push({
//         $match: {
//           leadAssignedId: new mongoose.Types.ObjectId(EmployeeId),
//         },
//       });
//     }

//     pipeline.push({
//       $project: {
//         leadFirstName: 1,
//         leadLastName: 1,
//         leadPhone: 1,
//         FollowDate: 1,
//         status: "$status.leadStatusName",
//         leadNotes:1
//       },
//     });

//     const data = await Lead.aggregate(pipeline);
//     res.status(200).json(data);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

exports.getLeadFollowup = async (req, res) => {
  try {
    const { role, EmployeeId } = req.body;
    const indiaTz = "Asia/Kolkata";

    // Today IST start
    const start = dayjs().tz(indiaTz).startOf("day").toDate();

    // Next 3 days IST end
    const end = dayjs(start).tz(indiaTz).add(3, "day").endOf("day").toDate();

    const pipeline = [
      {
        $lookup: {
          from: "leadstatuses",
          localField: "leadStatusId",
          foreignField: "_id",
          as: "status",
        },
      },
      { $unwind: "$status" },

      {
        // leadStatustName (sic) is the real field name on LeadStatus — see
        // services/api/masterForms.js on the frontend for the same typo note.
        $match: {
          "status.leadStatustName": "Follow Up",
          FollowDate: { $gte: start, $lte: end },
        },
      },
    ];

    if (role === "AGENT" && EmployeeId) {
      pipeline.push({
        $match: {
          leadAssignedId: new mongoose.Types.ObjectId(EmployeeId),
        },
      });
    }

    pipeline.push(
      {
        $lookup: { from: "sites", localField: "leadSiteId", foreignField: "_id", as: "site" },
      },
      {
        $lookup: { from: "units", localField: "leadUnitId", foreignField: "_id", as: "unit" },
      },
      {
        $lookup: { from: "leadsources", localField: "leadSourceId", foreignField: "_id", as: "source" },
      },
      {
        $project: {
          leadFirstName: 1,
          leadLastName: 1,
          leadPhone: 1,
          FollowDate: 1,
          leadStatusId: 1,
          status: "$status.leadStatustName",
          leadNotes: 1,
          siteName: { $arrayElemAt: ["$site.sitename", 0] },
          unitName: { $arrayElemAt: ["$unit.UnitName", 0] },
          sourceName: { $arrayElemAt: ["$source.leadSourceName", 0] },
        },
      },
    );

    const data = await Lead.aggregate(pipeline);

    res.status(200).json({
      data,
      debug: {
        message: "Followups fetched using IST timezone.",
        queryRangeIST: {
          start: dayjs(start).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
          end: dayjs(end).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
        },
        queryRangeUTC: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


 
// exports.getVisitorFollowup = async (req, res) => {
//   try {
//     const { role, EmployeeId } = req.body;

//     // --------------------
//     // DATE RANGE (NEXT 3 DAYS)
//     // --------------------
//     const start = new Date();
//     start.setHours(0, 0, 0, 0);

//     const end = new Date(start);
//     end.setDate(start.getDate() + 3);
//     end.setHours(23, 59, 59, 999);

//     const pipeline = [
//       // explode followUps array
//       { $unwind: "$followUps" },

//       // filter follow-up date + Visit Pending
//       {
//         $match: {
//           "followUps.followUpStatus": "Visit Not Yet",
//           "followUps.followUpDate": {
//             $gte: start,
//             $lte: end,
//           },
//         },
//       },
//     ];

//     // --------------------
//     // AGENT FILTER
//     // --------------------
//     if (role === "AGENT" && EmployeeId) {
//       pipeline.push({
//         $match: {
//           employeeId: new mongoose.Types.ObjectId(EmployeeId),
//         },
//       });
//     }

//     // --------------------
//     // FINAL RESPONSE SHAPE
//     // --------------------
//     pipeline.push({
//       $project: {
//         visitorName: 1,
//         visitorMobile: 1,
//         followUpDate: "$followUps.followUpDate",
//         followUpStatus: "$followUps.followUpStatus",
//         notes: "$followUps.notes",
//       },
//     });

//     const data = await Visitor.aggregate(pipeline);

//     res.status(200).json(data);
//   } catch (err) {
//     console.error("Visitor Dashboard Follow-up Error:", err);
//     res.status(500).json({ message: err.message });
//   }
// };



exports.getVisitorFollowup = async (req, res) => {
  try {
    const { role, EmployeeId } = req.body;
    const indiaTz = "Asia/Kolkata";

    // --------------------
    // DATE RANGE (TODAY → NEXT 3 DAYS IST)
    // --------------------
    const start = dayjs().tz(indiaTz).startOf("day").toDate();
    const end = dayjs(start).tz(indiaTz).add(3, "day").endOf("day").toDate();

    const pipeline = [
      { $unwind: "$followUps" },

      {
        $match: {
          "followUps.followUpStatus": "Visit Not Yet",
          "followUps.followUpDate": {
            $gte: start,
            $lte: end,
          },
        },
      },
    ];

    // --------------------
    // AGENT FILTER
    // --------------------
    if (role === "AGENT" && EmployeeId) {
      pipeline.push({
        $match: {
          employeeId: new mongoose.Types.ObjectId(EmployeeId),
        },
      });
    }

    // --------------------
    // FINAL RESPONSE
    // --------------------
    pipeline.push({
      $project: {
        visitorName: 1,
        visitorMobile: 1,
        followUpDate: "$followUps.followUpDate",
        followUpStatus: "$followUps.followUpStatus",
        notes: "$followUps.notes",
      },
    });

    const data = await Visitor.aggregate(pipeline);

    res.status(200).json({
      data,
      debug: {
        message: "Visitor follow-ups fetched using IST timezone.",
        queryRangeIST: {
          start: dayjs(start).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
          end: dayjs(end).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
        },
        queryRangeUTC: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });

  } catch (err) {
    console.error("Visitor Dashboard Follow-up Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Site visits scheduled this week — sourced from Lead.SiteVisitDate rather
// than Visitor.followUps, since a follow-up entry there has no plot/site
// attached (no plotId on that subdocument) while a Lead already carries both
// SiteVisitDate and leadSiteId together.
exports.getSiteVisitAgenda = async (req, res) => {
  try {
    const { role, EmployeeId } = req.body;
    const indiaTz = "Asia/Kolkata";

    const start = dayjs().tz(indiaTz).startOf("day").toDate();
    const end = dayjs(start).tz(indiaTz).add(7, "day").endOf("day").toDate();

    const pipeline = [
      { $match: { SiteVisitDate: { $gte: start, $lte: end } } },
    ];

    if (role === "AGENT" && EmployeeId) {
      pipeline.push({
        $match: { leadAssignedId: new mongoose.Types.ObjectId(EmployeeId) },
      });
    }

    pipeline.push(
      { $lookup: { from: "sites", localField: "leadSiteId", foreignField: "_id", as: "site" } },
      { $lookup: { from: "units", localField: "leadUnitId", foreignField: "_id", as: "unit" } },
      { $lookup: { from: "employees", localField: "leadAssignedId", foreignField: "_id", as: "assignee" } },
      { $lookup: { from: "leadstatuses", localField: "leadStatusId", foreignField: "_id", as: "status" } },
      {
        $project: {
          leadFirstName: 1,
          leadLastName: 1,
          SiteVisitDate: 1,
          status: { $arrayElemAt: ["$status.leadStatustName", 0] },
          siteName: { $arrayElemAt: ["$site.sitename", 0] },
          unitName: { $arrayElemAt: ["$unit.UnitName", 0] },
          assigneeName: { $arrayElemAt: ["$assignee.EmployeeName", 0] },
        },
      },
      { $sort: { SiteVisitDate: 1 } },
    );

    const data = await Lead.aggregate(pipeline);

    res.status(200).json({
      data,
      debug: {
        message: "Site visit agenda fetched using IST timezone.",
        queryRangeIST: {
          start: dayjs(start).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
          end: dayjs(end).tz(indiaTz).format("YYYY-MM-DD hh:mm:ss A"),
        },
      },
    });
  } catch (err) {
    console.error("Site Visit Agenda Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ---------------------------------------------------------------------
// Pipeline Overview stats (Dashboard KPI strip / trend / stage funnel /
// source breakdown) — replaces what was previously 100% hardcoded mock
// data on the frontend (see Ivr-Version/src/services/api/stats.js).
//
// Definitions deliberately reused from elsewhere in this codebase rather
// than invented fresh, so the Dashboard doesn't quietly disagree with the
// Reports page:
//   - "New leads" = Lead.createdAt in range (same field ReportControllers
//     filters on).
//   - "Site visits" = Lead.SiteVisitDate in range (same signal
//     getSiteVisitAgenda above already uses — Plot.visitDetails is a
//     different, non-overlapping population and isn't mixed in here).
//   - "Conversion rate" = PaymentPlan created in range / new leads in range
//     — the same "bookings/newLeads" definition getMonthlyPerformance uses
//     in ReportControllers.js (there is no Lead->PaymentPlan link in the
//     schema, so a true lead->sale rate can't be computed any other way).
//   - "Active pipeline value" = sum of leadPotentialValue for leads whose
//     current status isn't Lost/Booked — a live snapshot, not range-scoped
//     (unlike the old mock, which nonsensically varied this by KPI range).
// ---------------------------------------------------------------------

const LOST_STATUS_PATTERN = /^lost$/i;
const BOOKED_STATUS_PATTERN = /^booked$/i;

function initialsFor(name) {
  if (!name) return "—";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function rangeWindow(range, indiaTz) {
  const now = dayjs().tz(indiaTz);
  const end = now.toDate();
  let start, prevStart, prevEnd;

  if (range === "7d") {
    start = now.subtract(7, "day").toDate();
    prevEnd = start;
    prevStart = now.subtract(14, "day").toDate();
  } else if (range === "30d") {
    start = now.subtract(30, "day").toDate();
    prevEnd = start;
    prevStart = now.subtract(60, "day").toDate();
  } else if (range === "mtd") {
    start = now.startOf("month").toDate();
    const daysSoFar = now.diff(now.startOf("month"), "day") + 1;
    prevStart = now.startOf("month").subtract(1, "month").toDate();
    prevEnd = dayjs(prevStart).add(daysSoFar, "day").toDate();
  } else {
    // today
    start = now.startOf("day").toDate();
    prevEnd = start;
    prevStart = now.subtract(1, "day").startOf("day").toDate();
  }

  return { start, end, prevStart, prevEnd };
}

function deltaPct(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

exports.getPipelineOverviewStats = async (req, res) => {
  try {
    const { range = "today" } = req.body;
    const indiaTz = "Asia/Kolkata";
    const { start, end, prevStart, prevEnd } = rangeWindow(range, indiaTz);

    const trendStart = dayjs().tz(indiaTz).subtract(13, "day").startOf("day").toDate();
    const cardTrendStart = dayjs().tz(indiaTz).subtract(6, "day").startOf("day").toDate();

    const [leads, currentPlans, previousPlans, recentPlans] = await Promise.all([
      Lead.find()
        .select("leadPotentialValue leadStatusId leadSourceId leadAssignedId createdAt SiteVisitDate leadHistory")
        .populate("leadStatusId", "leadStatustName")
        .populate("leadSourceId", "leadSourceName")
        .populate("leadAssignedId", "EmployeeName")
        .lean(),
      PaymentPlan.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      PaymentPlan.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd } }),
      PaymentPlan.find({ createdAt: { $gte: cardTrendStart } }).select("createdAt").lean(),
    ]);

    // Per-KPI-card 7-day sparklines (distinct from the 14-day cumulative
    // chart below — these show each metric's own daily value).
    const newLeadsByDay = new Map();
    const siteVisitsByDay = new Map();
    const bookingsByDay = new Map();
    for (let i = 0; i < 7; i += 1) {
      const key = dayjs(cardTrendStart).add(i, "day").format("YYYY-MM-DD");
      newLeadsByDay.set(key, 0);
      siteVisitsByDay.set(key, 0);
      bookingsByDay.set(key, 0);
    }
    for (const plan of recentPlans) {
      const key = dayjs(plan.createdAt).tz(indiaTz).format("YYYY-MM-DD");
      if (bookingsByDay.has(key)) bookingsByDay.set(key, bookingsByDay.get(key) + 1);
    }

    const now = Date.now();
    let newLeadsCount = 0;
    let prevNewLeadsCount = 0;
    let siteVisitsCount = 0;
    let prevSiteVisitsCount = 0;
    let activePipelineValue = 0;
    let pipelineValueAtRangeStart = 0;
    let lostCount = 0;

    const statusGroups = new Map(); // real status name -> { count, totalValue, daysInStageSum, reps: Map }
    const sourceGroups = new Map(); // real source name -> count
    const trendByDay = new Map(); // 'YYYY-MM-DD' -> value

    for (let i = 0; i < 14; i += 1) {
      trendByDay.set(dayjs(trendStart).add(i, "day").format("YYYY-MM-DD"), 0);
    }

    for (const lead of leads) {
      const statusName = lead.leadStatusId?.leadStatustName ?? "Unknown";
      // Soft-deleted leads (see /Lead/deleteLeads) are excluded from every
      // Dashboard figure, matching fetchLeads()'s own filter on the Leads page.
      if (/deleted|archived/i.test(statusName)) continue;

      const createdAt = new Date(lead.createdAt);
      const sourceName = lead.leadSourceId?.leadSourceName ?? "Unknown";
      const value = lead.leadPotentialValue ?? 0;
      const isLost = LOST_STATUS_PATTERN.test(statusName);
      const isBooked = BOOKED_STATUS_PATTERN.test(statusName);

      if (createdAt >= start && createdAt <= end) newLeadsCount += 1;
      if (createdAt >= prevStart && createdAt <= prevEnd) prevNewLeadsCount += 1;

      const createdDayKey = dayjs(createdAt).tz(indiaTz).format("YYYY-MM-DD");
      if (newLeadsByDay.has(createdDayKey)) newLeadsByDay.set(createdDayKey, newLeadsByDay.get(createdDayKey) + 1);

      if (lead.SiteVisitDate) {
        const visitDate = new Date(lead.SiteVisitDate);
        if (visitDate >= start && visitDate <= end) siteVisitsCount += 1;
        if (visitDate >= prevStart && visitDate <= prevEnd) prevSiteVisitsCount += 1;

        const visitDayKey = dayjs(visitDate).tz(indiaTz).format("YYYY-MM-DD");
        if (siteVisitsByDay.has(visitDayKey)) siteVisitsByDay.set(visitDayKey, siteVisitsByDay.get(visitDayKey) + 1);
      }

      if (isLost) lostCount += 1;
      if (!isLost && !isBooked) {
        activePipelineValue += value;
        if (createdAt < start) pipelineValueAtRangeStart += value;
      }

      // 14-day trend: cumulative value of still-active leads, bucketed by
      // creation date — see file header comment for exactly what this does
      // and doesn't represent (no historical status snapshots exist).
      if (!isLost && !isBooked) {
        const dayKey = dayjs(createdAt).tz(indiaTz).format("YYYY-MM-DD");
        if (trendByDay.has(dayKey)) {
          trendByDay.set(dayKey, trendByDay.get(dayKey) + value);
        } else if (createdAt < trendStart) {
          // Leads created before the trend window still count toward every
          // day's cumulative total.
          trendByDay.set("__before__", (trendByDay.get("__before__") ?? 0) + value);
        }
      }

      if (!statusGroups.has(statusName)) {
        statusGroups.set(statusName, { count: 0, totalValue: 0, daysInStageSum: 0, reps: new Map() });
      }
      const group = statusGroups.get(statusName);
      group.count += 1;
      group.totalValue += value;

      const statusChangeEntries = (lead.leadHistory ?? []).filter(
        (h) => h.leadStatusId && String(h.leadStatusId) === String(lead.leadStatusId?._id),
      );
      const latestEntry = statusChangeEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      const enteredAt = latestEntry ? new Date(latestEntry.timestamp) : createdAt;
      group.daysInStageSum += Math.max(0, (now - enteredAt.getTime()) / 86_400_000);

      if (lead.leadAssignedId) {
        const repId = String(lead.leadAssignedId._id);
        const repName = lead.leadAssignedId.EmployeeName ?? "Unassigned";
        group.reps.set(repId, (group.reps.get(repId) ?? { name: repName, count: 0 }));
        group.reps.get(repId).count += 1;
      }

      sourceGroups.set(sourceName, (sourceGroups.get(sourceName) ?? 0) + 1);
    }

    // Turn the cumulative-by-day map into a running total across the window.
    let running = trendByDay.get("__before__") ?? 0;
    const valueTrend = [];
    for (let i = 0; i < 14; i += 1) {
      const key = dayjs(trendStart).add(i, "day").format("YYYY-MM-DD");
      running += trendByDay.get(key) ?? 0;
      valueTrend.push({ date: dayjs(trendStart).add(i, "day").toISOString(), value: running });
    }

    const statusGroupsOut = [...statusGroups.entries()].map(([statusName, g]) => ({
      statusName,
      count: g.count,
      totalValue: g.totalValue,
      avgDaysInStage: g.count ? g.daysInStageSum / g.count : 0,
      topReps: [...g.reps.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 2)
        .map(([employeeId, r]) => ({ employeeId, name: r.name, initials: initialsFor(r.name), count: r.count })),
    }));

    const sourceGroupsOut = [...sourceGroups.entries()].map(([sourceName, count]) => ({ sourceName, count }));

    const conversionRate = newLeadsCount ? (currentPlans / newLeadsCount) * 100 : 0;
    const prevConversionRate = prevNewLeadsCount ? (previousPlans / prevNewLeadsCount) * 100 : 0;

    const cardTrendDays = Array.from({ length: 7 }, (_, i) => dayjs(cardTrendStart).add(i, "day"));
    const newLeadsTrend = cardTrendDays.map((d) => ({ date: d.toISOString(), value: newLeadsByDay.get(d.format("YYYY-MM-DD")) ?? 0 }));
    const siteVisitsTrend = cardTrendDays.map((d) => ({ date: d.toISOString(), value: siteVisitsByDay.get(d.format("YYYY-MM-DD")) ?? 0 }));
    const conversionRateTrend = cardTrendDays.map((d) => {
      const key = d.format("YYYY-MM-DD");
      const dayLeads = newLeadsByDay.get(key) ?? 0;
      const dayBookings = bookingsByDay.get(key) ?? 0;
      return { date: d.toISOString(), value: dayLeads ? (dayBookings / dayLeads) * 100 : 0 };
    });
    const pipelineValueTrend = valueTrend.slice(-7);

    res.status(200).json({
      success: true,
      data: {
        newLeads: { count: newLeadsCount, deltaPct: deltaPct(newLeadsCount, prevNewLeadsCount), trend: newLeadsTrend },
        siteVisits: { count: siteVisitsCount, deltaPct: deltaPct(siteVisitsCount, prevSiteVisitsCount), trend: siteVisitsTrend },
        conversionRate: { value: conversionRate, deltaPt: conversionRate - prevConversionRate, trend: conversionRateTrend },
        activePipelineValue: {
          value: activePipelineValue,
          deltaPct: deltaPct(activePipelineValue, pipelineValueAtRangeStart),
          trend: pipelineValueTrend,
        },
        valueTrend,
        statusGroups: statusGroupsOut,
        sourceGroups: sourceGroupsOut,
        lostCount,
      },
    });
  } catch (err) {
    console.error("Pipeline Overview Stats Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};