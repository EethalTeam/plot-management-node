const TELECMI_USER_ID = "5002_33336639";
const TELECMI_USER_PASSWORD = "admin@123";

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

const normalizeInCall = (call,status) => ({
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
    console.log(userToken,"userToken")
    if (!userToken) {
      throw new Error('Failed to authenticate with Telecmi');
    }
    console.log('Successfully got token, now fetching logs...');

    const toTimestamp = Date.now();
    const fromTimestamp = toTimestamp - 7 * 24 * 60 * 60 * 1000;

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
    const normIncomingAnswered = (incomingAnswered.cdr || []).map(call=>normalizeInCall(call, 'Answered'));
    const normIncomingMissed = (incomingMissed.cdr || []).map(call=>normalizeInCall(call, 'Missed'));
    
    // For outgoing, we pass the status we already know
    const normOutgoingAnswered = (outgoingAnswered.cdr || []).map(call => normalizeOutCall(call, 'Answered'));
    const normOutgoingMissed = (outgoingMissed.cdr || []).map(call => normalizeOutCall(call, 'Missed'));

    console.log(normIncomingAnswered,"incomingAnswered")
console.log(normIncomingMissed,"incomingMissed")
console.log(normOutgoingAnswered,"outgoingAnswered")
console.log(normOutgoingMissed,"outgoingMissed")

    const allCalls = [
      ...normIncomingAnswered,
      ...normIncomingMissed,
      ...normOutgoingAnswered,
      ...normOutgoingMissed,
    ];

    allCalls.sort((a, b) => b.time - a.time);
const TELECMI_APP_ID = 33336639;
const TELECMI_APP_SECRET = 'd18ce16a-5b80-49be-b682-072eaf3e85b7';
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