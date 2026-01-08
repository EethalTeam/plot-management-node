const Lead = require('../../models/masterModels/Leads'); // Adjust path
const XLSX = require("xlsx");
const Employee = require('../../models/masterModels/Employee'); // Adjust path
const LeadStatus = require('../../models/masterModels/LeadStatus'); // Adjust path
const Visitor = require('../../models/masterModels/Visitor'); // Adjust path
const path = require('path');
const fs = require('fs'); // For file system operations (e.g., deleting files)
const { default: mongoose } = require('mongoose');
const e = require('cors');

const DOC_BASE_PATH = path.join(__dirname, '..', '..', 'lead_documents'); 

exports.createLead = async (req, res) => {
  const { 
  leadUnitId, leadCreatedById,  leadFirstName, leadLastName, leadEmail, leadPhone, leadJobTitle, leadLinkedIn, 
    leadAddress, leadCityId, leadStateId, leadCountryId, leadZipCode, leadNotes,leadDescription,
    leadStatusId, leadSourceId, leadPotentialValue, leadScore, leadTags ,leadSiteId, documentIds,leadAltPhone
  } = req.body;
  
  const uploadedFiles = req.files || []; 
  try {
    const existingLead = await Lead.findOne({ leadPhone });
    if (existingLead) {
      uploadedFiles.forEach(file => fs.unlinkSync(file.path));
      return res.status(400).json({ 
        success: false, 
        message: 'A lead with this phone already exists.' 
      });
      
    }

// const leadDocument = uploadedFiles.map((file, index) => ({
//       documentId: Array.isArray(documentIds) ? documentIds[index] : documentIds,
//       fileName: file.originalname,
//       fileUrl: file.path.replace(DOC_BASE_PATH, ''),
//     }));
// Before: fileUrl: file.path.replace(DOC_BASE_PATH, ''),
// After:
const leadDocument = uploadedFiles.map((file, index) => ({
    documentId: Array.isArray(documentIds) ? documentIds[index] : documentIds,
    fileName: file.originalname,
    fileUrl: file.filename, 
}));
    const LeadStatusExists = await LeadStatus.findById(leadStatusId);
    if (!LeadStatusExists) {
      uploadedFiles.forEach(file => fs.unlinkSync(file.path));
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid Lead Status ID provided.' 
      });
    }
    
    const initialHistory = {
        eventType: 'Lead Created',
        details: `Initial lead creation with status: ${LeadStatusExists.leadStatustName}`,
        leadStatusId: leadStatusId 
    };


  // res.status(201).json({purpose :'testing'})
 let createData={
       leadCreatedById,
       leadFirstName,
       leadLastName,
       leadEmail,
       leadPhone,
       leadDescription,
       leadJobTitle,
       leadLinkedIn,
       leadAddress,
       leadCityId,
       leadStateId,
       leadCountryId,
       leadZipCode,
       leadAltPhone,
       leadPotentialValue,
       leadScore,
       leadSiteId,
       leadNotes,
       leadTags: leadTags ? (Array.isArray(leadTags) ? leadTags : leadTags.split(',')) : [], // Handle tags as comma-separated string or array
       leadDocument,
       leadHistory: [initialHistory]
    }
    if(leadUnitId){
        createData.leadUnitId=leadUnitId
    }
    if(leadStatusId){
        createData.leadStatusId=leadStatusId
    }else{
      const LeadStatusExists1 = await LeadStatus.findById({leadStatusName:'New'});
    if (!LeadStatusExists1) {
      uploadedFiles.forEach(file => fs.unlinkSync(file.path)); 
      return res.status(400).json({
        success: false,
        message: 'Invalid Lead Status ID provided.'
      });
    }
   
        createData.leadStatusId=LeadStatusExists1._id;
        
    }
    if(leadSourceId){
      
        createData.leadSourceId=leadSourceId
    }else{
        const LeadSourceExists = await LeadStatus.findOne({leadSourceName:'Referral'});
    if (!LeadSourceExists && leadSourceId) {
      uploadedFiles.forEach(file => fs.unlinkSync(file.path));
      return res.status(400).json({ 
        success: false,
        message: 'Invalid Lead Source ID provided.' 
      });
    }
        createData.leadSourceId=LeadSourceExists._id
    }
    const newLead = new Lead(createData);

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
    const { page = 1, limit = 20, status, search,EmployeeId } = req.body;
    
    const skip = (page - 1) * limit;
    let query = {}; // MongoDB doesn't enforce isArchived, assuming you need to add it to your schema/model if you want soft delete

    if (status) {
      query.leadStatusId = status;
    }
    if(EmployeeId){
       query.$or = [
     { leadCreatedById:new mongoose.Types.ObjectId(EmployeeId)},
      {leadAssignedId:new mongoose.Types.ObjectId(EmployeeId)}
       ]
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
        .populate('leadSiteId', 'sitename')
        .populate('leadUnitId','UnitName'),
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
        .populate('leadUnitId','UnitName')

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
  const uploadedFiles = req.files || [];

  try {
    const {
      leadId,
      employeeName,
      leadAssignedId,
      leadHistory,
      documentIds,
      existingDocs,
      leadCreatedById,
      ...updateData
    } = req.body;

    if (!leadId) {
      uploadedFiles.forEach((file) => fs.unlinkSync(file.path));
      return res.status(400).json({ success: false, message: "Lead ID is required" });
    }

    const oldLead = await Lead.findById(leadId);
    if (!oldLead) {
      uploadedFiles.forEach((file) => fs.unlinkSync(file.path));
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const updatedData = { ...updateData };
    let finalDocuments = [];
    
    if (existingDocs) {
      try {
        const retainedDocs = JSON.parse(existingDocs);
        finalDocuments = Array.isArray(retainedDocs) ? retainedDocs : [retainedDocs];
      } catch (e) {
        console.error("Error parsing existingDocs:", e);
      }
    }

    if (uploadedFiles.length > 0) {
      const newDocuments = uploadedFiles.map((file, index) => ({
        documentId: Array.isArray(documentIds) ? documentIds[index] : documentIds || null,
        fileName: file.originalname,
        fileUrl: file.filename,
        uploadDate: new Date(),
      }));
      finalDocuments = [...finalDocuments, ...newDocuments];
    }
    updatedData.leadDocument = finalDocuments;

    let historyEntries = [];
    const oldLeadStatusName = oldLead.leadStatusId ? (await LeadStatus.findById(oldLead.leadStatusId)).leadStatustName : "N/A";
    const newLeadStatusName = updatedData.leadStatusId ? (await LeadStatus.findById(updatedData.leadStatusId)).leadStatustName : oldLeadStatusName;
    if (updatedData.leadStatusId && updatedData.leadStatusId.toString() !== oldLead.leadStatusId?.toString()) {
      historyEntries.push({
        eventType: "Status Change",
        details: `Status updated from ${oldLeadStatusName} to ${newLeadStatusName} by ${employeeName}`,
        employeeName: employeeName,
        leadStatusId: updatedData.leadStatusId,
        timestamp: new Date(),
      });

      const targetStatus = await LeadStatus.findById(updatedData.leadStatusId);
      if (targetStatus && targetStatus.leadStatustName === "Site Visit") {
        const ExistingVisitor = await Visitor.findOne({ visitorMobile: oldLead.leadPhone, isActive: true });
        if (!ExistingVisitor) {
        const latestVisitor = await Visitor.findOne({}).sort({ visitorCode: -1 }).select("visitorCode");
        
        let newCode = "VIS00001";
        if (latestVisitor && latestVisitor.visitorCode) {
          const lastCode = latestVisitor.visitorCode;
          const numberPart = parseInt(lastCode.replace("VIS", ""));
          newCode = "VIS" + (numberPart + 1).toString().padStart(5, "0");
        }

        const newVisitor = new Visitor({
          visitorCode: newCode,
          visitorName: `${oldLead.leadFirstName} ${oldLead.leadLastName}`.trim(),
          visitorEmail: oldLead.leadEmail,
          visitorMobile: oldLead.leadPhone,
          visitorWhatsApp: oldLead.leadPhone || "",
          cityId: oldLead.leadCityId,
          visitorAddress: oldLead.leadAddress,
          employeeId: oldLead.leadCreatedById || oldLead.leadAssignedId,
          description: `Converted from Lead. Original Notes: ${oldLead.leadNotes || ""}`,
          isActive: true,
        });

        await newVisitor.save();
      }
      }
    }

    if (updatedData.leadScore && updatedData.leadScore !== oldLead.leadScore) {
      historyEntries.push({
        eventType: "Score Update",
        details: `Score updated from ${oldLead.leadScore || "N/A"} to ${updatedData.leadScore} by ${employeeName}`,
        employeeName: employeeName,
        timestamp: new Date(),
      });
    }

    if (updatedData.leadNotes && updatedData.leadNotes !== oldLead.leadNotes) {
      historyEntries.push({
        eventType: "Note Update",
        details: `Note updated: ${updatedData.leadNotes} by ${employeeName}`,
        employeeName: employeeName,
        timestamp: new Date(),
      });
    }

    if (uploadedFiles.length > 0) {
      historyEntries.push({
        eventType: "Document Upload",
        details: `${uploadedFiles.length} new document(s) uploaded by ${employeeName}`,
        employeeName: employeeName,
        timestamp: new Date(),
      });
    }
    if (!updatedData.leadUnitId) {
  delete updatedData.leadUnitId;
}
    const updateQuery = { $set: updatedData };

    if (historyEntries.length > 0) {
      updateQuery.$push = {
        leadHistory: { $each: historyEntries },
      };
    }

    const updatedLead = await Lead.findByIdAndUpdate(leadId, updateQuery, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: updatedLead,
    });

  } catch (error) {
    console.error("Update Lead Error:", error);
    uploadedFiles.forEach((file) => {
      try { fs.unlinkSync(file.path); } catch (e) {}
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- ASSIGN LEAD TO EMPLOYEE ---
exports.assignLead = async (req, res) => {
    try {
        const { leadId, leadAssignedId, employeeName } = req.body;

        if (!leadId || !leadAssignedId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Both Lead ID and Assignee ID are required.' 
            });
        }

        // Fetch lead to get current assignee and status for history
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found.' });
        }
        const assignedemployee = await Employee.findById(leadAssignedId);
        if (!assignedemployee) {
            return res.status(404).json({ success: false, message: 'Assigned Employee not found.' });
        }

        const historyEntry = {
            eventType: 'Lead Assigned',
            details: `Lead assigned to ${assignedemployee.EmployeeName} by ${employeeName || 'System'}`,
            employeeName: employeeName || 'System',
            leadStatusId: lead.leadStatusId,
            timestamp: new Date()
        };

        const updatedLead = await Lead.findByIdAndUpdate(
            leadId,
            { 
                $set: { leadAssignedId: leadAssignedId },
                $push: { leadHistory: historyEntry }
            },
            { new: true, runValidators: true }
        ).populate('leadAssignedId', 'EmployeeName');

        res.status(200).json({
            success: true,
            message: 'Lead assigned successfully',
            data: updatedLead
        });

    } catch (error) {
        console.error("Assign Lead Error:", error);
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
    const { leadId, documentId, employeeName,leadFile } = req.body;
    const uploadedFile = leadFile;

    if (!leadId) {
        if (uploadedFile) fs.unlinkSync(uploadedFile.path); 
        return res.status(400).json({ success: false, message: 'Lead ID is required.' });
    }
    
    if (!uploadedFile) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    try {
        const currentLead = await Lead.findById(leadId);
        if (!currentLead) {
            if (uploadedFile) fs.unlinkSync(uploadedFile.path);
            return res.status(404).json({ success: false, message: 'Lead not found.' });
        }

        const newDocument = {
            documentId: documentId || null, // Reference to Document master
            fileName: uploadedFile.originalname,
            fileUrl: uploadedFile.path, // Or use .replace() for relative paths
            uploadDate: new Date()
        };
        
        const historyEntry = {
            timestamp: new Date(),
            eventType: 'Document Uploaded',
            details: `Attached document: ${uploadedFile.originalname}`,
            employeeName: employeeName || null, // Who uploaded it
            leadStatusId: currentLead.leadStatusId // The status at the time of upload
        };

        const updatedLead = await Lead.findByIdAndUpdate(
            leadId,
            { 
                $push: { 
                    leadDocument: newDocument,
                    leadHistory: historyEntry
                } 
            },
            { new: true, runValidators: true }
        ).populate('leadDocument.documentId', 'documentName'); // Optional: populate master doc info

        res.status(200).json({
            success: true,
            message: 'Document uploaded and interaction logged successfully.',
            data: updatedLead.leadDocument
        });

    } catch (error) {
        console.error("Add Document Error:", error);
        // Clean up physical file if database operation fails
        if (uploadedFile && fs.existsSync(uploadedFile.path)) {
            fs.unlinkSync(uploadedFile.path);
        }
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};





//  exports.importLeads = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No file uploaded"
//       });
//     }

//     const workbook = XLSX.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

//     if (!rows.length) {
//       fs.unlinkSync(req.file.path);
//       return res.status(400).json({
//         success: false,
//         message: "Excel is empty"
//       });
//     }

//     const leadsToInsert = [];
//     const skipped = [];

//     // 🔹 Fetch existing phones once (performance)
//     const existingPhones = new Set(
//       (await Lead.find({}, "leadPhone")).map(l => l.leadPhone)
//     );

//     for (const row of rows) {
//       const name =
//         row["full_name"] ||
//         row["Full Name"] ||
//         row["name"] ||
//         "";

//       let phone = row["Phone"]?.toString().replace(/\D/g, "");

//       if (!name || !phone) continue;

//       // Normalize phone (91 + 10 digits)
//       if (phone.length === 10) phone = "91" + phone;
//       if (phone.length !== 12) {
//         skipped.push(phone);
//         continue;
//       }

//       // Duplicate check
//       if (existingPhones.has(phone)) {
//         skipped.push(phone);
//         continue;
//       }

//       // Lookups

// const descriptionParts = [];

// if (row["what_is_your_preferred_plot_size?"]) {
//   descriptionParts.push(
//     `Preferred Plot Size: ${row["what_is_your_preferred_plot_size?"]}`
//   );
// }

// if (row["are_you_planning_to_build_soon?"]) {
//   descriptionParts.push(
//     `Planning to Build: ${row["are_you_planning_to_build_soon?"]}`
//   );
// }

// if (row["would_you_like_a_site_visit?"]) {
//   descriptionParts.push(
//     `Site Visit: ${row["would_you_like_a_site_visit?"]}`
//   );
// }

// const leadDescription = descriptionParts.join("\n");

// const leadNotes = row["Status"]?.trim() || "";

//       const site = row["Site"]
//         ? await mongoose.model("Site").findOne({ sitename: row["Site"].trim() })
//         : null;

//       const status = row["Status"]
//         ? await LeadStatus.findOne({ leadStatustName: row["Status"].trim() })
//         : null;

//       const employee = row["Assigned To"]
//         ? await Employee.findOne({ EmployeeName: row["Assigned To"].trim() })
//         : null;
       
//         const city = row["city"]
//   ? await mongoose.model("City").findOne({
//       CityName: new RegExp(`^${row["city"].trim()}$`, "i")
//     })
//   : null;

        

//       leadsToInsert.push({
//         leadFirstName: name.trim(),
//         leadPhone: phone,
//         leadEmail: row["email"]?.trim() || "",
//         leadSiteId: site?._id || null,
//         leadStatusId: status?._id || null,
//         leadAssignedId: employee?._id || null,
//         leadCityId: city?._id || null,
//         leadDescription,
//         leadNotes,
//         leadHistory: [
//           {
//             eventType: "Lead Imported",
//             details: "Imported via Excel",
//             leadStatusId: status?._id || null,
//             timestamp: new Date()
//           }
//         ]
//       });

//       existingPhones.add(phone); // prevent duplicates in same file
//     }

//     // Delete uploaded file
//     fs.unlinkSync(req.file.path);

//     if (!leadsToInsert.length) {
//       return res.status(400).json({
//         success: false,
//         message: "No valid leads found",
//         skipped
//       });
//     }

//     await Lead.insertMany(leadsToInsert);

//     res.status(200).json({
//       success: true,
//       message: `${leadsToInsert.length} leads imported successfully`,
//       skipped
//     });

//   } catch (error) {
//     console.error("IMPORT ERROR:", error);

//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }

//     res.status(500).json({
//       success: false,
//       message: "Excel import failed",
//       error: error.message
//     });
//   }
// };


exports.importLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Excel is empty"
      });
    }

    const leadsToInsert = [];
    const skipped = [];

    // 🔹 Get existing phones once
    const existingPhones = new Set(
      (await Lead.find({}, "leadPhone")).map(l => l.leadPhone)
    );

    for (const row of rows) {

   
      const name =
        row["full_name"] ||
        row["Full Name"] ||
        row["name"] ||
        "";

   
      const phoneRaw =
        row["phone_number"] ||
        row["Phone"] ||
        row["Mobile"] ||
        "";

      let phone = phoneRaw.toString().replace(/\D/g, "");

      if (!name || !phone) continue;

      // Normalize phone (91 + 10 digits)
      if (phone.length === 10) phone = "91" + phone;
      if (phone.length !== 12) {
        skipped.push(phone);
        continue;
      }

      // Duplicate check
      if (existingPhones.has(phone)) {
        skipped.push(phone);
        continue;
      }

    
      const email =
        row["email"] ||
        row["Email"] ||
        "";

      const cityRaw =
        row["city"] ||
        row["City"] ||
        "";
      const cleanCity = cityRaw
        ? cityRaw.toString().split(",")[0].trim()
        : "";
      const city = cleanCity
        ? await mongoose.model("City").findOne({
            CityName: new RegExp(`^${cleanCity}$`, "i")
          })
        : null;

      const descriptionParts = [];

      if (row["what_is_your_preferred_plot_size?"]) {
        descriptionParts.push(
          `Preferred Plot Size: ${row["what_is_your_preferred_plot_size?"]}`
        );
      }

      if (row["are_you_planning_to_build_soon?"]) {
        descriptionParts.push(
          `Planning to Build: ${row["are_you_planning_to_build_soon?"]}`
        );
      }

      if (row["would_you_like_a_site_visit?"]) {
        descriptionParts.push(
          `Site Visit: ${row["would_you_like_a_site_visit?"]}`
        );
      }

      const leadDescription = descriptionParts.join("\n");

   
      const leadNotes = row["Status"]?.trim() || "";

  
      const status = row["Status"]
        ? await LeadStatus.findOne({
            leadStatustName: new RegExp(`^${row["Status"].trim()}$`, "i")
          })
        : null;

   
     const site = row["Site"]
      ? await mongoose.model("Site").findOne({ sitename: row["Site"].trim() })
       : null;

      const employee = row["Assigned To"]
        ? await Employee.findOne({
            EmployeeName: new RegExp(`^${row["Assigned To"].trim()}$`, "i")
          })
        : null;

    
      leadsToInsert.push({
        leadFirstName: name.trim(),
        leadPhone: phone,
        leadEmail: email.trim(),
        leadCityId: city?._id || null,
         leadSiteId: site?._id || null,
        leadStatusId: status?._id || null,
        leadAssignedId: employee?._id || null,
        leadDescription,
        leadNotes,
        leadHistory: [
          {
            eventType: "Lead Imported",
            details: "Imported via Excel",
            leadStatusId: status?._id || null,
            timestamp: new Date()
          }
        ]
      });

      existingPhones.add(phone);
    }

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    if (!leadsToInsert.length) {
      return res.status(400).json({
        success: false,
        message: "No valid leads found",
        skipped
      });
    }

    await Lead.insertMany(leadsToInsert);

    res.status(200).json({
      success: true,
      message: `${leadsToInsert.length} leads imported successfully`,
      skipped
    });

  } catch (error) {
    console.error("IMPORT ERROR:", error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Excel import failed",
      error: error.message
    });
  }
};



// --- 7. ADD NOTE TO LEAD (Rename and map to leadHistory) ---
exports.addLeadNote = async (req, res) => {
    try {
      const { leadId, details,leadNotes, employeeName, leadStatusId ,FollowDate,SiteVisitDate} = req.body; // Capture current status if applicable
  
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
          details: `Note updated: ${details} by ${employeeName}`,
          employeeName: employeeName, // User making the note
          leadStatusId: leadStatusId || lead.leadStatusId // Use provided status or current status
      };
  
      const updatedLead = await Lead.findByIdAndUpdate(
        leadId,
        { $set: { leadNotes: leadNotes ,SiteVisitDate:SiteVisitDate,FollowDate:FollowDate,leadStatusId:leadStatusId }, $push: { leadHistory: newHistoryEntry } },
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