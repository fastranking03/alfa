// File: uploadConfig.js
import multer from 'multer';
import path from 'path';

// Set up Multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './banner_images'); // Folder to save images
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with timestamp
    }
});

const upload = multer({ storage: storage });
export default upload;


