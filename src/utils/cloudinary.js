import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dppe3ni5z",
  api_key: process.env.CLOUDINARY_API_KEY || "568216858376623",
  api_secret: process.env.CLOUDINARY_API_SECRET || "OOvfM-6pzXeFK50lcKvjgRie6qU",
});

export default cloudinary;
