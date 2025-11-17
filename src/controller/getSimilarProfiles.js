// controllers/similarProfileController.js

import RegisterModel from "../modal/register.js";


export const getSimilarProfiles = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const user = await RegisterModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const query = {
      _id: { $ne: userId },
      caste: user.caste,
      employedIn: user.employedIn,
      gender: user.gender === 'Male' ? 'Female' : 'Male',
      dateOfBirth: {
        $gte: new Date(new Date(user.dateOfBirth).setFullYear(user.dateOfBirth.getFullYear() - 2)),
        $lte: new Date(new Date(user.dateOfBirth).setFullYear(user.dateOfBirth.getFullYear() + 2)),
      },
    };

    const similarUsers = await RegisterModel.find(query)
      .select('firstName lastName profileImage designation height caste annualIncome highestEducation dateOfBirth')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.status(200).json(similarUsers);
  } catch (error) {
    console.error('Error fetching similar profiles:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
