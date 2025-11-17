import MatchModel from '../modal/MatchModel.js';

export const createMatch = async (req, res) => {
  try {
    const { quote, name, partnerName } = req.body;

    const imageFile = req.files?.image?.[0];

    if (!imageFile || !quote || !name || !partnerName) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const newMatch = new MatchModel({
      image: imageFile.path,
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
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

export const getAllMatches = async (req, res) => {
  try {
    const matches = await MatchModel.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: matches,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
}