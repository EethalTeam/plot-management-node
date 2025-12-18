const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. DEFINE DIRECTORY PATH
// This points to 'lead_documents' in your project root
const uploadDir = path.join(__dirname, '..', 'lead_documents');

// 2. AUTOMATICALLY CREATE FOLDER IF MISSING
// This prevents the "no such file or directory" error
if (!fs.existsSync(uploadDir)) {
    console.log("🚀 Creating upload directory...");
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 3. STORAGE CONFIGURATION
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        // Create unique file name: fieldname-timestamp-random.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// 4. FILE FILTER (Security Check)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Accept file
    } else {
        cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'), false); // Reject file
    }
};

// 5. INITIALIZE MULTER
const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 1024 * 1024 * 5 // 5MB Limit per file
    },
    fileFilter: fileFilter 
});

// 6. EXPORT DIRECTLY
// This ensures that 'upload.array' or 'upload.single' works in your routes
module.exports = upload;