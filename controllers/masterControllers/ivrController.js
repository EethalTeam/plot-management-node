const IvrLog = require('../../models/masterModels/IvrLog');


exports.saveIvrWebhook = async (req, res) => {
    try {
        const payload = req.body;

        if (!payload || !payload.callid) {
            return res.status(400).json({
                success: false,
                message: "Invalid payload data. Missing 'callid'."
            });
        }

        // Handle webhook retries
        const existingCall = await IvrLog.findOne({ callid: payload.callid });
        if (existingCall) {
            return res.status(200).json({
                success: true,
                message: "Duplicate webhook ignored. Call log already exists.",
                data: existingCall
            });
        }

        // Create and save document (The setters in schema handle empty string conversions)
        const newIvrLog = new IvrLog(payload);
        const savedLog = await newIvrLog.save();

        return res.status(201).json({
            success: true,
            message: "IVR call log saved successfully.",
            data: savedLog
        });

    } catch (error) {
        console.error("Error in saveIvrWebhook:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error while saving IVR log.",
            error: error.message
        });
    }
};