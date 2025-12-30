const mongoose = require('mongoose')
const Lead = require('../../models/masterModels/Leads')
const Callog = require('../../models/masterModels/TeleCMICallLog')



exports.getAllDashBoard = async (req, res) => {
  try {
    const { role, TelecmiID } = req.body;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // ---------- CALL FILTER ----------
    const callMatch = {
      answeredsec: { $gt: 0 },
      callDate: { $gte: startOfToday, $lte: endOfToday }
    };

    if (role === "AGENT") {
      if (!TelecmiID) return res.status(200).json({ lead: 0, callog: 0 });
      callMatch.user = TelecmiID;
    }

    const [leadCount, callCount] = await Promise.all([
      Lead.countDocuments(),
      Callog.countDocuments(callMatch)
    ]);

    res.status(200).json({
      lead: leadCount,
      callog: callCount
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDayWiseAnsweredCalls = async (req, res) => {
  try {
    const { role, TelecmiID } = req.body;

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const matchQuery = {
      answeredsec: { $gt: 0 },
      callDate: { $gte: startOfWeek, $lt: endOfWeek }
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
          calls: { $sum: 1 }
        }
      }
    ]);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const result = days.map((day, index) => {
      const found = logs.find(l => l._id === index + 1);
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
    const { role, employeeId } = req.body;
    console.log(req.body,"req.body")

    const matchStage = {};

    if (role === "AGENT") {
      if (!employeeId) return res.status(200).json([]);
      matchStage.leadAssignedId = new mongoose.Types.ObjectId(employeeId);
    }

    const data = await Lead.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "leadsources",
          localField: "leadSourceId",
          foreignField: "_id",
          as: "source"
        }
      },
      { $unwind: "$source" },
      {
        $group: {
          _id: "$source.leadSourceName",
          count: { $sum: 1 }
        }
      }
    ]);

    const total = data.reduce((sum, item) => sum + item.count, 0);

    const result = data.map(item => ({
      name: item._id,
      value: total ? Number(((item.count / total) * 100).toFixed(0)) : 0
    }));

    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};





exports.getCallStatusReport = async (req, res) => {
  try {
    const { TelecmiID, role } = req.body;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // -------------------------
    // BUILD MATCH CONDITION
    // -------------------------
    const matchQuery = {
      callDate: {
        $gte: startOfToday,
        $lte: endOfToday
      }
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
        $match: matchQuery
      },
      {
        $project: {
          statusType: {
            $cond: [
              { $gt: ["$answeredsec", 0] },
              "Answered",
              "Missed"
            ]
          }
        }
      },
      {
        $group: {
          _id: "$statusType",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          value: "$count"
        }
      }
    ]);

    res.status(200).json(report);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



