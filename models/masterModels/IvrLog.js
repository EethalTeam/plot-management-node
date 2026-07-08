const mongoose = require('mongoose');

const CalledAgentSchema = new mongoose.Schema({
    agentName: { type: String, required: true, trim: true },
    agentNumber: { type: String, required: true, trim: true }
}, { _id: false });

const IvrLogSchema = new mongoose.Schema({
    callid: { type: String, required: true, unique: true, trim: true },
    agent_phone: { type: String, required: true, trim: true },
    customer_phone: { type: String, required: true, trim: true },
    status: { 
        type: String, 
        required: true, 
        enum: ['Answered', 'Unanswered', 'Missed', 'Busy', 'Failed'], 
        default: 'Answered' 
    },
    date: { type: String, required: true },
    time: { type: String, required: true },
    call_recording: { type: String, trim: true, default: null },
    calledAgents: [CalledAgentSchema],
    call_duration: {
        type: Number,
        required: false,
        // Safely converts empty strings "" or missing values to 0
        set: v => (v === "" || v === null || v === undefined) ? 0 : parseInt(v, 10)
    },
    total_call_duration: {
        type: Number,
        required: true,
        set: v => (v === "" || v === null) ? 0 : parseInt(v, 10)
    },
    Direction: { 
        type: String, 
        enum: ['inbound', 'outbound'], 
        default: 'inbound',
        trim: true 
    },
    did: { type: String, required: true, trim: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('IvrLog', IvrLogSchema);