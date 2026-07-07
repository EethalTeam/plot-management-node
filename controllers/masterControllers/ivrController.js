const IvrLog = require('../../models/masterModels/IvrLog');

exports.saveIvrWebhook = async (req, res) => {
    try {
        const payload = req.body;
console.log("Received IVR webhook payload:", payload);
        // 1. Basic validation check for required payload presence
        if (!payload || !payload.callid) {
            return res.status(400).json({
                success: false,
                message: "Invalid payload data. Missing 'callid'."
            });
        }

        // 2. Check for existing callid to handle IVR webhook retries gracefully
        const existingCall = await IvrLog.findOne({ callid: payload.callid });
        if (existingCall) {
            return res.status(200).json({
                success: true,
                message: "Duplicate webhook ignored. Call log already exists.",
                data: existingCall
            });
        }

        // 3. Create and save the new IVR document
        const newIvrLog = new IvrLog(payload);
        const savedLog = await newIvrLog.save();

        // 4. Respond back to IVR system with 201 Created
        return res.status(201).json({
            success: true,
            message: "IVR call log saved successfully.",
            data: savedLog
        });

    } catch (error) {
        console.error("Error in saveIvrWebhook:", error);
        
        // Handle mongoose validation or duplicate key errors
        return res.status(500).json({
            success: false,
            message: "Internal Server Error while saving IVR log.",
            error: error.message
        });
    }
};