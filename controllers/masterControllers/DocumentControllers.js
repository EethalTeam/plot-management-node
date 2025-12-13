const mongoose = require('mongoose')
const Document = require("../../models/masterModels/Document");


/**
 * @desc    Create Document
 * @route   POST /api/document/create
 */
exports.createDocument = async (req, res) => {
    try {
        const { documentCode, documentName, isActive } = req.body;

        // Create and save the new Document
        const document = new Document({ documentCode, documentName, isActive });
        await document.save();

        res.status(200).json({
            message: 'Document created successfully',
            data: document
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/**
 * @desc    Get All Documents
 * @route   POST /api/document/getAll
 */
exports.getAllDocument = async (req, res) => {
    try {
        const document = await Document.find()

        if (!document) {
            return res.status(400).json({ message: "Documents is not find" })
        }
        res.status(200).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get Single Document
 * @route   POST /api/document/getById
 */
exports.getDocumentByName = async (req, res) => {
    try {
        const { documentName } = req.body;

        const document = await Document.findOne({ documentName: documentName });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        res.status(200).json({
            success: true,
            data: document,
        });
    } catch (error) {
        console.error("Get Document Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

/**
 * @desc    Update Document
 * @route   POST /api/document/update
 */
exports.updateDocument = async (req, res) => {
    try {
        const { _id, documentCode, documentName, isActive } = req.body;

        const document = await Document.findByIdAndUpdate(
            _id, {
            $set: {
                documentCode,
                documentName,
                isActive,
            }
        },
            { new: true, runValidators: true }
        );

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Document updated successfully",
            data: document,
        });
    } catch (error) {
        console.error("Update Document Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

/**
 * @desc    Soft Delete Document
 * @route   POST /api/document/delete
 */
exports.deleteDocument = async (req, res) => {
    try {
        console.log(req,"req.body")
        const { _id } = req.body;
        console.log(_id,"id")
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ message: 'Invalid ID' });
        }
        
        const document = await Document.findByIdAndDelete(_id);

        if (!document) {
            return res.status(400).json({ message: 'Document not found' });
        }

        res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};