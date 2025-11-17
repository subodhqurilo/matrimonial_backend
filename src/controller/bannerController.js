import BannerModel from "../modal/BannerModel.js";


export const uploadBanner = async (req, res) => {
  try {
    const file = req.files?.['banner']?.[0];

    if (!file) return res.status(400).json({ success: false, message: 'Banner image required' });

    const banner = await BannerModel.create({ image: file.path });

    res.status(201).json({ success: true, message: 'Banner uploaded', data: banner });
  } catch (error) {
    console.error('[Upload Banner Error]', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getBanners = async (req, res) => {
  try {
    const banners = await BannerModel.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    await BannerModel.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.files?.['banner']?.[0];

    if (!file) {
      return res.status(400).json({ success: false, message: 'New banner image is required' });
    }

    const updatedBanner = await BannerModel.findByIdAndUpdate(
      id,
      { image: file.path },
      { new: true }
    );

    if (!updatedBanner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    res.status(200).json({ success: true, message: 'Banner updated', data: updatedBanner });
  } catch (error) {
    console.error('[Update Banner Error]', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
