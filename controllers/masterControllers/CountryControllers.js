const Country = require("../../models/masterModels/Country");
// const State = require("../../models/masterModels/State");
const mongoose = require("mongoose");

// Fields to extract for the response
// const fieldsToExtract = ['_id', 'CityCode', 'CityName', 'isActive'];

// Create a new Country
exports.createCountry = async (req, res) => {
  try {
    const { CountryCode, CountryName, isActive } = req.body;

    // Check for duplicates (if needed)
    const existingCountry = await Country.findOne({
      $or: [{ CountryCode }, { CountryName }],
    });
    if (existingCountry) {
      return res
        .status(400)
        .json({ message: "Country with this code or name already exists" });
    }

    // const existingState = await State.findById(StateID);
    // if (!existingState) {
    //     return res.status(400).json({ message: 'Invalid StateID' });
    // }

    // Create and save the new City
    const country = new Country({
      CountryCode,
      CountryName,
      //   StateID,
      isActive,
    });
    await country.save();

    res.status(200).json({
      message: "Country created successfully",
      data: country._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all Country
exports.getAllCountry = async (req, res) => {
  try {
    //option 1 aggregate method
    // const { StateID } = req.body;
    let filter = {};
    // if(StateID){
    //     filter.StateID=new mongoose.Types.ObjectId(StateID)
    // }
    const country = await Country.aggregate([
      { $match: filter },
      //   {
      //     $lookup: {
      //       from: "states",
      //     //   localField: "StateID",
      //       foreignField: "_id",
      //       as: "StateInfo",
      //     },
      //   },
      {
        $unwind: {
          path: "$StateInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: "$_id",
          CountryCode: 1,
          CountryName: 1,
          //   StateID: "$StateInfo._id",
          StateCode: "$StateInfo.StateCode",
          StateName: "$StateInfo.StateName",
          isActive: 1,
        },
      },
    ]);
    // const city = City.find({filter})
    res.status(200).json(country);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single Country by name
exports.getCountryByName = async (req, res) => {
  try {
    const { CountryName } = req.body;
    const country = await Country.findOne({
      CountryName: CountryName,
    });
    // .populate("StateID", "StateName StateCode");

    if (!country) {
      return res.status(400).json({ message: "Country not found" });
    }

    res.status(200).json(country);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a Country
exports.updateCountry = async (req, res) => {
  try {
    const { _id, CountryCode, CountryName, isActive } = {
      ...req.body,
    };
    const country = await Country.findByIdAndUpdate(
      _id,
      { $set: { CountryCode, CountryName, isActive } },
      { new: true, runValidators: true }
    );

    if (!country) {
      return res.status(400).json({ message: "Country not found" });
    }

    res
      .status(200)
      .json({ message: "Country updated successfully", data: country });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a Country
exports.deleteCountry = async (req, res) => {
  try {
    const { _id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const country = await Country.findByIdAndDelete(_id);

    if (!country) {
      return res.status(400).json({ message: "Country not found" });
    }

    res.status(200).json({ message: "Country deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all states for dropdown
exports.getAllStates = async (req, res) => {
  //     try {
  //         const matchStage = {isActive:true}
  //         const states = await State.aggregate([
  //             { $match: matchStage }, // Apply filtering conditionally
  //             {
  //                 $project: {
  //                     _id: 0,
  //                     _id: '$_id',
  //                     StateCode: '$StateCode',
  //                     StateName: '$StateName',
  //                 }
  //             }
  //         ]);
  //         res.status(200).json({
  //             message: 'States fetched successfully',
  //             data: states
  //         });
  //     } catch (error) {
  //         res.status(500).json({ message: error.message });
  //     }
};
