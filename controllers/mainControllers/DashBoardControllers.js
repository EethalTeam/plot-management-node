const mongoose = require("mongoose");
const Lead = require("../../models/masterModels/Leads");
const Visitor = require('../../models/masterModels/Visitor')
const Callog = require("../../models/masterModels/TeleCMICallLog");
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


exports.getDayWiseAnsweredCalls = async (req, res) => {
  try {
    const { role, TelecmiID ,fromDate, toDate } = req.body;

   const start = fromDate ? new Date(fromDate) : new Date();
    const end = toDate ? new Date(toDate) : new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

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

    res.status(200).json(result);
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

exports.getLeadsBySource = async (req, res) => {
  try {
    const { role, EmployeeId,fromDate, toDate  } = req.body;
    console.log(req.body, "req.body");

     const start = fromDate ? new Date(fromDate) : new Date();
    const end = toDate ? new Date(toDate) : new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const matchStage = {
      createdAt: { $gte: start, $lte: end },
    };

    if (role === "AGENT") {
      if (!EmployeeId) return res.status(200).json([]);
      matchStage.$or = [
            { leadCreatedById: new mongoose.Types.ObjectId(EmployeeId) },
            { leadAssignedId: new mongoose.Types.ObjectId(EmployeeId) }
          ]
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
      value: total ? Number(((item.count / total) * 100).toFixed(0)) : 0,
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCallStatusReport = async (req, res) => {
  try {
    const { TelecmiID, role ,fromDate, toDate } = req.body;

    const start = fromDate ? new Date(fromDate) : new Date();
    const end = toDate ? new Date(toDate) : new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const matchQuery = {
      callDate: { $gte: start, $lte: end },
    };

    //  If AGENT → restrict to own calls
    if (role === "AGENT") {
      if (!TelecmiID) {
        return res.status(200).json([]);
      }
      matchQuery.user = TelecmiID;
    }

    // -------------------------
    // AGGREGATION
    // -------------------------
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

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.getLeadFollowup = async (req, res) => {
  try {
    const { role, EmployeeId } = req.body;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 3);
    end.setHours(23, 59, 59, 999);

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
        $match: {
          "status.leadStatusName": "Follow Up",
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

    pipeline.push({
      $project: {
        leadFirstName: 1,
        leadLastName: 1,
        leadPhone: 1,
        FollowDate: 1,
        status: "$status.leadStatusName",
        leadNotes:1
      },
    });

    const data = await Lead.aggregate(pipeline);
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};




 
exports.getVisitorFollowup = async (req, res) => {
  try {
    const { role, EmployeeId } = req.body;

    // --------------------
    // DATE RANGE (NEXT 3 DAYS)
    // --------------------
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 3);
    end.setHours(23, 59, 59, 999);

    const pipeline = [
      // explode followUps array
      { $unwind: "$followUps" },

      // filter follow-up date + Visit Pending
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
    // FINAL RESPONSE SHAPE
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

    res.status(200).json(data);
  } catch (err) {
    console.error("Visitor Dashboard Follow-up Error:", err);
    res.status(500).json({ message: err.message });
  }
};

