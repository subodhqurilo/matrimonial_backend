import MatchModel from '../modal/MatchModel.js';
import RegisterModel from "../modal/register.js";

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



const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const getAllMatches = async (req, res) => {
  try {
    const myId = req.userId;

    // Fetch all users except me
    const users = await RegisterModel.find({
      _id: { $ne: myId }
    }).select(`
      id _id firstName lastName dateOfBirth height religion caste occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation
    `);

    if (!users.length) {
      return res.status(200).json({
        success: true,
        message: "No users found",
        data: [],
      });
    }

    const formatted = users.map((user) => ({
      id: user.id,
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      age: calculateAge(user.dateOfBirth),
      height: user.height,
      caste: user.caste,
      designation: user.designation || user.occupation,
      religion: user.religion,
      salary: user.annualIncome,
      education: user.highestEducation,
      location: `${user.city || user.currentCity || ""}, ${user.state || user.currentState || ""}`,
      languages: Array.isArray(user.motherTongue)
        ? user.motherTongue.join(", ")
        : user.motherTongue,
      gender: user.gender,
      profileImage: user.profileImage,
      lastSeen: user.updatedAt || user.createdAt,
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });

  } catch (error) {
    console.error("❌ getAllMatches Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

