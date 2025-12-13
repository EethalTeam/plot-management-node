const Lead = require('../../models/masterModels/Leads'); // Adjust path to your Lead model

// --- 1. CREATE LEAD ---
exports.createLead = async (req, res) => {
  try {
    // Destructure expected fields to prevent unwanted data injection
    const { 
      contactInfo, 
      companyDetails, 
      leadStatus, 
      leadSource, 
      assignedAgent,
      tags 
    } = req.body;

    // Check for duplicates (Optional but recommended)
    const existingLead = await Lead.findOne({ 'contactInfo.email': contactInfo.email });
    if (existingLead) {
      return res.status(400).json({ 
        success: false, 
        message: 'A lead with this email already exists.' 
      });
    }

    const newLead = new Lead({
      contactInfo,
      companyDetails,
      leadStatus,
      leadSource,
      assignedAgent,
      tags
    });

    const savedLead = await newLead.save();

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: savedLead
    });

  } catch (error) {
    console.error("Create Lead Error:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create lead', 
      error: error.message 
    });
  }
};

// --- 2. GET ALL LEADS (With Pagination & Filtering via POST) ---
exports.getAllLeads = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.body;
    
    const skip = (page - 1) * limit;
    let query = { isArchived: false }; // Default: don't show deleted leads

    // Filter by Status
    if (status) {
      query.leadStatus = status;
    }

    // Search Logic (Name, Email, Company)
    if (search) {
      query.$or = [
        { 'contactInfo.firstName': { $regex: search, $options: 'i' } },
        { 'contactInfo.lastName': { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
        { 'companyDetails.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch leads and total count
    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(Number(limit))
        .populate('assignedAgent', 'name email',).populate('documentID','documentName'), // Populate agent details if needed
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 3. GET SINGLE LEAD BY ID ---
exports.getLeadById = async (req, res) => {
  try {
    const { leadId } = req.body; // ID from body

    if (!leadId) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    const lead = await Lead.findById(leadId).populate('assignedAgent', 'name email').populate('documentID','documentName');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({
      success: true,
      data: lead
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 4. UPDATE LEAD ---
exports.updateLead = async (req, res) => {
  try {
    const { leadId, updateData } = req.body;

    if (!leadId) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    // Update and return the new document
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: updateData },
      { new: true, runValidators: true } // new: true returns the updated doc
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 5. DELETE LEAD (Soft Delete) ---
exports.deleteLead = async (req, res) => {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    // Soft delete: Set isArchived to true
    const deletedLead = await Lead.findByIdAndUpdate(
      leadId,
      { isArchived: true },
      { new: true }
    );

    // If you prefer HARD delete (remove from DB completely), use:
    // const deletedLead = await Lead.findByIdAndDelete(leadId);

    if (!deletedLead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Lead moved to archive'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 6. ADD NOTE TO LEAD (Helper for CRM) ---
exports.addLeadNote = async (req, res) => {
  try {
    const { leadId, text, userId } = req.body; // userId is the agent adding the note

    if (!leadId || !text) {
      return res.status(400).json({ success: false, message: 'Lead ID and note text are required' });
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { 
        $push: { 
          notes: { 
            text, 
            createdBy: userId, 
            createdAt: new Date() 
          } 
        } 
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Note added',
      data: updatedLead.notes
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};