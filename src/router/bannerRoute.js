import express from 'express';
import {
  deleteBanner,
  getBanners,
  updateBanner,
  uploadBanner
} from '../controller/bannerController.js';

import upload from '../middlewares/multer.js';

const bannerRouter = express.Router();

bannerRouter.get('/', getBanners);

bannerRouter.post(
  '/',
  upload.fields([{ name: 'banner', maxCount: 5 }]), // MULTIPLE UPLOAD
  uploadBanner
);

bannerRouter.put(
  '/:id',
  upload.fields([{ name: 'banner', maxCount: 1 }]), // single update
  updateBanner
);

bannerRouter.delete('/:id', deleteBanner);

export default bannerRouter;
