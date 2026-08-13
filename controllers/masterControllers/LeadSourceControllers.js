 const mongoose = require('mongoose')
const LeadSource = require("../../models/masterModels/LeadSource");


 
exports.createLeadSource = async (req, res) => {
    try {
        const { leadSourceName, leadSourceCode, isActive } = req.body;

        // Create and save the new LeadStatus
        const leadsource = new LeadSource({ leadSourceName, leadSourceCode, isActive  });
        await leadsource.save();

        res.status(200).json({
            message: 'LeadSource created successfully',
            data: leadsource
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

 
exports.getAllLeadSource = async (req, res) => {
    try {
        const leadsource = await LeadSource.find()

        if (!leadsource) {
            return res.status(400).json({ message: "LeadSource is not find" })
        }
        res.status(200).json(leadsource);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

 
exports.getLeadSourceByName = async (req, res) => {
    try {
        const { leadSourceName } = req.body;

        const leadsource = await LeadSource.findOne({ leadSourceName: leadSourceName });

        if (!leadsource) {
            return res.status(404).json({
                success: false,
                message: "LeadSource not found",
            });
        }

        res.status(200).json({
            success: true,
            data: leadsource,
        });
    } catch (error) {
        console.error("Get LeadSource Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

 
exports.updateLeadSource = async (req, res) => {
    try {
        const { _id, leadSourceName, leadSourceCode, isActive   } = req.body;

        const leadsource = await LeadSource.findByIdAndUpdate(
            _id, {
            $set: {
                leadSourceCode,
                leadSourceName,
                isActive
            }
        },
            { new: true, runValidators: true }
        );

        if (!leadsource) {
            return res.status(404).json({
                success: false,
                message: "LeadSource not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "LeadSource updated successfully",
            data: leadsource,
        });
    } catch (error) {
        console.error("Update LeadSource Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


exports.deleteLeadSource = async (req, res) => {
    try {
        const { _id } = req.body;
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ message: 'Invalid ID' });
        }
        
        const leadsource = await LeadSource.findByIdAndDelete(_id);

        if (!leadsource) {
            return res.status(400).json({ message: 'LeadSource not found' });
        }

        res.status(200).json({ message: 'LeadSource deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};