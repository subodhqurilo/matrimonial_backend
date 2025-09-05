import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../utils/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'register_profiles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

const upload = multer({ storage });
export default upload;
