 const mongoose = require('mongoose')
const LeadStatus = require("../../models/masterModels/LeadStatus");


 
exports.createLeadStatus = async (req, res) => {
    try {
        const { leadStatusCode, leadStatustName,leadStatusColor,leadStatusTextColor, isActive } = req.body;

        // Create and save the new LeadStatus
        const leadstatus = new LeadStatus({ leadStatusCode, leadStatustName,leadStatusColor,leadStatusTextColor, isActive });
        await leadstatus.save();

        res.status(200).json({
            message: 'LeadStatus created successfully',
            data: leadstatus
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

 
exports.getAllLeadStatus = async (req, res) => {
    try {
        const leadstatus = await LeadStatus.find()

        if (!leadstatus) {
            return res.status(400).json({ message: "LeadStatus is not find" })
        }
        res.status(200).json(leadstatus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

 
exports.getLeadStatusByName = async (req, res) => {
    try {
        const { leadStatustName } = req.body;

        const leadstatus = await LeadStatus.findOne({ leadStatustName: leadStatustName });

        if (!leadstatus) {
            return res.status(404).json({
                success: false,
                message: "LeadStatus not found",
            });
        }

        res.status(200).json({
            success: true,
            data: leadstatus,
        });
    } catch (error) {
        console.error("Get LeadStatus Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

 
exports.updateLeadStatus = async (req, res) => {
    try {
        const { _id, leadStatusCode, leadStatustName,leadStatusColor,leadStatusTextColor, isActive  } = req.body;

        const leadstatus = await LeadStatus.findByIdAndUpdate(
            _id, {
            $set: {
                leadStatusCode,
                leadStatustName,
                leadStatusColor,
                leadStatusTextColor,
                isActive
            }
        },
            { new: true, runValidators: true }
        );

        if (!leadstatus) {
            return res.status(404).json({
                success: false,
                message: "LeadStatus not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "LeadStatus updated successfully",
            data: leadstatus,
        });
    } catch (error) {
        console.error("Update LeadStatus Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


exports.deleteLeadStatus = async (req, res) => {
    try {
        console.log(req,"req.body")
        const { _id } = req.body;
        console.log(_id,"id")
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ message: 'Invalid ID' });
        }
        
        const leadstatus = await LeadStatus.findByIdAndDelete(_id);

        if (!leadstatus) {
            return res.status(400).json({ message: 'LeadStatus not found' });
        }

        res.status(200).json({ message: 'LeadStatus deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};