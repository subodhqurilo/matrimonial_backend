import BannerModel from "../modal/BannerModel.js";
import cloudinary from "../utils/cloudinary.js";

/** ---------------------------
 *  Upload MULTIPLE Banners
 * --------------------------- */
export const uploadBanner = async (req, res) => {
  try {
    const files = req.files?.banner;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one banner image is required",
      });
    }

    const uploadedBanners = [];

    for (const file of files) {
      const banner = await BannerModel.create({
        image: file.path,        // Cloudinary URL
        publicId: file.filename, // Cloudinary public ID
      });

      uploadedBanners.push(banner);
    }

    return res.status(201).json({
      success: true,
      message: "Banners uploaded successfully",
      data: uploadedBanners,
    });
  } catch (error) {
    console.error("Upload Banner Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


/** ---------------------------
 *  Get ALL banners
 * --------------------------- */
export const getBanners = async (req, res) => {
  try {
    const banners = await BannerModel.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error("Get Banners Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


/** ---------------------------
 *  Delete Banner (Cloudinary safe delete)
 * --------------------------- */
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await BannerModel.findById(id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    if (banner.publicId) {
      await cloudinary.uploader.destroy(banner.publicId);
    }

    await BannerModel.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Banner deleted" });
  } catch (error) {
    console.error("Delete Banner Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


/** ---------------------------
 *  Update a Banner (replace image)
 * --------------------------- */
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.files?.banner?.[0];

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "New banner image is required",
      });
    }

    const banner = await BannerModel.findById(id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    // Delete old image from Cloudinary
    if (banner.publicId) {
      await cloudinary.uploader.destroy(banner.publicId);
    }

    banner.image = file.path;        // new Cloudinary URL
    banner.publicId = file.filename; // new Cloudinary Public ID
    await banner.save();

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: banner,
    });
  } catch (error) {
    console.error("Update Banner Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
