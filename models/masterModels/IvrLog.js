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
    did: { type: String, required: true, trim: true },

    // Populated by the free local faster-whisper script
    // (plot-management-node/scripts/transcribe_calls.py) — no external API,
    // no per-minute cost. Left unset until that script runs; the existing
    // /CallLogs/getIvrCallLogs endpoint already returns the whole document,
    // so nothing else needs to change for these to appear over the API.
    // transcript is the flattened "Speaker: text" version (also what
    // analyze_sentiment.py reads); transcriptTurns is the same content
    // structured per utterance for the UI to render as a real conversation.
    // Recordings from this PBX are real stereo with each call leg on its
    // own channel, so turns come from transcribing each channel separately
    // and merging by timestamp — not speaker-diarization guesswork.
    transcript: { type: String, trim: true, default: null },
    transcriptLanguage: { type: String, trim: true, default: null },
    transcribedAt: { type: Date, default: null },
    transcriptTurns: {
        type: [{
            speaker: { type: String, enum: ['agent', 'customer'] },
            start: Number,
            end: Number,
            text: String,
        }],
        default: undefined,
    },

    // Populated by scripts/analyze_sentiment.py — a cheap hosted LLM call
    // (Groq), not a free local classifier. Three free local multilingual
    // sentiment models were tested against real transcripts first and none
    // gave reliable signal on this noisy, code-switched Tamil/Hindi/English
    // content, so this uses real language understanding instead.
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: null },
    sentimentReason: { type: String, trim: true, default: null },
    summary: { type: String, trim: true, default: null },

    // Manual post-call outcome logging (PostCallActionModal.jsx) — a rep's
    // own qualification/follow-up-date/note about how the call went, not
    // AI-derived. Same fixed 6-stage slug set as Lead.leadStatusId's
    // frontend representation (components/ui/leadMeta.js's STATUS_META),
    // kept as a plain string here rather than a LeadStatus ref since this is
    // an annotation on the call, not a write to the lead's own pipeline
    // status.
    outcomeQualificationStatus: {
        type: String,
        enum: ['new', 'contacted', 'site-visit-scheduled', 'negotiation', 'booked', 'lost'],
        default: null,
    },
    outcomeFollowUpDate: { type: Date, default: null },
    outcomeNote: { type: String, trim: true, default: null },
    outcomeLoggedAt: { type: Date, default: null },
    outcomeLoggedById: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
}, {
    timestamps: true
});

module.exports = mongoose.model('IvrLog', IvrLogSchema);