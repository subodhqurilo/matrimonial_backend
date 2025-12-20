import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";
import path from "path";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const nameWithoutExt = path.parse(file.originalname).name;

    return {
      folder: "chat-files",

      // ✅ AUTO = image + video + raw (ALL FILES)
      resource_type: "auto",

      type: "upload", // public access

      public_id: `${Date.now()}-${nameWithoutExt}`,
    };
  },
});

const upload = multer({
  storage,

  // ❌ No file type restriction
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },

  // ✅ Optional size limit (remove if you want unlimited)
  limits: {
    fileSize: 1024 * 1024 * 100, // 100MB
  },
});

export default upload;
//hgj