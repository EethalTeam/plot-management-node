const mongoose = require("mongoose");
const Visitor = require("../../models/masterModels/Visitor");
const Plot = require("../../models/masterModels/Plot");
const Status = require("../../models/masterModels/Status");

const STATUS_IDS = {
  Available: new mongoose.Types.ObjectId("6889bcf6080f330c24ba0521"),
  Reserved: new mongoose.Types.ObjectId("68919d746c96e8d502df470e"),
  Booked: new mongoose.Types.ObjectId("68919d8b6c96e8d502df4712"),
  Hold: new mongoose.Types.ObjectId("68919db26c96e8d502df4716"),
  Sold: new mongoose.Types.ObjectId("68919dc96c96e8d502df471a"),
  Interested: new mongoose.Types.ObjectId("689343a2be2ae7f865e038a1"),
  Visited: new mongoose.Types.ObjectId("68947ddcbb5588af59c8a1eb")
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalVisitors, plotCounts, statuses] = await Promise.all([
      Visitor.countDocuments(),
      Plot.aggregate([
        { $group: { _id: "$statusId", count: { $sum: 1 } } }
      ]),
      Status.find({}, { _id: 1, statusName: 1, colorCode: 1 }) // fetching colorCode
    ]);

    const totalPlots = plotCounts.reduce((sum, s) => sum + s.count, 0);

    const statusData = {
      available: { count: 0, colorCode: null },
      reserved: { count: 0, colorCode: null },
      booked: { count: 0, colorCode: null },
      hold: { count: 0, colorCode: null },
      sold: { count: 0, colorCode: null },
      interested: { count: 0, colorCode: null },
      visited: { count: 0, colorCode: null }
    };

    // Assign counts
    plotCounts.forEach(({ _id, count }) => {
      if (_id.equals(STATUS_IDS.Available)) statusData.available.count = count;
      else if (_id.equals(STATUS_IDS.Reserved)) statusData.reserved.count = count;
      else if (_id.equals(STATUS_IDS.Booked)) statusData.booked.count = count;
      else if (_id.equals(STATUS_IDS.Hold)) statusData.hold.count = count;
      else if (_id.equals(STATUS_IDS.Sold)) statusData.sold.count = count;
      else if (_id.equals(STATUS_IDS.Interested)) statusData.interested.count = count;
      else if (_id.equals(STATUS_IDS.Visited)) statusData.visited.count = count;
    });

    // Assign color codes from Status collection
    statuses.forEach(st => {
      if (st._id.equals(STATUS_IDS.Available)) statusData.available.colorCode = st.colorCode;
      else if (st._id.equals(STATUS_IDS.Reserved)) statusData.reserved.colorCode = st.colorCode;
      else if (st._id.equals(STATUS_IDS.Booked)) statusData.booked.colorCode = st.colorCode;
      else if (st._id.equals(STATUS_IDS.Hold)) statusData.hold.colorCode = st.colorCode;
      else if (st._id.equals(STATUS_IDS.Sold)) statusData.sold.colorCode = st.colorCode;
      else if (st._id.equals(STATUS_IDS.Interested)) statusData.interested.colorCode = st.colorCode;
      else if (st._id.equals(STATUS_IDS.Visited)) statusData.visited.colorCode = st.colorCode;
    });

    res.status(200).json({
      totalVisitors,
      totalPlots,
      ...statusData
    });

  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
