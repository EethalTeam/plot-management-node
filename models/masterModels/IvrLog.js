const mongoose = require('mongoose');

const CalledAgentSchema = new mongoose.Schema({
    agentName: {
        type: String,
        required: true,
        trim: true
    },
    agentNumber: {
        type: String,
        required: true,
        trim: true
    }
}, { _id: false }); // Prevents creating unnecessary nested IDs

const IvrLogSchema = new mongoose.Schema({
    callid: {
        type: String,
        required: true,
        unique: true, // Assuming callid is unique from the IVR system
        trim: true
    },
    agent_phone: {
        type: String,
        required: true,
        trim: true
    },
    customer_phone: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Answered', 'Missed', 'Busy', 'Failed', 'No Answer'], // Extend as needed
        default: 'Answered'
    },
    date: {
        type: String, // Kept as String to preserve "YYYY/MM/DD" format or parse later
        required: true
    },
    time: {
        type: String, // Kept as String for "HH:MM:SS" format
        required: true
    },
    call_recording: {
        type: String,
        trim: true,
        default: null
    },
    calledAgents: [CalledAgentSchema],
    call_duration: {
        type: Number, // Casted to Number for easier querying/analytics
        required: true,
        set: v => parseInt(v, 10)
    },
    total_call_duration: {
        type: Number, // Casted to Number
        required: true,
        set: v => parseInt(v, 10)
    },
    did: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('IvrLog', IvrLogSchema);