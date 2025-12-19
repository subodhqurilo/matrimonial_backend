import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";
import path from "path";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // ✅ remove extension from original filename
    const nameWithoutExt = path.parse(file.originalname).name;

    return {
      folder: "chat-files",
      resource_type: "auto",
      allowed_formats: [
        "jpg", "png", "jpeg", "gif",
        "webp", "svg", "bmp", "tiff", "ico",
        "mp4", "mov", "avi", "mkv",
        "pdf", "doc", "docx", "xls", "xlsx", "txt"
      ],
      // ✅ public_id WITHOUT extension
      public_id: `${Date.now()}-${nameWithoutExt}`,
    };
  },
});

const upload = multer({ storage });

export default upload;
