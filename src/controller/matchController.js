import MatchModel from '../modal/MatchModel.js';
import fs from 'fs';
import cloudinary from '../utils/cloudinary.js';

// ✅ Create a new match testimonial
export const createMatch = async (req, res) => {
  try {
    const { quote, name, partnerName } = req.body;
    const imageFile = req.files?.image?.[0];

    if (!imageFile || !quote || !name || !partnerName) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(imageFile.path, {
      folder: 'matches',
      use_filename: true,
      unique_filename: false,
    });

    // Remove temporary file
    fs.unlinkSync(imageFile.path);

    const newMatch = new MatchModel({
      image: result.secure_url,
      quote,
      name,
      partnerName,
    });

    await newMatch.save();

    res.status(201).json({
      success: true,
      message: 'Match testimonial created successfully.',
      data: newMatch,
    });
  } catch (error) {
    console.error('Create Match Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// ✅ Get all match testimonials with optional pagination
export const getAllMatches = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const matches = await MatchModel.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMatches = await MatchModel.countDocuments();

    res.status(200).json({
      success: true,
      page,
      limit,
      total: totalMatches,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    console.error('Get Matches Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};
