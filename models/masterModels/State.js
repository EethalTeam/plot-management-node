const mongoose = require('mongoose');

// Define the State Schema
const StateSchema = new mongoose.Schema(
  {
    StateCode: {
      type: String,
      required: true,
     
      trim: true
    },
    StateName: {
      type: String,
      required: true,
    
      trim: true
    },
     CountryID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Country', 
            required: true
          },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    isActive: {
      type: Boolean,
      default: true
    },
  },
  {
    timestamps: true
  }
);

// Create the State Model
const State = mongoose.model('State', StateSchema);

module.exports = State;
