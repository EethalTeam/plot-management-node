const mongoose = require('mongoose')
const Country = require('../../models/masterModels/Country')
const State = require('../../models/masterModels/State');

// Fields to extract for the response
// const fieldsToExtract = ['_id', 'StateCode', 'StateName', 'isActive'];

// Create a new State
exports.createState = async (req, res) => {
    try {
        const { StateCode, StateName, isActive,CountryID } = req.body;

        // Check for duplicates (if needed)
        const existingState = await State.findOne({ 
            $or: [
                { StateCode }, 
                { StateName }
            ] 
        });
        if (existingState) {
            return res.status(400).json({ message: 'State with this code or name already exists' });
        }
        // Create and save the new State
        const state = new State({ StateCode, StateName , isActive ,CountryID});
        await state.save();

        res.status(200).json({ 
            message: 'State created successfully', 
            data: state._id 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all States
// exports.getAllStates = async (req, res) => {
//     try {
      
//         const state= await State.find()
//         if(!state){
//             res.status(400).json({message:"State not found"})
//         }
//         res.status(200).json(state);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };


exports.getAllStates = async (req, res) => {
    try {
        //option 1 aggregate method
        const {CountryID} = req.body
        let filter={}
        if(CountryID){
            filter.CountryID=new mongoose.Types.ObjectId(CountryID)
        }
        const state = await State.aggregate([
            {$match:filter},
            {
            $lookup:{
                from:'countries',
                localField:'CountryID',
                foreignField:'_id',
                as:'CountryInfo'
            }
        },
        {
            $unwind:{
                path:"$CountryInfo",
                preserveNullAndEmptyArrays:true
            }
        },
        {
            $project:{
            
                _id:'$_id',
                StateCode:1,
                StateName:1,
                CountryID:'$CountryInfo._id',
                CountryCode:'$CountryInfo.CountryCode',
                CountryName:'$CountryInfo.CountryName',
                isActive:1
            }
        }
    ])
    // const city = City.find({filter})
        res.status(200).json(state);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Get a single State by name
exports.getStateByName = async (req, res) => {
    try {
        const {StateName} = req.body
        const state = await State.findOne({ StateName: StateName }) .populate('CountryID', 'CountryName CountryCode');
    
        if (!state) {
            return res.status(400).json({ message: 'State not found' });
        }

        res.status(200).json(state);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a State
exports.updateState = async (req, res) => {
    try {
        const {_id,StateCode,StateName,isActive,CountryID} = {...req.body};
        const state = await State.findByIdAndUpdate(
            _id,
            { $set:{StateCode,StateName,isActive,CountryID}},
            { new: true, runValidators: true }
        );

        if (!state) {
            return res.status(400).json({ message: 'State not found' });
        }

        res.status(200).json({ message: 'State updated successfully', data: state });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a State
exports.deleteState = async (req, res) => {
    try {
        const { _id } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ message: 'Invalid ID' });
        }
        
        const state = await State.findByIdAndDelete(_id);

        if (!state) {
            return res.status(400).json({ message: 'State not found' });
        }

        res.status(200).json({ message: 'State deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Get all Country for dropdown
exports.getAllCountry = async (req, res) => {
    try {
        const matchStage = {isActive:true}
       
        const country = await Country.aggregate([
            { $match: matchStage }, // Apply filtering conditionally
            {
                $project: {
                    _id: 0,
                    _id: '$_id',
                    CountryCode: '$CountryCode',
                    CountryName: '$CountryName',
                }
            }
        ]);
        res.status(200).json({
            message: 'Country fetched successfully',
            data: country
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
