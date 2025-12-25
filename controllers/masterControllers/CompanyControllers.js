 const mongoose = require('mongoose')
const Company = require("../../models/masterModels/Company");


 
exports.createCompany = async (req, res) => {
    try {
        const {
             companyCode,
             companyName, 
             companyEmail,
             companyPhone,
             companyAlternatePhone,
             companyAddress,
             companyCity,
             companyState,
             companyCountry,
             companyPincode,
             companyGstNumber,
             companyWebsite,
             isActive} = req.body;
          
            // Check for duplicates (if needed)
        const existingCompany = await Company.findOne({ 
            $or: [
                { companyCode }, 
                { companyName }
            ] 
        });
        if (existingCompany) {
            return res.status(400).json({ message: 'Company with this code or name already exists' });
        }


        // Create and save the new Company
        const company = new Company({companyCode,
             companyName, 
             companyEmail,
             companyPhone,
             companyAlternatePhone,
             companyAddress,
             companyCity,
             companyState,
             companyCountry,
             companyPincode,
             companyGstNumber,
             companyWebsite,
              isActive 
             });
        await company.save();

        res.status(200).json({
            message: 'Company created successfully',
            data: leadsource
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

 
exports.getAllCompany = async (req, res) => {
    try {
        const company = await Company.find()

        if (!company) {
            return res.status(400).json({ message: "Company is not find" })
        }
        res.status(200).json(company);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

 
exports.getCompanyByName = async (req, res) => {
    try {
        const { companyName } = req.body;

        const company = await Company.findOne({ companyName: companyName });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }

        res.status(200).json({
            success: true,
            data: company,
        });
    } catch (error) {
        console.error("Get Company Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

 
exports.updateCompany = async (req, res) => {
    try {
        const { _id,
             companyCode,
             companyName, 
             companyEmail,
             companyPhone,
             companyAlternatePhone,
             companyAddress,
             companyCity,
             companyState,
             companyCountry,
             companyPincode,
             companyGstNumber,
             companyWebsite,
              isActive   } = req.body;

        const company = await Company.findByIdAndUpdate(
            _id, {
            $set: {
                 companyCode,
             companyName, 
             companyEmail,
             companyPhone,
             companyAlternatePhone,
             companyAddress,
             companyCity,
             companyState,
             companyCountry,
             companyPincode,
             companyGstNumber,
             companyWebsite,
             isActive
            }
        },
            { new: true, runValidators: true }
        );

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Company updated successfully",
            data: company,
        });
    } catch (error) {
        console.error("Update LeadSource Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


exports.deleteCompany = async (req, res) => {
    try {
        const { _id } = req.body;
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ message: 'Invalid ID' });
        }
        
        const company = await Company.findByIdAndDelete(_id);

        if (!company) {
            return res.status(400).json({ message: 'Company not found' });
        }

        res.status(200).json({ message: 'Company deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};