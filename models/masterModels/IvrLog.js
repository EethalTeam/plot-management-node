const mongoose = require('mongoose');

const CalledAgentSchema = new mongoose.Schema({
    agentName: { 
        type: String,  
        trim: true,
        // If an empty string is passed, converts it to null or handles it cleanly
        set: v => v === "" ? null : v
    },
    agentNumber: { 
        type: String,  
        trim: true,
        set: v => v === "" ? null : v
    }
}, { _id: false });

const IvrLogSchema = new mongoose.Schema({
    callid: { type: String, required: true, unique: true, trim: true },
    agent_phone: { type: String, trim: true },
    customer_phone: { type: String, required: true, trim: true },
    status: { 
        type: String, 
        required: true, 
        enum: ['Answered', 'Unanswered', 'Hangup', 'Busy', 'Failed'], 
        default: 'Answered' 
    },
    date: { type: String, required: true },
    time: { type: String, required: true },
    call_recording: { type: String, trim: true, default: null },
    
    // Defaulting to an empty array ensures it won't break if the field is omitted
    calledAgents: {
        type: [CalledAgentSchema],
        default: []
    },
    
    call_duration: {
        type: Number,
        required: false,
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