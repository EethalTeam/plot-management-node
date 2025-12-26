const mongoose = require('mongoose')
const Lead = require('../../models/masterModels/Leads')
const Callog = require('../../models/masterModels/TeleCMICallLog')



exports.getAllDashBoard = async (req, res) => {
    try {

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);


        let lead = await Lead.find()
        let callog = new Date()
        callog = await Callog.find({ 
            answeredsec: { $gt: 0 },
            callDate: {
        $gte: startOfToday,
        $lte: endOfToday
      } 
        })


        let filter = {
            lead: lead.length,
            callog: callog.length
        }

        if (!filter) {
            return res.status(400).json({ message: "Error from backend Dashboard getAllDash" })
        }
        res.status(200).json(filter)
    } catch (error) {

        res.status(500).json({ message: error.message });

    }
}


exports.getDayWiseAnsweredCalls = async (req, res) => {
    try {

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const logs = await Callog.aggregate([
            {
                $match: {
                    answeredsec: { $gt: 0 },        //  answered calls
                    callDate: {
                        $gte: startOfWeek,
                        $lt: endOfWeek
                    }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$callDate" }, // 1=Sun … 7=Sat
                    calls: { $sum: 1 }
                }
            }
        ]);

        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        const result = days.map((day, index) => {
            const found = logs.find(l => l._id === index + 1);
            return {
                day,
                calls: found ? found.calls : 0
            };
        });

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



exports.getLeadsBySource = async (req, res) => {    //LeadSource byChart
  try {
    const data = await Lead.aggregate([
       {
        $lookup: {
          from: "leadsources",          //  collection name
          localField: "leadSourceId",   // field in Lead
          foreignField: "_id",          //  field in LeadSource
          as: "source"
        }
      },
      { $unwind: "$source" },
      {
        $group: {
          _id: "$source.leadSourceName", //  GROUP BY NAME
          count: { $sum: 1 }
        }
      }
    ]);
    

    const total = data.reduce((sum, item) => sum + item.count, 0);

    const result = data.map(item => ({
      name: item._id,
      value: Number(((item.count / total) * 100).toFixed(0)) // percentage
    }));

    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
