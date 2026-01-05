const mongoose = require('mongoose');
const TelecmiLog = require('../../models/masterModels/TeleCMICallLog');
const Lead = require('../../models/masterModels/Leads'); // Adjust path


const TELECMI_USER_ID = "5002_33336639";
const TELECMI_USER_PASSWORD = "admin@123";
const TELECMI_APP_ID = 33336639;
const TELECMI_APP_SECRET = 'd18ce16a-5b80-49be-b682-072eaf3e85b7';

const TELECMI_API_BASE_URL = 'https://rest.telecmi.com/v2/user';

const getTelecmiToken = async () => {
  console.log('Generating new Telecmi User Token...');
  const response = await fetch(`${TELECMI_API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: TELECMI_USER_ID,
      password: TELECMI_USER_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to login to Telecmi. Check User ID/Password.');
  }

  const data = await response.json();

  return data.token;
};

const TELECMI_TOKEN = 'd18ce16a-5b80-49be-b682-072eaf3e85b7';

const fetchTelecmiData = async (endpoint, body, token) => {
  const apiBody = {
    ...body,
    token: token,
  };

  const response = await fetch(`${TELECMI_API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Telecmi API Error (${response.status})`, errorData);
    throw new Error(errorData.message || `Telecmi API request failed`);
  }
  return response.json();
};

const normalizeInCall = (call, status) => ({
  cmiuid: call.cmiuid,
  direction: 'Inbound',
  status: status,
  from: call.from,
  to: call.to,
  time: call.time,
  answeredsec: call.answeredsec,
  filename: call.filename,
});


const normalizeOutCall = (call, status) => ({
  cmiuid: call.cmiuid,
  direction: 'Outbound',
  status: status,
  from: call.from,
  to: call.to,
  time: call.time,
  answeredsec: call.duration || call.billedsec || 0,
  filename: call.filename,
});

exports.fetchAllCallLogs = async (req, res) => {
  try {
    const userToken = await getTelecmiToken();
    console.log(userToken, "userToken")
    if (!userToken) {
      throw new Error('Failed to authenticate with Telecmi');
    }
    console.log('Successfully got token, now fetching logs...');

    const toTimestamp = Date.now();
    const fromTimestamp = toTimestamp - 17 * 24 * 60 * 60 * 1000;

    const requestBody = {
      from: fromTimestamp,
      to: toTimestamp,
      page: 1,
      limit: 10,
    };

    const [
      incomingAnswered,
      incomingMissed,
      outgoingAnswered,
      outgoingMissed,
    ] = await Promise.all([
      fetchTelecmiData('in_cdr', { ...requestBody, type: 1 }, userToken),
      fetchTelecmiData('in_cdr', { ...requestBody, type: 0 }, userToken),
      fetchTelecmiData('out_cdr', { ...requestBody, type: 1 }, userToken),
      fetchTelecmiData('out_cdr', { ...requestBody, type: 0 }, userToken),
    ]);

    // --- 4. NORMALIZE THE DATA ---
    const normIncomingAnswered = (incomingAnswered.cdr || []).map(call => normalizeInCall(call, 'Answered'));
    const normIncomingMissed = (incomingMissed.cdr || []).map(call => normalizeInCall(call, 'Missed'));

    // For outgoing, we pass the status we already know
    const normOutgoingAnswered = (outgoingAnswered.cdr || []).map(call => normalizeOutCall(call, 'Answered'));
    const normOutgoingMissed = (outgoingMissed.cdr || []).map(call => normalizeOutCall(call, 'Missed'));

    console.log(normIncomingAnswered, "incomingAnswered")
    console.log(normIncomingMissed, "incomingMissed")
    console.log(normOutgoingAnswered, "outgoingAnswered")
    console.log(normOutgoingMissed, "outgoingMissed")

    const allCalls = [
      ...normIncomingAnswered,
      ...normIncomingMissed,
      ...normOutgoingAnswered,
      ...normOutgoingMissed,
    ];

    allCalls.sort((a, b) => b.time - a.time);
    const callsWithRecording = allCalls.map(call => {
      let recordingUrl = null;
      if (call.filename) {
        recordingUrl = `https://rest.telecmi.com/v2/play?appid=${TELECMI_APP_ID}&secret=${TELECMI_APP_SECRET}&file=${call.filename}`;
      }
      return { ...call, recordingUrl };
    });
    res.status(200).json({
      success: true,
      count: callsWithRecording.length,
      calls: callsWithRecording,
    });

  } catch (error) {
    console.error('Error in fetchAllCallLogs:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};


exports.handleTelecmiWebhook = async (req, res) => {
  try {
    const payload = req.body;

    if (!payload) {
      return res.status(400).send('No payload received');
    }

    console.log('--- Telecmi Webhook Received ---', payload);
    // console.log(payload); // Uncomment to debug

    const newLog = new TelecmiLog({
      ...payload,

      // Convert timestamp to Date object
      callDate: new Date(payload.time)
    });

    await newLog.save();

    console.log(`Saved ${payload.direction} log: ${payload.cmiuuid}`);
    res.status(200).json({ success: true, message: "Data Saved" });

  } catch (error) {
    if (error.code === 11000) {
      console.warn('Duplicate call log ignored.');
      return res.status(200).json({ success: true, message: "Duplicate received" });
    }

    console.error('Error saving webhook:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCallLogs = async (req, res) => {
  try {
    // 1. Destructure query parameters for filtering & pagination
    const {
      page = 1,
      limit = 10,
      direction,
      status,
      search,
      startDate,
      endDate,
      TelecmiID,
      role
    } = req.body;
    console.log(req.body,"req.body")

    // 2. Build the Query Object
    const query = {};

    // Filter by Direction (inbound/outbound)
    if (direction) {
      query.direction = direction;
    }

    //  ROLE + TELECMI SECURITY RULE
    if (role === 'AGENT' && !TelecmiID) {
      return res.status(200).json({ data: [] });
    }

    if ( TelecmiID ) {
      query.user = TelecmiID;
    }

    // Filter by Status (answered/missed)
    if (status) {
      query.status = status;
    }

    // Filter by Date Range (using the 'callDate' field we created)
    if (startDate || endDate) {
      query.callDate = {};
      if (startDate) query.callDate.$gte = new Date(startDate);
      if (endDate) query.callDate.$lte = new Date(endDate);
    }

    // Search functionality (Search by Agent Name, From Number, or To Number)
    if (search) {
      const searchRegex = new RegExp(search, 'i'); // Case-insensitive regex
      query.$or = [
        { user: searchRegex },        // Agent ID
        { team: searchRegex },        // Team Name
      ];

      // If search term is a number, check exact match on numeric fields
      if (!isNaN(search)) {
        query.$or.push({ from: Number(search) });
        query.$or.push({ to: Number(search) });
        query.$or.push({ virtualnumber: Number(search) });
      }
    }

    // 3. Pagination Logic
    const skip = (page - 1) * limit;

    // 4. Fetch Data (Run query and count in parallel for performance)
    const [logs, total] = await Promise.all([
      TelecmiLog.find(query)
        .sort({ callDate: -1 }) // Sort by newest first
        .skip(skip)
        .limit(Number(limit))
        .lean(), // .lean() is CRITICAL here. It returns plain JS objects we can modify.
      TelecmiLog.countDocuments(query)
    ]);

    // 5. Transform the logs to include the Audio URL
    // const logsWithAudio = logs.map(log => {
    //   let recordingUrl = null;

    //   if (log.filename) {
    //     // Construct the Telecmi Play URL
    //     recordingUrl = `https://rest.telecmi.com/v2/play?appid=${TELECMI_APP_ID}&secret=${TELECMI_APP_SECRET}&file=${log.filename}`;
    //   }

    //   return {
    //     ...log, // Spread existing properties
    //     recordingUrl: recordingUrl // Add the new URL field
    //   };
    // });

  // ====================== LEAD NAME MAPPING (CORRECT SCHEMA) ======================

// 1. Collect customer phone numbers from call logs
const phoneNumbers = logs
  .map(log => {
    if (log.direction === 'inbound' || log.direction === 'Inbound') {
      return log.from ? String(log.from) : null;
    } else {
      return log.to ? String(log.to) : null;
    }
  })
  .filter(Boolean);

// 2. Fetch matching leads using leadPhone
const leads = await Lead.find({
  leadPhone: { $in: phoneNumbers }
})
  .select('leadFirstName leadLastName leadPhone')
  .lean();

// 3. Create phone → leadName map
const leadPhoneMap = {};
leads.forEach(lead => {
  leadPhoneMap[lead.leadPhone] =
    `${lead.leadFirstName || ''} ${lead.leadLastName || ''}`.trim();
});

// 4. Attach recordingUrl + leadName to each call log
const logsWithAudio = logs.map(log => {
  let recordingUrl = null;

  if (log.filename) {
    recordingUrl = `https://rest.telecmi.com/v2/play?appid=${TELECMI_APP_ID}&secret=${TELECMI_APP_SECRET}&file=${log.filename}`;
  }

  const customerPhone =
    (log.direction === 'inbound' || log.direction === 'Inbound')
      ? String(log.from || '')
      : String(log.to || '');

  return {
    ...log,
    recordingUrl,
    leadName: leadPhoneMap[customerPhone] || null   //  FINAL FIX
  };
});


    

    // 6. Send Response
    res.status(200).json({
      success: true,
      count: logsWithAudio.length,
      total,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + logsWithAudio.length < total,
        hasPrevPage: page > 1
      },
      data: logsWithAudio
    });

  } catch (error) {
    console.error('Error fetching call logs:', error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.qualifyCallLog = async (req, res) => {
  try {
    const { logId } = req.body; // Assuming you pass the _id of the call log in the URL

    // 1. Fetch the Call Log
    const callLog = await TelecmiLog.findById(logId);

    if (!callLog) {
      return res.status(404).json({ success: false, message: 'Call log not found' });
    }

    // 2. Determine the Customer's Phone Number
    // Based on your schema notes: Inbound = 'from' is customer, Outbound = 'to' is customer
    let customerPhone = '';

    if (callLog.direction === 'inbound') {
      customerPhone = callLog.from ? String(callLog.from) : '';
    } else {
      // outbound
      customerPhone = callLog.to ? String(callLog.to) : '';
    }

    if (!customerPhone) {
      return res.status(400).json({ success: false, message: 'No customer phone number found in this log' });
    }

    // 3. Check if Lead already exists (Optional but recommended)
    const existingLead = await Lead.findOne({
      'contactInfo.phone': customerPhone
    });

    if (existingLead) {
      return res.status(409).json({
        success: false,
        message: 'Lead already exists with this phone number',
        lead: existingLead
      });
    }

    // 4. Prepare Data for New Lead
    // Since we don't know the name yet, we use a placeholder or the number itself
    const newLeadData = {
      contactInfo: {
        firstName: 'Unknown Caller', // Sales agent will update this later
        lastName: customerPhone,      // Helpful for searching
        phone: customerPhone,
        email: `${customerPhone}@placeholder.com`, // Placeholder to satisfy 'required' validation if exists
      },
      leadSource: 'Call Logs', // Or 'Cold Call' / 'Inbound'
      leadStatus: 'New',
      // 5. Map Contextual Data to Notes or Custom Fields
      // We create an initial note with the call recording and details
      notes: [
        {
          text: `Auto-qualified from Call Log. 
            Duration: ${callLog.answeredsec}s. 
            Status: ${callLog.status}. 
            Recording: ${callLog.filename || 'N/A'}`,
          createdAt: new Date()
        }
      ]
    };

    // 6. Create and Save the Lead
    const newLead = await Lead.create(newLeadData);

    // 7. (Optional) Update Call Log to indicate it was converted
    // You might want to add a 'isQualified' or 'leadId' field to your TelecmiSchema later
    // await TelecmiLog.findByIdAndUpdate(logId, { convertedToLead: newLead._id });

    return res.status(201).json({
      success: true,
      message: 'Call successfully qualified as a Lead',
      data: newLead
    });

  } catch (error) {
    console.error('Error qualifying lead:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};