const Unit = require("../../models/masterModels/Unit");

// Create Unit
exports.createUnit = async (req, res) => {
  try {
    // Added siteId to destructuring
    const { siteId, UnitName, UnitCode, UnitType, UnitLocation, addressLine, geoLocation, description } = req.body;

    if (!UnitCode) {
      return res.status(400).json({ message: "unitCode is required." });
    }

    const existing = await Unit.findOne({ UnitCode });
    if (existing) {
      return res.status(400).json({ message: "Unit code already exists." });
    }

    const unit = new Unit({
      siteId, // Added siteId here
      UnitName,
      UnitCode,
      UnitType,
      UnitLocation,
      addressLine,
      geoLocation,
      description,
    });

    const data = await unit.save();
    res.status(201).json({ message: "Unit created successfully.", data });
  } catch (error) {
    res.status(500).json({ message: "Error creating unit", error });
  }
};

// Get All Units
exports.getAllUnits = async (req, res) => {
  try {
    // 1. Base query: always get active units
    const query = { isActive: true };

    // 2. Filter by siteId if provided in body
    if (req.body.siteId) {
      query.siteId = req.body.siteId;
    }

    // 3. Find using the query object
    const units = await Unit.find(query)
      .populate('siteId') // Optional: Populates site details if needed
      .sort({ createdAt: -1 });

    res.status(200).json(units);
  } catch (error) {
    res.status(500).json({ message: "Error fetching units", error });
  }
};

// Get Unit By ID
exports.getUnitById = async (req, res) => {
  try {
    const unit = await Unit.findById(req.body._id).populate('siteId');
    if (!unit || !unit.isActive) {
      return res.status(404).json({ message: "Unit not found" });
    }
    res.status(200).json(unit);
  } catch (error) {
    res.status(500).json({ message: "Error fetching unit", error });
  }
};

// Update Unit
exports.updateUnit = async (req, res) => {
  try {
    // Added siteId to destructuring
    const { siteId, UnitName, UnitCode, UnitType, UnitLocation, addressLine, geoLocation, description } = req.body;

    const updated = await Unit.findByIdAndUpdate(
      req.body.id,
      { 
        siteId, // Added siteId here
        UnitName, 
        UnitCode, 
        UnitType, 
        UnitLocation, 
        addressLine, 
        geoLocation, 
        description 
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Unit not found" });
    }

    res.status(200).json({ message: "Unit updated successfully", unit: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating unit", error });
  }
};

// Soft Delete Unit
exports.deleteUnit = async (req, res) => {
  try {
    const deleted = await Unit.findByIdAndUpdate(
      req.body._id,
      { isActive: false },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ message: "Unit not found" });
    }

    res.status(200).json({ message: "Unit deleted (soft) successfully", unit: deleted });
  } catch (error) {
    res.status(500).json({ message: "Error deleting unit", error });
  }
};