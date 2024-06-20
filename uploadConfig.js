// File: uploadConfig.js
import multer from "multer";
import path from "path";

// Set up Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder;
    if (req.originalUrl.includes("/add-banner")) {
      folder = "./banner_images/";
    } else if (req.originalUrl.includes("/new-category-submit")) {
      folder = "./category_images/";
    }
    else if(req.originalUrl.includes("/add-blog")){
      folder = "./blog_images/";
    }

    cb(null, folder); // Folder to save images
  },
  
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with timestamp
  },
});

const upload = multer({ storage: storage });
export default upload;
