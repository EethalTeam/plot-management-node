const Site = require('../../models/masterModels/Site');

// 1. CREATE Site
exports.createSite = async (req, res) => {
  try {
    // Destructure every field explicitly
    const { 
      sitename, 
      location, 
      city, 
      state, 
      totalArea, 
      zipcode, 
      address, 
      siteType, 
      subType, 
      description 
    } = req.body;

    // Prepare object to save
    const siteData = {};

    // Check if value exists before assigning
    if (sitename) siteData.sitename = sitename;
    if (location) siteData.location = location;
    if (city) siteData.city = city;
    if (state) siteData.state = state;
    if (totalArea) siteData.totalArea = totalArea;
    if (zipcode) siteData.zipcode = zipcode;
    if (address) siteData.address = address;
    if (siteType) siteData.siteType = siteType;
    if (subType) siteData.subType = subType;
    if (description) siteData.description = description;

    const newSite = new Site(siteData);
    const savedSite = await newSite.save();

    res.status(201).json({
      success: true,
      message: "Site created successfully",
      data: savedSite,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating site",
      error: error.message,
    });
  }
};

// 2. READ Properties (Kept same as before)
exports.getAllSites = async (req, res) => {
  try {
    const filters = req.body || {};
    console.log(filters,"filters")
    const properties = await Site.find(filters)
      .populate('city')
      .populate('state')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching properties",
      error: error.message,
    });
  }
};

// 3. UPDATE Site
exports.updateSite = async (req, res) => {
  try {
    // Destructure _id and all fields
    const { 
      _id,
      sitename, 
      location, 
      city, 
      state, 
      totalArea, 
      zipcode, 
      address, 
      siteType, 
      subType, 
      description 
    } = req.body;

    if (!_id) {
      return res.status(400).json({ success: false, message: "Site ID (_id) is required" });
    }

    // Prepare object for update
    const updateFields = {};

    // Check if value exists before adding to update object
    // This prevents overwriting existing data with null/undefined if the frontend sends empty fields
    if (sitename) updateFields.sitename = sitename;
    if (location) updateFields.location = location;
    if (city) updateFields.city = city;
    if (state) updateFields.state = state;
    if (totalArea) updateFields.totalArea = totalArea;
    if (zipcode) updateFields.zipcode = zipcode;
    if (address) updateFields.address = address;
    if (siteType) updateFields.siteType = siteType;
    if (subType) updateFields.subType = subType;
    if (description) updateFields.description = description;

    const updatedSite = await Site.findByIdAndUpdate(
      _id,
      updateFields,
      { new: true } // Return the updated document
    );

    if (!updatedSite) {
      return res.status(404).json({ success: false, message: "Site not found" });
    }

    res.status(200).json({
      success: true,
      message: "Site updated successfully",
      data: updatedSite,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating site",
      error: error.message,
    });
  }
};

// 4. DELETE Site (Kept same as before)
exports.deleteSite = async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({ success: false, message: "Site ID (_id) is required" });
    }

    const deletedSite = await Site.findByIdAndDelete(_id);

    if (!deletedSite) {
      return res.status(404).json({ success: false, message: "Site not found" });
    }

    res.status(200).json({
      success: true,
      message: "Site deleted successfully",
      data: deletedSite,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting site",
      error: error.message,
    });
  }
};

