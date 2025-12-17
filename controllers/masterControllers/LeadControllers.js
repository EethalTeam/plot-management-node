const Lead = require('../../models/masterModels/Leads'); // Adjust path
const path = require('path');
const fs = require('fs'); // For file system operations (e.g., deleting files)

const DOC_BASE_PATH = path.join(__dirname, '..', '..', 'lead_documents'); 

exports.createLead = async (req, res) => {
  const { 
    leadFirstName, leadLastName, leadEmail, leadPhone, leadJobTitle, leadLinkedIn, 
    leadAddress, leadCityId, leadStateId, leadCountryId, leadZipCode, 
    leadStatusId, leadSourceId, leadPotentialValue, leadScore, leadTags ,leadSiteId
  } = req.body;
  
  const uploadedFiles = req.files || []; 

  try {
    const existingLead = await Lead.findOne({ leadEmail });
    if (existingLead) {
      uploadedFiles.forEach(file => fs.unlinkSync(file.path));
      return res.status(400).json({ 
        success: false, 
        message: 'A lead with this email already exists.' 
      });
    }

    const leadDocument = uploadedFiles.map(file => ({
      fileName: file.originalname,
      fileUrl: file.path.replace(DOC_BASE_PATH, ''), // Save relative path or unique filename
    }));
    
    const initialHistory = {
        eventType: 'Lead Created',
        details: `Initial lead creation with status: ${leadStatusId}`,
        leadStatusId: leadStatusId 
    };

    const newLead = new Lead({
      leadFirstName, leadLastName, leadEmail, leadPhone, leadJobTitle, leadLinkedIn,
      leadAddress, leadCityId, leadStateId, leadCountryId, leadZipCode,
      leadStatusId, leadSourceId, leadPotentialValue, leadScore,leadSiteId,
      leadTags: leadTags ? (Array.isArray(leadTags) ? leadTags : leadTags.split(',')) : [], // Handle tags as comma-separated string or array
      leadDocument,
      leadHistory: [initialHistory]
    });

    const savedLead = await newLead.save();

    res.status(201).json({
      success: true,
      message: 'Lead created successfully with documents',
      data: savedLead
    });

  } catch (error) {
    console.error("Create Lead Error:", error);
    uploadedFiles.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) { console.error("Cleanup error:", e); }
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create lead', 
      error: error.message 
    });
  }
};

exports.getAllLeads = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.body;
    
    const skip = (page - 1) * limit;
    let query = {}; // MongoDB doesn't enforce isArchived, assuming you need to add it to your schema/model if you want soft delete

    if (status) {
      query.leadStatusId = status;
    }

    if (search) {
      query.$or = [
        { 'leadFirstName': { $regex: search, $options: 'i' } },
        { 'leadLastName': { $regex: search, $options: 'i' } },
        { 'leadEmail': { $regex: search, $options: 'i' } }
      ];
    }

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('leadStatusId', 'leadStatustName')
        .populate('leadSourceId', 'leadSourceName')
        .populate('leadCityId', 'CityName')
        .populate('leadStateId', 'StateName')
        .populate('leadCountryId', 'CountryName')
        .populate('leadAssignedId', 'EmployeeName')
        .populate('leadSiteId', 'sitename'),
      Lead.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: leads.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: leads
    });

  } catch (error) {
    console.error("Get All Leads Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLeadById = async (req, res) => {
  try {
    const { leadId } = req.body; 

    if (!leadId) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    const lead = await Lead.findById(leadId)
        .populate('leadStatusId', 'leadStatustName')
        .populate('leadSourceId', 'leadSourceName')
        .populate('leadCityId', 'CityName')
        .populate('leadStateId', 'StateName')
        .populate('leadCountryId', 'CountryName')
        .populate('leadAssignedId', 'EmployeeName')
        .populate('leadSiteId', 'sitename')
        .populate('leadHistory.employeeId', 'EmployeeName'); 

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({
      success: true,
      data: lead
    });

  } catch (error) {
    console.error("Get Lead by ID Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const { leadId, updateData, employeeId } = req.body; // employeeId is the user making the update

    if (!leadId) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    const oldLead = await Lead.findById(leadId);
    if (!oldLead) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    let historyEntry = null;

    if (updateData.leadStatusId && updateData.leadStatusId.toString() !== oldLead.leadStatusId.toString()) {
        historyEntry = {
            eventType: 'Status Change',
            details: `Status updated from ${oldLead.leadStatusId} to ${updateData.leadStatusId}`,
            employeeId: employeeId, 
            leadStatusId: updateData.leadStatusId 
        };
        updateData.$push = { leadHistory: historyEntry };
    }
    
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: updateData }, 
      { new: true, runValidators: true } 
    );

    if (!updatedLead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: updatedLead
    });

  } catch (error) {
    console.error("Update Lead Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// You must have a LeadStatus document with a known ID for 'Deleted' or 'Archived'.
exports.deleteLead = async (req, res) => {
  try {
    const { leadId, deletedStatusId } = req.body; // Pass the ID of the 'Deleted' status

    if (!leadId || !deletedStatusId) {
      return res.status(400).json({ success: false, message: 'Lead ID and Deleted Status ID are required' });
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { 
        leadStatusId: deletedStatusId,
        $push: { 
            leadHistory: {
                eventType: 'Lead Archived',
                details: 'Lead soft-deleted (archived) by setting status to Deleted.',
                leadStatusId: deletedStatusId
            }
        }
      },
      { new: true }
    );

    if (!updatedLead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Lead moved to archive status'
    });

  } catch (error) {
    console.error("Delete Lead Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addLeadDocument = async (req, res) => {
    const { leadId } = req.body;
    const uploadedFile = req.file;

    if (!leadId) {
        if (uploadedFile) fs.unlinkSync(uploadedFile.path); 
        return res.status(400).json({ success: false, message: 'Lead ID is required.' });
    }
    
    if (!uploadedFile) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const newDocument = {
        fileName: uploadedFile.originalname,
        fileUrl: uploadedFile.path.replace(DOC_BASE_PATH, ''), // Save relative path
        uploadDate: new Date()
    };
    
    const historyEntry = {
        eventType: 'Document Added',
        details: `Document uploaded: ${newDocument.fileName}`,
        // employeeId: req.user.id // Get from session/token
        // leadStatusId: oldLead.leadStatusId // Maintain current status in history
    };

    try {
        const updatedLead = await Lead.findByIdAndUpdate(
            leadId,
            { 
                $push: { 
                    leadDocument: newDocument,
                    leadHistory: historyEntry
                } 
            },
            { new: true }
        );

        if (!updatedLead) {
            // Clean up file if lead is not found
            fs.unlinkSync(uploadedFile.path); 
            return res.status(404).json({ success: false, message: 'Lead not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Document added and history logged.',
            data: updatedLead.leadDocument
        });

    } catch (error) {
        console.error("Add Document Error:", error);
        // Clean up file if DB update fails
        if (uploadedFile) fs.unlinkSync(uploadedFile.path);
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 7. ADD NOTE TO LEAD (Rename and map to leadHistory) ---
exports.addLeadNote = async (req, res) => {
    try {
      const { leadId, details, employeeId, leadStatusId } = req.body; // Capture current status if applicable
  
      if (!leadId || !details) {
        return res.status(400).json({ success: false, message: 'Lead ID and note details are required' });
      }

      // Check lead status if not provided, for history logging
      const lead = await Lead.findById(leadId, 'leadStatusId');
      if (!lead) {
          return res.status(404).json({ success: false, message: 'Lead not found' });
      }
      
      const newHistoryEntry = { 
          eventType: 'Note Added', 
          details: details, 
          employeeId: employeeId, // User making the note
          leadStatusId: leadStatusId || lead.leadStatusId // Use provided status or current status
      };
  
      const updatedLead = await Lead.findByIdAndUpdate(
        leadId,
        { $push: { leadHistory: newHistoryEntry } },
        { new: true }
      );
  
      res.status(200).json({
        success: true,
        message: 'Note added to lead history',
        data: updatedLead.leadHistory.slice(-1)[0] // Return the latest history entry
      });
  
    } catch (error) {
      console.error("Add Lead Note Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
};