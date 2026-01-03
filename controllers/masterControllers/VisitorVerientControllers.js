const mongoose = require('mongoose');

const VisitorVerient = require("../../models/masterModels/VisitorVerient");
// Create VisitorVerient
exports.createVisitorVerient = async (req, res) => {
  try {
  
    const { visitorVerientCode,visitorVerientName,isActive} = req.body;

    const existing = await VisitorVerient.findOne({ visitorVerientCode });
    if (existing) {
      return res.status(400).json({ message: "VisitorVerient code already exists." });
    }

    const Verient = new VisitorVerient({
      visitorVerientCode,visitorVerientName,isActive
    });

    const data = await Verient.save();
    res.status(201).json({ message: "VisitorVerient created successfully.", data });
  } catch (error) {
    res.status(500).json({ message: "Error creating VisitorVerient", error });
  }
};

// Get All VisitorVerient
exports.getAllVisitorVerient = async (req, res) => {
  try {
    
    const Verient = await VisitorVerient.find()
    if(!Verient){
        res.status(400).json({message:"Error on getAllVisitor Verient"})
    }
    res.status(200).json(Verient);
  } catch (error) {
    res.status(500).json({ message: "Error fetching Verient", error });
  }
};

// Get VisitorVerient By Name
exports.getVisitorVerientByName = async (req, res) => {
  try {
    const {visitorVerientName} = req.body
    const Verient = await VisitorVerient.findOne({visitorVerientName:visitorVerientName})
    if(!Verient){
         res.status(400).json({message:"Visitor Verient is Not Found"})
    }
    res.status(200).json(Verient);
  } catch (error) {
    res.status(500).json({ message: "Error fetching VisitorVerient", error });
  }
};

// Update VisitorVerient
exports.updateVisitorVerient = async (req, res) => {
  try {
    // Added siteId to destructuring
    const { _id, visitorVerientCode,visitorVerientName,isActive } = req.body;

    const updated = await VisitorVerient.findByIdAndUpdate(
      _id,
      {
        $set:{
          visitorVerientCode,
      visitorVerientName,
      isActive
      }
      },
    
     
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "VisitorVerient not found" });
    }

    res.status(200).json({ message: "VisitorVerient updated successfully",data:updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating VisitorVerient", error });
  }
};

// Soft Delete VisitorVerient
exports.deleteVisitorVerient = async (req, res) => {
    try {
        const { _id } = req.body;
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ message: 'Invalid ID' });
        }
        
        const Verient = await VisitorVerient.findByIdAndDelete(_id);

        if (!Verient) {
            return res.status(400).json({ message: 'VisitorVerient not found' });
        }

        res.status(200).json({ message: 'VisitorVerient deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};