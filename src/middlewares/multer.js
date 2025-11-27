import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "chat-files",           // Folder name for chat files
      resource_type: "auto",          // 🔥 MOST IMPORTANT (supports image, video, pdf, docs)
      allowed_formats: [
        "jpg", "png", "jpeg", "gif",
        "webp", "svg", "bmp", "tiff", "ico",
        "mp4", "mov", "avi", "mkv",
        "pdf", "doc", "docx", "xls", "xlsx", "txt"
      ],
      public_id: `${Date.now()}-${file.originalname}`, // unique file name
    };
  },
});

const upload = multer({ storage });

export default upload;
