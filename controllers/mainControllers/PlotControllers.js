const Plot = require("../../models/masterModels/Plot");
const Status = require('../../models/masterModels/Status')
const Unit = require('../../models/masterModels/Unit')
const Visitor = require('../../models/masterModels/Visitor')

// Create Plot
exports.createPlot = async (req, res) => {
  try {
    // Step 1: Find the latest plot based on plotCode
    const latestPlot = await Plot.findOne({})
      .sort({ plotCode: -1 }) // Sort descending
      .select("plotCode");

    let newCode = "PL00001";

    if (latestPlot && latestPlot.plotCode) {
      const lastCode = latestPlot.plotCode; // e.g., "PL00012"
      const numberPart = parseInt(lastCode.replace("PL", "")); // e.g., 12
      const nextNumber = numberPart + 1;
      newCode = "PL" + nextNumber.toString().padStart(5, "0"); // e.g., "PL00013"
    }

    // Step 2: Create plot with the new code
    const plot = new Plot({
      ...req.body,
      plotCode: newCode,
    });

    const savedPlot = await plot.save();

    res.status(201).json({ success: true, data: savedPlot });
  } catch (error) {
    console.error("Create Plot Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Plots
exports.getAllPlots = async (req, res) => {
  try {
    const {unitId}=req.body
    let filter={isActive: true}
    if(unitId){
      filter.unitId=unitId
    }
    const plots = await Plot.find(filter)
      .populate("unitId", "UnitName UnitCode")
      .populate("statusId", "statusName colorCode")
      .populate("visitDetails.visitedBy", "_id visitorName")
      .populate("interestDetails.interestedBy", "_id visitorName");
    res.status(200).json({ success: true, data: plots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Plot By ID
exports.getPlotById = async (req, res) => {
  try {
    const { id } = req.body;

    const plot = await Plot.findOne({ _id: id, isActive: true })
      .populate("unitId", "unitName unitCode")
      .populate("statusId", "statusName");

    if (!plot) {
      return res.status(404).json({ success: false, message: "Plot not found" });
    }

    res.status(200).json({ success: true, data: plot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Plot
exports.updatePlot = async (req, res) => {
  try {
    const { id, ...updateData } = req.body;

    const updatedPlot = await Plot.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedPlot) {
      return res.status(404).json({ success: false, message: "Plot not found" });
    }

    res.status(200).json({ success: true, data: updatedPlot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const STATUS_IDS = {
  Available: "6889bcf6080f330c24ba0521",
  Reserved: "68919d746c96e8d502df470e",
  Booked: "68919d8b6c96e8d502df4712",
  Hold: "68919db26c96e8d502df4716",
  Sold: "68919dc96c96e8d502df471a",
  Interested: "689343a2be2ae7f865e038a1",
  Visited: "68947ddcbb5588af59c8a1eb"
};

exports.updatePlotStatus = async (req, res) => {
  try {
    const {
      plotId,
      soldToVisitorId,
      soldDate,
      bookedBy,
      bookedDate,
      reservedBy,
      reservedDate,
      holdBy,
      holdDate,
      visitedBy,
      visitedDate,
      interestedBy,
      interestDate
    } = req.body;

    if (!plotId) {
      return res.status(400).json({ message: "plotId is required." });
    }

    const plot = await Plot.findById(plotId);
    if (!plot) {
      return res.status(404).json({ message: "Plot not found." });
    }

    let visitorIdToUpdate = null;
    let statusToSet = null;
    let dateToUse = null;
    let updateMade = false;

    // Sold
    if (soldToVisitorId) {
      plot.soldToVisitorId = soldToVisitorId;
      plot.soldDate = soldDate || new Date();
      plot.statusId = STATUS_IDS.Sold;
      visitorIdToUpdate = soldToVisitorId;
      statusToSet = STATUS_IDS.Sold;
      dateToUse = soldDate;
      updateMade = true;
    }

    // Booked
    else if (bookedBy) {
      plot.bookedBy = bookedBy;
      plot.bookedDate = bookedDate || new Date();
      plot.statusId = STATUS_IDS.Booked;
      visitorIdToUpdate = bookedBy;
      statusToSet = STATUS_IDS.Booked;
      dateToUse = bookedDate;
      updateMade = true;
    }

    // Reserved
    else if (reservedBy) {
      plot.reservedBy = reservedBy;
      plot.reservedDate = reservedDate || new Date();
      plot.statusId = STATUS_IDS.Reserved;
      visitorIdToUpdate = reservedBy;
      statusToSet = STATUS_IDS.Reserved;
      dateToUse = reservedDate;
      updateMade = true;
    }

    // Hold
    else if (holdBy) {
      plot.holdBy = holdBy;
      plot.holdDate = holdDate || new Date();
      plot.statusId = STATUS_IDS.Hold;
      visitorIdToUpdate = holdBy;
      statusToSet = STATUS_IDS.Hold;
      dateToUse = holdDate;
      updateMade = true;
    }

    // Interested
    else if (interestedBy) {
      const alreadyInterested = plot.interestDetails.some(
        (entry) => entry.interestedBy.toString() === interestedBy
      );

      if (alreadyInterested) {
        return res.status(400).json({
          success: false,
          message: "Visitor already marked as interested in this plot."
        });
      }

      plot.interestDetails.push({
        interestedBy,
        interestDate: interestDate || new Date()
      });

      visitorIdToUpdate = interestedBy;
      statusToSet = STATUS_IDS.Interested;
      dateToUse = interestDate;
      updateMade = true;
    }

    // Visited
    else if (visitedBy) {
      const alreadyVisited = plot.visitDetails.some(
        (entry) => entry.visitedBy.toString() === visitedBy
      );

      if (alreadyVisited) {
        return res.status(400).json({
          success: false,
          message: "Visitor already visited this plot."
        });
      }

      plot.visitDetails.push({
        visitedBy,
        visitedDate: visitedDate || new Date()
      });

      visitorIdToUpdate = visitedBy;
      statusToSet = STATUS_IDS.Visited;
      dateToUse = visitedDate;
      updateMade = true;
    }

    if (!updateMade || !visitorIdToUpdate || !statusToSet) {
      return res.status(400).json({
        success: false,
        message: "No valid status update provided."
      });
    }

    // Update Visitor Plots Array
    const visitor = await Visitor.findById(visitorIdToUpdate);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor not found."
      });
    }

    const existingPlotEntry = visitor.plots.find(
      (entry) => entry.plotId.toString() === plotId
    );

    if (existingPlotEntry) {
      if (existingPlotEntry.statusId.toString() === statusToSet) {
        return res.status(400).json({
          success: false,
          message: "This visitor already has this status for the plot."
        });
      } else {
        existingPlotEntry.statusId = statusToSet;
        existingPlotEntry.timestamp = dateToUse || new Date();
      }
    } else {
      visitor.plots.push({
        plotId,
        statusId: statusToSet,
        timestamp: dateToUse || new Date()
      });
    }

    await plot.save();
    await visitor.save();
    await plot.populate("statusId");

    return res.status(200).json({
      success: true,
      message: "Plot status updated successfully.",
      data: plot
    });
  } catch (error) {
    console.error("Error updating plot status:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Soft Delete Plot
exports.deletePlot = async (req, res) => {
  try {
    const { id } = req.body;

    const deletedPlot = await Plot.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!deletedPlot) {
      return res.status(404).json({ success: false, message: "Plot not found" });
    }

    res.status(200).json({ success: true, message: "Plot soft-deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllStatus = async (req, res) => {
  try {
    const status = await Status.find({})

    if (!status) return res.status(404).json({ message: "Status not found" });

    res.status(200).json({ data: status });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllUnits = async (req, res) => {
  try {
    const unit = await Unit.find({})

    if (!unit) return res.status(404).json({ message: "Status not found" });

    res.status(200).json({ data: unit });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllVisitors = async (req, res) => {
  try {
    const {visitorName} = req.body
    let filter={}
    if(visitorName){
      filter.visitorName = visitorName
    }
    const visitor = await Visitor.find(filter)

    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    res.status(200).json(visitor);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
