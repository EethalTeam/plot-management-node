const mongoose = require('mongoose');

// Define the City Schema
const CountrySchema = new mongoose.Schema(
  {
    CountryCode: {
      type: String,
      required: true,
      
      trim: true
    },
    CountryName: {
      type: String,
      required: true,
      
      trim: true
    },
    StateID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'State', 
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
    }
  }, { timestamps: true }
);

// Create the Country Model
const Country = mongoose.model('Country', CountrySchema);

module.exports = Country;
