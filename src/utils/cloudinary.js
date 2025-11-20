// import { v2 as cloudinary } from 'cloudinary';

// cloudinary.config({
//   cloud_name: "doexczvsl",
//   api_key: "317459483338729",
//   api_secret: "CXFQgDVn3pxFmtpsfDxIvY1CWqg",
// });

// export default cloudinary;
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
