const Visitor = require("../../models/masterModels/Visitor");
const Plots = require('../../models/masterModels/Plot')
const Status = require('../../models/masterModels/Status')
const Employees = require('../../models/masterModels/Employee')


const STATUS_IDS = {
  Available: "6889bcf6080f330c24ba0521",
  Reserved: "68919d746c96e8d502df470e",
  Booked: "68919d8b6c96e8d502df4712",
  Hold: "68919db26c96e8d502df4716",
  Sold: "68919dc96c96e8d502df471a",
  Interested: "689343a2be2ae7f865e038a1",
  Visited: "68947ddcbb5588af59c8a1eb"
};
// Create Visitor
exports.createVisitor = async (req, res) => {
  try {
    const {visitorName,visitorEmail,visitorMobile,visitorWhatsApp,visitorPhone,cityId,visitorAddress,feedback,description,employeeId,statusId,notes,remarks} = req.body
    const latestVisitor = await Visitor.findOne({})
          .sort({ visitorCode: -1 })
          .select("visitorCode");
    
        let newCode = "VIS00001";
    
        if (latestVisitor && latestVisitor.visitorCode) {
          const lastCode = latestVisitor.visitorCode; 
          const numberPart = parseInt(lastCode.replace("VIS", "")); 
          const nextNumber = numberPart + 1;
          newCode = "VIS" + nextNumber.toString().padStart(5, "0"); 
        }
        console.log(visitorName,newCode,"code")
    const visitor = new Visitor({
      visitorCode:newCode,
visitorName,
visitorEmail,
visitorMobile,
visitorWhatsApp,
visitorPhone,
cityId,
visitorAddress,
feedback,
description,
employeeId,
statusId,
notes,
remarks
    });
    const savedVisitor = await visitor.save();
    res.status(201).json({ success: true, data: savedVisitor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Visitors
exports.getAllVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find({ isActive: true })
      .populate("employeeId", "EmployeeName")
      .populate("cityId","CityCode CityName")
      .populate({
    path: "plots.plotId",
    select: "plotCode plotNumber unitId",
    populate: {
      path: "unitId",
      select: "UnitName"
    }
  })
      .populate("plots.statusId", "statusName colorCode")
      .populate("followUps.followedUpById", "EmployeeName");
    res.status(200).json({ success: true, data: visitors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Visitor By ID
exports.getVisitorById = async (req, res) => {
  try {
    const { id } = req.body;
    const visitor = await Visitor.findOne({ _id: id, isActive: true })
      .populate("employeeId", "EmployeeName")
      .populate("plots.plotId", "plotCode plotLocation")
      .populate("plots.statusId", "statusName")
      .populate("followUps.followedUpById", "EmployeeName");

    if (!visitor) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    res.status(200).json({ success: true, data: visitor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Visitor
exports.updateVisitor = async (req, res) => {
  try {
    const { id, ...updateData } = req.body;

    const updatedVisitor = await Visitor.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedVisitor) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    res.status(200).json({ success: true, data: updatedVisitor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Soft Delete Visitor
exports.deleteVisitor = async (req, res) => {
  try {
    const { id } = req.body;

    const deletedVisitor = await Visitor.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!deletedVisitor) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    res.status(200).json({ success: true, message: "Visitor soft-deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addPlotToVisitor = async (req, res) => {
  try {
    const { visitorId, plotIds = [], statusId, unitId } = req.body;

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    let updated = false;
    let messages = [];

    // Helper to update Plot table as well
    const updatePlotTable = async (plotId, statusId, visitorId) => {
      const plot = await Plots.findById(plotId);
      if (!plot) return;

      switch (statusId) {
        case STATUS_IDS.Sold:
          plot.soldToVisitorId = visitorId;
          plot.statusId = statusId;
          plot.soldDate = new Date();
          break;
        case STATUS_IDS.Booked:
          plot.bookedBy = visitorId;
          plot.statusId = statusId;
          plot.bookedDate = new Date();
          break;
        case STATUS_IDS.Reserved:
          plot.reservedBy = visitorId;
          plot.statusId = statusId;
          plot.reservedDate = new Date();
          break;
        case STATUS_IDS.Hold:
          plot.holdBy = visitorId;
          plot.statusId = statusId;
          plot.holdDate = new Date();
          break;
        case STATUS_IDS.Interested:
          if (!plot.interestDetails.some(d => d.interestedBy.toString() === visitorId)) {
            plot.interestDetails.push({ interestedBy: visitorId, interestDate: new Date() });
          }
          break;
        case STATUS_IDS.Visited:
          if (!plot.visitDetails.some(d => d.visitedBy.toString() === visitorId)) {
            plot.visitDetails.push({ visitedBy: visitorId, visitedDate: new Date() });
          }
          break;
      }

      await plot.save();
    };

    if (plotIds.length > 0) {
      // Case 1: Specific plots update/add
      for (const plotId of plotIds) {
        const existingIndex = visitor.plots.findIndex(p => p.plotId.toString() === plotId);

        if (existingIndex === -1) {
          visitor.plots.push({ plotId, statusId, unitId });
          await updatePlotTable(plotId, statusId, visitorId);
          messages.push(`Added plot ${plotId} with status ${statusId}`);
          updated = true;
        } else {
          if (visitor.plots[existingIndex].statusId.toString() !== statusId) {
            visitor.plots[existingIndex].statusId = statusId;
            await updatePlotTable(plotId, statusId, visitorId);
            messages.push(`Updated plot ${plotId} to status ${statusId}`);
            updated = true;
          } else {
            messages.push(`Plot ${plotId} already has status ${statusId}`);
          }
        }
      }
    } 
    else if (unitId) {
      // Case 2: Bulk update by unitId
      for (const plot of visitor.plots) {
        if (plot.unitId && plot.unitId.toString() === unitId) {
          if (plot.statusId.toString() !== statusId) {
            // plot.statusId = statusId;
            await updatePlotTable(plot.plotId, statusId, visitorId);
            messages.push(`Updated plot ${plot.plotId} to status ${statusId}`);
            updated = true;
          } else {
            messages.push(`Plot ${plot.plotId} already has status ${statusId}`);
          }
        }
      }
    } 
    else {
      return res.status(400).json({ message: "Either plotIds or unitId must be provided" });
    }

    if (updated) {
      await visitor.save();
    }

    res.status(200).json({
      message: "Plots processed",
      details: messages,
      visitor
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateVisitorPlot = async (req, res) => {
  try {
    const { visitorId, plotId, statusId } = req.body;

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    const plotEntry = visitor.plots.find(p => p.plotId.toString() === plotId);
    if (!plotEntry) return res.status(404).json({ message: "Plot not found for this visitor" });

    if (statusId) plotEntry.statusId = statusId;

    await visitor.save();

    // Sync with Plot table
    const plot = await Plot.findById(plotId);
    if (!plot) return res.status(404).json({ message: "Plot not found in Plot table" });

    // plot.statusId = statusId;

    switch (statusId) {
      case STATUS_IDS.Sold:
        plot.soldToVisitorId = visitorId;
        plot.statusId = statusId;
        plot.soldDate = new Date();
        break;
      case STATUS_IDS.Booked:
        plot.bookedBy = visitorId;
        plot.statusId = statusId;
        plot.bookedDate = new Date();
        break;
      case STATUS_IDS.Reserved:
        plot.reservedBy = visitorId;
        plot.statusId = statusId;
        plot.reservedDate = new Date();
        break;
      case STATUS_IDS.Hold:
        plot.holdBy = visitorId;
        plot.statusId = statusId;
        plot.holdDate = new Date();
        break;
      case STATUS_IDS.Interested:
        if (!plot.interestDetails.some(d => d.interestedBy.toString() === visitorId)) {
          plot.interestDetails.push({ interestedBy: visitorId, interestDate: new Date() });
        }
        break;
      case STATUS_IDS.Visited:
        if (!plot.visitDetails.some(d => d.visitedBy.toString() === visitorId)) {
          plot.visitDetails.push({ visitedBy: visitorId, visitedDate: new Date() });
        }
        break;
    }

    await plot.save();

    res.status(200).json({
      message: "Visitor plot and Plot table updated",
      visitor,
      plot
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteVisitorPlot = async (req, res) => {
  try {
    const { visitorId, plotId } = req.body;

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    const beforeCount = visitor.plots.length;
    visitor.plots = visitor.plots.filter(p => p.plotId.toString() !== plotId);

    if (visitor.plots.length === beforeCount) {
      return res.status(404).json({ message: "Plot not found in visitor" });
    }

    await visitor.save();
    res.status(200).json({ message: "Plot removed from visitor", visitor });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllPlots = async (req, res) => {
  try {
    const {unitId} = req.body
    const plots = await Plots.find({unitId:unitId})
      // .populate("plots.plotId")
      // .populate("plots.statusId")
      // .populate("followUps.followedUpById");

    if (!plots) return res.status(404).json({ message: "Plots not found" });

    res.status(200).json({ data: plots });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllStatus = async (req, res) => {
  try {
    const status = await Status.find({}).skip(1)

    if (!status) return res.status(404).json({ message: "Status not found" });

    res.status(200).json({ data: status });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employees.find({})

    if (!employees) return res.status(404).json({ message: "Employees not found" });

    res.status(200).json({ data: employees });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getVisitorPlots = async (req, res) => {
  try {
    const { visitorId } = req.body;

    const visitor = await Visitor.findById(visitorId)
    .populate("plots.statusId", "statusName colorCode")
      .populate({
    path: "plots.plotId",
    select: "plotCode plotNumber unitId",
    populate: {
      path: "unitId",
      select: "UnitName"
    }
  })

    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    res.status(200).json({ plots: visitor.plots });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.addFollowUp = async (req, res) => {
  try {
    const { visitorId, followUpDate, followUpDescription, followUpStatus, notes, remarks, followedUpById } = req.body;

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    const newFollowUp = {
      followUpDate,
      followUpDescription, 
      followUpStatus, 
      notes, 
      remarks,
      followedUpById
    };

    visitor.followUps.push(newFollowUp);
    await visitor.save();

    res.status(200).json({ message: "Follow-up added", visitor });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateFollowUp = async (req, res) => {
  try {
    const { visitorId, followUpId, followUpDate, followUpDescription, followUpStatus, notes, remarks, followedUpById } = req.body;

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    const followUp = visitor.followUps.find(f => f._id.toString() === followUpId);
    if (!followUp) return res.status(404).json({ message: "Follow-up not found" });

    if (followUpDate) followUp.followUpDate = followUpDate;
    if (remarks) followUp.remarks = remarks;
    if (followedUpById) followUp.followedUpById = followedUpById;
    if (notes) followUp.notes = notes
    if (followUpDescription) followUp.followUpDescription = followUpDescription
    if (followUpStatus) followUp.followUpStatus = followUpStatus

    await visitor.save();

    res.status(200).json({ message: "Follow-up updated", visitor });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteFollowUpFromPlot = async (req, res) => {
  try {
    const { visitorId,followUpId } = req.body;

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    const beforeCount = visitor.followUps.length;
    visitor.followUps = visitor.followUps.filter(f => f._id.toString() !== followUpId);

    if (beforeCount === visitor.followUps.length) {
      return res.status(404).json({ message: "Follow-up not found" });
    }

    await visitor.save();
    res.status(200).json({ message: "Follow-up deleted", visitor });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getVisitorFollowUps = async (req, res) => {
  try {
    const { visitorId} = req.body;

    const visitor = await Visitor.findById(visitorId)
      .populate("followUps.followedUpById");

    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    res.status(200).json({ followUps: visitor.followUps });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

