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
      resource_type: "raw",      // 🔥 PDF/DOC ke liye
      type: "upload",            // 🔥 public access
      public_id: `${Date.now()}-${nameWithoutExt}`,
    };
  },
});

const upload = multer({ storage });

export default upload;
