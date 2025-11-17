import express from 'express';
import { deleteBanner, getBanners, updateBanner, uploadBanner } from '../controller/bannerController.js';
import upload from '../middlewares/multer.js';
 

const bannerRouter = express.Router();

bannerRouter.get('/', getBanners);
bannerRouter.post('/', upload.fields([{ name: 'banner', maxCount: 1 }]), uploadBanner);
bannerRouter.delete('/:id', deleteBanner);
bannerRouter.put('/:id',upload.fields([{ name: 'banner', maxCount: 1 }]), updateBanner);

export default bannerRouter;
