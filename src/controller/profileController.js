import mongoose from "mongoose";

import PartnerPreferenceModel from "../modal/PartnerPreferenceModel.js";
import RegisterModel from "../modal/register.js";
import NotificationModel from "../modal/Notification.js";
import { sendExpoPush } from "../utils/expoPush.js"; // expo push function


function calculateAge(dob) {
  const birthDate = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birthDate.getDate())) {
    age--;
    months += 12;
  }
  return `${age} years and ${months} months`;
}

import moment from 'moment';

const calculateAgeString = (dob) => {
  const now = moment();
  const birth = moment(dob);
  const years = now.diff(birth, 'years');
  birth.add(years, 'years');
  const months = now.diff(birth, 'months');
  return `${years} years${months ? ` and ${months} months` : ''}`;
};

export const getUserPublicProfileById = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

    const user = await RegisterModel.findById(userId).select(
      'firstName _id profileImage lastName id maritalStatus profileFor dateOfBirth caste height highestEducation currentCity currentState designation complexion religion gotra motherTongue employedIn annualIncome weight aboutYourself familyStatus familyType timeOfBirth manglik horoscope eatingHabits updatedAt'
    );

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const responseData = {
      name: `${user.firstName} ${user.lastName}`,
      id: user.id,
      profileImage: user.profileImage ,
      _id: user._id,
      profileCreatedBy: user.profileFor || 'Not specified',
      maritalStatus: user.maritalStatus,
      age: user.dateOfBirth ? calculateAgeString(user.dateOfBirth) : null,
      height: user.height,
      weight: user.weight ? `${user.weight} kg` : null,
      complexion: user.complexion,
      caste: user.caste,
      education: user.highestEducation,
      location: user.currentCity || user.currentState ? `${user.currentCity}, ${user.currentState}` : null,
      designation: user.designation,
      religion: user.religion,
      gotra: user.gotra || 'Not specified',
      motherTongue: user.motherTongue,
      employedIn: user.employedIn === 'Private Sector' ? 'Works in Private Sector' : user.employedIn,
      annualIncome: user.annualIncome,
      eatingHabits: user.eatingHabits || 'Not Specified',
      aboutYourself: user.aboutYourself,
      familyStatus: user.familyStatus,
      familyType: user.familyType,
      dateOfBirth: user.dateOfBirth?.toISOString().split('T')[0],
      timeOfBirth: user.timeOfBirth,
      lastSeen: moment(user.updatedAt).fromNow(),
      horoscope: {
        rashi: user.horoscope?.rashi || '',
        nakshatra: user.horoscope?.nakshatra || '',
        matchRequired: user.horoscope?.matchRequired || '',
        manglik: user.manglik || ''
      }
    };

    res.status(200).json({ success: true, profile: responseData });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};




export const getUserFormattedProfile = async (req, res) => {
  try {
    const id = req.userId;
    console.log("Logged-in User:", id);

    const user = await RegisterModel.findOne({ _id: id });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ---------- Helper Function ----------
    const calculateAge = (dob) => {
      const birthDate = new Date(dob);
      const diff = Date.now() - birthDate.getTime();
      return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    };

    // ---------- Final Formatted Response ----------
    const formattedData = {
      profileImage: {
        profileImage: user.profileImage || "",
      },

      verifyAadhaar: user.adhaarCard?.isVerified ?? false,

      basicInfo: {
        postedBy: user.profileFor,
        firstName: user.firstName,
        middleName: user.middleName ? user.middleName : "None",
        lastName: user.lastName,
        age: user.dateOfBirth ? calculateAge(user.dateOfBirth) : "N/A",
        maritalStatus: user.maritalStatus,
        anyDisability: user.anyDisability ? "Yes" : "None",
        weight: user.weight || "None",
        complexion: user.complexion || "None",
        healthInformation: user.healthInformation || "None",
        height: user.height,
      },

      religionDetails: {
        religion: user.religion,
        motherTongue: user.motherTongue,
        community: user.community,
        casteNoBar: user.casteNoBar ? "Yes" : "No",
        gothra: user.gothra || "Not Specified",
      },

      familyDetails: {
        familyBackground: user.familyType,
        fatherOccupation: user.fatherOccupation,
        motherOccupation: user.motherOccupation,
        brother: user.brother,
        sister: user.sister,
        familyBasedOutOf: user.familyBasedOutOf || "Not Specified",
      },

      astroDetails: {
        manglik: user.manglik,
        dateOfBirth: user.dateOfBirth
          ? user.dateOfBirth.toISOString().split("T")[0]
          : "",
        timeOfBirth: user.timeOfBirth,
        cityOfBirth: user.cityOfBirth,
        zodiacSign: user.zodiacSign ? user.zodiacSign : "N/A",
      },

      educationDetails: {
        highestDegree: user.highestEducation,
        postGraduation: user.postGraduation,
        underGraduation: user.underGraduation,
        school: user.school,
        schoolStream: user.schoolStream,
      },

      careerDetails: {
        employedIn: user.employedIn,
        occupation: user.designation,
        company: user.company,
        annualIncome: user.annualIncome,
      },

      lifestyleHobbies: {
        diet: user.diet,
        ownHouse: user.ownHouse ? "Yes" : "No",
        ownCar: user.ownCar ? "Yes" : "No",
        smoking: user.smoking ? "Yes" : "No",
        drinking: user.drinking,
        openToPets: user.openToPets ? "Yes" : "No",
        foodICook: user.foodICook,
        hobbies: user.hobbies,
        interests: user.interests,
        favoriteMusic: user.favoriteMusic,
        sports: user.sports,
        cuisine: user.cuisine,
        movies: user.movies,
        tvShows: user.tvShows,
        vacationDestination: user.vacationDestination,
      },

      aboutMe: user.aboutYourself,
    };

    return res.status(200).json({ success: true, data: formattedData });

  } catch (error) {
    console.error("Error in getUserFormattedProfile:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};


 
export const updateUserFormattedProfile = async (req, res) => {
  try {
    const userId = req.userId;

    // Validate userId presence
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: missing userId" });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    const {
      basicInfo,
      religionDetails,
      familyDetails,
      astroDetails,
      educationDetails,
      careerDetails,
      lifestyleHobbies,
      aboutMe,
    } = req.body || {};

    const user = await RegisterModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Helper to coerce "Yes"/"No"/"None" inputs to booleans/strings
    const isYes = (val) => {
      if (typeof val === "boolean") return val;
      if (!val && val !== "") return false;
      return String(val).toLowerCase() === "yes";
    };
    const isNone = (val) => val === "None" || val === "None " || val === "Not Specified";

    // 1️⃣ BASIC INFO
    if (basicInfo && typeof basicInfo === "object") {
      // prefer explicit provided values, else retain existing
      if (basicInfo.postedBy !== undefined) user.profileFor = basicInfo.postedBy || user.profileFor;
      if (basicInfo.firstName !== undefined) user.firstName = basicInfo.firstName || user.firstName;
      if (basicInfo.middleName !== undefined) user.middleName = isNone(basicInfo.middleName) ? "" : (basicInfo.middleName || "");
      if (basicInfo.lastName !== undefined) user.lastName = basicInfo.lastName || user.lastName;
      if (basicInfo.maritalStatus !== undefined) user.maritalStatus = basicInfo.maritalStatus || user.maritalStatus;
      if (basicInfo.anyDisability !== undefined) user.anyDisability = isYes(basicInfo.anyDisability);
      if (basicInfo.weight !== undefined) user.weight = isNone(basicInfo.weight) ? "" : (basicInfo.weight || user.weight);
      if (basicInfo.complexion !== undefined) user.complexion = isNone(basicInfo.complexion) ? "" : (basicInfo.complexion || user.complexion);
      if (basicInfo.healthInformation !== undefined) user.healthInformation = isNone(basicInfo.healthInformation) ? "" : (basicInfo.healthInformation || user.healthInformation);
      if (basicInfo.height !== undefined) user.height = basicInfo.height || user.height;
      if (basicInfo.dateOfBirth) {
        const d = new Date(basicInfo.dateOfBirth);
        if (!Number.isNaN(d.getTime())) user.dateOfBirth = d;
      }
      if (basicInfo.gender !== undefined) user.gender = basicInfo.gender || user.gender;
    }

    // 2️⃣ RELIGION DETAILS
    if (religionDetails && typeof religionDetails === "object") {
      if (religionDetails.religion !== undefined) user.religion = religionDetails.religion || user.religion;
      if (religionDetails.caste !== undefined) user.caste = religionDetails.caste || user.caste;
      if (religionDetails.community !== undefined) user.community = religionDetails.community || user.community;
      if (religionDetails.gothra !== undefined) user.gothra = isNone(religionDetails.gothra) ? "" : (religionDetails.gothra || user.gothra);
      if (religionDetails.motherTongue !== undefined) user.motherTongue = religionDetails.motherTongue || user.motherTongue;
      if (religionDetails.casteNoBar !== undefined) user.casteNoBar = isYes(religionDetails.casteNoBar);
    }

    // 3️⃣ FAMILY DETAILS
    if (familyDetails && typeof familyDetails === "object") {
      if (familyDetails.familyType !== undefined) user.familyType = familyDetails.familyType || user.familyType;
      if (familyDetails.familyStatus !== undefined) user.familyStatus = familyDetails.familyStatus || user.familyStatus;
      if (familyDetails.fatherOccupation !== undefined) user.fatherOccupation = familyDetails.fatherOccupation || user.fatherOccupation;
      if (familyDetails.motherOccupation !== undefined) user.motherOccupation = familyDetails.motherOccupation || user.motherOccupation;
      if (familyDetails.brother !== undefined) user.brother = familyDetails.brother === "" ? user.brother : Number(familyDetails.brother) || familyDetails.brother;
      if (familyDetails.sister !== undefined) user.sister = familyDetails.sister === "" ? user.sister : Number(familyDetails.sister) || familyDetails.sister;
      if (familyDetails.state !== undefined) user.state = familyDetails.state || user.state;
      if (familyDetails.city !== undefined) user.city = familyDetails.city || user.city;
      if (familyDetails.familyIncome !== undefined) user.familyIncome = familyDetails.familyIncome || user.familyIncome;
    }

    // 4️⃣ ASTRO DETAILS
    // IMPORTANT: Only set dateOfBirth from astroDetails if basicInfo did NOT set it
    if (astroDetails && typeof astroDetails === "object") {
      if (astroDetails.manglik !== undefined) user.manglik = astroDetails.manglik || user.manglik;
      if (astroDetails.timeOfBirth !== undefined) user.timeOfBirth = astroDetails.timeOfBirth || user.timeOfBirth;
      if (astroDetails.cityOfBirth !== undefined) user.cityOfBirth = astroDetails.cityOfBirth || user.cityOfBirth;

      if (astroDetails.dateOfBirth && !basicInfo?.dateOfBirth) {
        const d = new Date(astroDetails.dateOfBirth);
        if (!Number.isNaN(d.getTime())) user.dateOfBirth = d;
      }
    }

    // 5️⃣ EDUCATION DETAILS
    if (educationDetails && typeof educationDetails === "object") {
      if (educationDetails.highestEducation !== undefined) user.highestEducation = educationDetails.highestEducation || user.highestEducation;
      if (educationDetails.postGraduation !== undefined) user.postGraduation = educationDetails.postGraduation || user.postGraduation;
      if (educationDetails.underGraduation !== undefined) user.underGraduation = educationDetails.underGraduation || user.underGraduation;
      if (educationDetails.school !== undefined) user.school = educationDetails.school || user.school;
      if (educationDetails.schoolStream !== undefined) user.schoolStream = educationDetails.schoolStream || user.schoolStream;
    }

    // 6️⃣ CAREER DETAILS
    if (careerDetails && typeof careerDetails === "object") {
      if (careerDetails.employedIn !== undefined) user.employedIn = careerDetails.employedIn || user.employedIn;
      if (careerDetails.designation !== undefined) user.designation = careerDetails.designation || user.designation;
      if (careerDetails.company !== undefined) user.company = careerDetails.company || user.company;
      if (careerDetails.annualIncome !== undefined) user.annualIncome = careerDetails.annualIncome || user.annualIncome;
      if (careerDetails.occupation !== undefined) user.occupation = careerDetails.occupation || user.occupation;
    }

    // 7️⃣ LIFESTYLE & HOBBIES
    if (lifestyleHobbies && typeof lifestyleHobbies === "object") {
      if (lifestyleHobbies.diet !== undefined) user.diet = lifestyleHobbies.diet || user.diet;
      if (lifestyleHobbies.ownHouse !== undefined) user.ownHouse = isYes(lifestyleHobbies.ownHouse);
      if (lifestyleHobbies.ownCar !== undefined) user.ownCar = isYes(lifestyleHobbies.ownCar);
      if (lifestyleHobbies.smoking !== undefined) user.smoking = lifestyleHobbies.smoking || user.smoking;
      if (lifestyleHobbies.drinking !== undefined) user.drinking = lifestyleHobbies.drinking || user.drinking;
      if (lifestyleHobbies.openToPets !== undefined) user.openToPets = isYes(lifestyleHobbies.openToPets);
      if (lifestyleHobbies.foodICook !== undefined) user.foodICook = lifestyleHobbies.foodICook || user.foodICook;
      if (lifestyleHobbies.hobbies !== undefined) user.hobbies = lifestyleHobbies.hobbies || user.hobbies;
      if (lifestyleHobbies.interests !== undefined) user.interests = lifestyleHobbies.interests || user.interests;
      if (lifestyleHobbies.favoriteMusic !== undefined) user.favoriteMusic = lifestyleHobbies.favoriteMusic || user.favoriteMusic;
      if (lifestyleHobbies.sports !== undefined) user.sports = lifestyleHobbies.sports || user.sports;
      if (lifestyleHobbies.cuisine !== undefined) user.cuisine = lifestyleHobbies.cuisine || user.cuisine;
      if (lifestyleHobbies.movies !== undefined) user.movies = lifestyleHobbies.movies || user.movies;
      if (lifestyleHobbies.tvShows !== undefined) user.tvShows = lifestyleHobbies.tvShows || user.tvShows;
      if (lifestyleHobbies.vacationDestination !== undefined) user.vacationDestination = lifestyleHobbies.vacationDestination || user.vacationDestination;
      if (lifestyleHobbies.assets !== undefined) user.assets = lifestyleHobbies.assets || user.assets;
      if (lifestyleHobbies.habits !== undefined) user.habits = lifestyleHobbies.habits || user.habits;
    }

    // 8️⃣ ABOUT ME
    if (aboutMe !== undefined && aboutMe !== null) {
      // aboutMe can be a string or an object -- store directly
      user.aboutYourself = aboutMe;
    }

    // Final save
    await user.save();

    // Strip sensitive fields before returning (if present on your model)
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    delete userObj.__v;

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userObj,
    });
  } catch (error) {
    console.error("Update Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message || String(error),
    });
  }
};


export const updateProfileImagesOnly = async (req, res) => {
  try {
    const userId = req.userId;

    // File from multer-cloudinary
    const profileImage = req.files?.["profileImage"]?.[0]?.path;

    if (!profileImage) {
      return res.status(400).json({
        success: false,
        message: "No profile image provided",
      });
    }

    // Fetch user
    const user = await RegisterModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // OPTIONAL: Delete previous image from cloudinary if exists
    // -------------------------------------------
    // if (user.profileImage) {
    //   const publicId = user.profileImage.split("/").pop().split(".")[0];
    //   await cloudinary.uploader.destroy(`register_profiles/${publicId}`);
    // }
    // -------------------------------------------

    // Update Image
    user.profileImage = profileImage;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      user,   // return full updated user
    });

  } catch (error) {
    console.error("[Image Update Error]", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


function getZodiacSign(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  const day = d.getDate();
  const month = d.getMonth() + 1;

  const zodiac = [
    ['Capricorn', 20], ['Aquarius', 19], ['Pisces', 20], ['Aries', 20], ['Taurus', 21],
    ['Gemini', 21], ['Cancer', 23], ['Leo', 23], ['Virgo', 23], ['Libra', 23],
    ['Scorpio', 23], ['Sagittarius', 22], ['Capricorn', 31],
  ];

  return day < zodiac[month - 1][1] ? zodiac[month - 1][0] : zodiac[month][0];
}



export const getUsersWithProfileImage = async (req, res) => {
  try {
    const currentUserId = req.userId;

    const photo = await RegisterModel.find({
      _id: { $ne: currentUserId },
      profileImage: { $exists: true, $ne: '' }
    }).select(
      'id firstName lastName dateOfBirth height religion caste employedIn ' + 
      'annualIncome highestEducation currentCity city state currentState ' +
      'motherTongue gender profileImage updatedAt createdAt designation'
    );

    res.status(200).json({
      success: true,
      count: photo.length,
      photo,
    });
  } catch (error) {
      console.error('Error fetching users with profile images:', error),

    res.status(500).json({
      success: false,
      message: 'Failed to fetch users with profile images',
      error: error.message,
    });
  }
};

export const getNewlyRegisteredUsers = async (req, res) => {
  try {
    const currentUserId = req.userId; // User ID from token

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const users = await RegisterModel.find({
      _id: { $ne: currentUserId }, // ❌ exclude self
      createdAt: { $gte: fiveDaysAgo }, // ✅ registered in last 5 days
      profileImage: { $exists: true, $ne: '' } // ✅ profile image is present
    }).select(
      'id firstName lastName dateOfBirth height religion caste employedIn ' +
      'annualIncome highestEducation currentCity city state currentState ' +
      'motherTongue gender profileImage updatedAt createdAt designation'
    );

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch newly registered users',
      error: error.message,
    });
  }
};
