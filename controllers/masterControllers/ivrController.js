const IvrLog = require('../../models/masterModels/IvrLog');
const { insertIvrLog } = require('../../utils/supabaseClient');


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
            // Best-effort backfill in case a prior attempt failed to sync to Supabase
            insertIvrLog(existingCall).catch(pgError => {
                console.error("Error syncing duplicate IVR log to Supabase:", pgError.message);
            });

            return res.status(200).json({
                success: true,
                message: "Duplicate webhook ignored. Call log already exists.",
                data: existingCall
            });
        }

        // Create and save document (The setters in schema handle empty string conversions)
        const newIvrLog = new IvrLog(payload);
        const savedLog = await newIvrLog.save();

        // Mirror the log into Supabase. Mongo remains the source of truth,
        // so a Supabase failure is logged but must not fail this request.
        try {
            await insertIvrLog(savedLog);
        } catch (pgError) {
            console.error("Error syncing IVR log to Supabase:", pgError.message);
        }

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