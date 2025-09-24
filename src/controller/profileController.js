import PartnerPreferenceModel from "../modal/PartnerPreferenceModel.js";
import RegisterModel from "../modal/register.js";
import cloudinary from '../utils/cloudinary.js'; 
import fs from 'fs';

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
      
    };

    res.status(200).json({ success: true, profile: responseData });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};




export const getUserFormattedProfile = async (req, res) => {
  try {
    console.log("📩 Incoming Update Body:", JSON.stringify(req.body, null, 2));
    console.log("👤 User ID:", req.userId);
    const id = req.userId
    console.log(id)
    const user = await RegisterModel.findOne({ _id:id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // const partnerPreference = await PartnerPreferenceModel.findOne({ userId: user._id });



 
    const formattedData = {
        profileImage: user.profileImage || "https://res.cloudinary.com/dppe3ni5z/image/upload/v1234567890/default-profile.png",
        verifyAadhaar: user.adhaarCard?.isVerified || false,

      basicInfo: {
        postedBy: user.profileFor, 
        firstName: user.firstName,
        middleName: user.middleName ?user.middleName : "None",
        lastName: user.lastName,
        age: user.dateOfBirth ? calculateAge(user.dateOfBirth) : 'N/A',
        maritalStatus: user.maritalStatus,
        anyDisability: user.anyDisability ? 'Yes' : 'None',
        weight: user.weight || 'None',
        complexion: user.complexion || 'None',
        healthInformation: user.healthInformation || 'None',
        height: user.height,
      },
      religionDetails: {
        religion: user.religion,
        motherTongue: user.motherTongue,
        community: user.community,
        casteNoBar: user.casteNoBar ? 'Yes' : 'No',
        gothra: user.gothra || 'Not Specified',
      },
      familyDetails: {
        familyBackground: user.familyType,
        fatherOccupation: user.fatherOccupation,
        motherOccupation: user.motherOccupation,
        brother: user.brother,
        sister: user.sister,
        familyBasedOutOf: user.familyBasedOutOf || 'Not Specified',
      },
      astroDetails: {
        manglik: user.manglik,
        dateOfBirth: user.dateOfBirth?.toISOString().split('T')[0],
        timeOfBirth: user.timeOfBirth,
        cityOfBirth: user.cityOfBirth,
        zodiacSign: user.zodiacSign || getZodiacSign(user.dateOfBirth) || 'N/A',

        // horoscope: user.horoscope,
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
        ownHouse: user.ownHouse ? 'Yes' : 'No',
        ownCar: user.ownCar ? 'Yes' : 'No',
        smoking: user.smoking ?'Yes' :'No',
        drinking: user.drinking,
        openToPets: user.openToPets ? 'Yes' : 'No',
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
    //   adhaarCard: user.adhaarCard || {},
    //   partnerPreference: partnerPreference || {},
      aboutMe: user.aboutYourself,
    };

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};


 
export const updateUserFormattedProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      basicInfo,
      religionDetails,
      familyDetails,
      astroDetails,
      educationDetails,
      careerDetails,
      lifestyleHobbies,
      aboutMe,
    } = req.body;

    const user = await RegisterModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // --------------------------
    // Basic Info
    if (basicInfo) {
      user.profileFor = basicInfo.postedBy || user.profileFor;
      user.firstName = basicInfo.firstName || user.firstName;
      user.middleName = basicInfo.middleName && basicInfo.middleName !== 'None' ? basicInfo.middleName : '';
      user.lastName = basicInfo.lastName || user.lastName;
      user.maritalStatus = basicInfo.maritalStatus || user.maritalStatus;
      user.anyDisability = basicInfo.anyDisability === 'Yes';
      user.weight = basicInfo.weight && basicInfo.weight !== 'None' ? basicInfo.weight : '';
      user.complexion = basicInfo.complexion && basicInfo.complexion !== 'None' ? basicInfo.complexion : '';
      user.healthInformation = basicInfo.healthInformation && basicInfo.healthInformation !== 'None' ? basicInfo.healthInformation : '';
      user.height = basicInfo.height || user.height;
    }

    // --------------------------
    // Religion Details
    if (religionDetails) {
      user.religion = religionDetails.religion || user.religion;
      user.motherTongue = religionDetails.motherTongue || user.motherTongue;
      user.community = religionDetails.community || user.community;
      user.casteNoBar = religionDetails.casteNoBar === 'Yes';
      user.gothra = religionDetails.gothra && religionDetails.gothra !== 'Not Specified' ? religionDetails.gothra : '';
    }

    // --------------------------
    // Family Details
    if (familyDetails) {
      user.familyType = familyDetails.familyBackground || user.familyType;
      user.fatherOccupation = familyDetails.fatherOccupation || user.fatherOccupation;
      user.motherOccupation = familyDetails.motherOccupation || user.motherOccupation;
      user.brother = familyDetails.brother || user.brother;
      user.sister = familyDetails.sister || user.sister;
      user.familyBasedOutOf = familyDetails.familyBasedOutOf && familyDetails.familyBasedOutOf !== 'Not Specified' ? familyDetails.familyBasedOutOf : '';
    }

    // --------------------------
    // Astro Details
    if (astroDetails) {
      user.manglik = astroDetails.manglik;
      if (astroDetails.dateOfBirth) {
        user.dateOfBirth = new Date(astroDetails.dateOfBirth);
        user.zodiacSign = getZodiacSign(user.dateOfBirth);
      }
      user.timeOfBirth = astroDetails.timeOfBirth;
      user.cityOfBirth = astroDetails.cityOfBirth;
    }

    // --------------------------
    // Education
    if (educationDetails) {
      user.highestEducation = educationDetails.highestDegree || user.highestEducation;
      user.postGraduation = educationDetails.postGraduation || user.postGraduation;
      user.underGraduation = educationDetails.underGraduation || user.underGraduation;
      user.school = educationDetails.school || user.school;
      user.schoolStream = educationDetails.schoolStream || user.schoolStream;
    }

    // --------------------------
    // Career
    if (careerDetails) {
      user.employedIn = careerDetails.employedIn || user.employedIn;
      user.designation = careerDetails.occupation || user.designation;
      user.company = careerDetails.company || user.company;
      user.annualIncome = careerDetails.annualIncome || user.annualIncome;
    }

    // --------------------------
    // Lifestyle & Hobbies (normalize arrays & booleans)
    if (lifestyleHobbies) {
      const normalizeArray = arr => Array.isArray(arr) ? arr : [];

      user.diet = lifestyleHobbies.diet || '';
      user.ownHouse = lifestyleHobbies.ownHouse === 'Yes';
      user.ownCar = lifestyleHobbies.ownCar === 'Yes';
      user.smoking = lifestyleHobbies.smoking || '';
      user.drinking = lifestyleHobbies.drinking || '';
      user.openToPets = lifestyleHobbies.openToPets === 'Yes';
      user.foodICook = normalizeArray(lifestyleHobbies.foodICook);
      user.hobbies = normalizeArray(lifestyleHobbies.hobbies);
      user.interests = normalizeArray(lifestyleHobbies.interests);
      user.favoriteMusic = normalizeArray(lifestyleHobbies.favoriteMusic);
      user.sports = normalizeArray(lifestyleHobbies.sports);
      user.cuisine = normalizeArray(lifestyleHobbies.cuisine);
      user.movies = normalizeArray(lifestyleHobbies.movies);
      user.tvShows = normalizeArray(lifestyleHobbies.tvShows);
      user.vacationDestination = normalizeArray(lifestyleHobbies.vacationDestination);
    }

    if (aboutMe !== undefined) user.aboutYourself = aboutMe;

    await user.save();

    // --------------------------
    // Send proper response with actual saved values
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        basicInfo: {
          postedBy: user.profileFor,
          firstName: user.firstName,
          middleName: user.middleName || 'None',
          lastName: user.lastName,
          maritalStatus: user.maritalStatus,
          anyDisability: user.anyDisability ? 'Yes' : 'None',
          weight: user.weight || 'None',
          complexion: user.complexion || 'None',
          healthInformation: user.healthInformation || 'None',
          height: user.height,
        },
        religionDetails: {
          religion: user.religion,
          motherTongue: user.motherTongue,
          community: user.community,
          casteNoBar: user.casteNoBar ? 'Yes' : 'No',
          gothra: user.gothra || 'Not Specified',
        },
        familyDetails: {
          familyBackground: user.familyType,
          fatherOccupation: user.fatherOccupation,
          motherOccupation: user.motherOccupation,
          brother: user.brother,
          sister: user.sister,
          familyBasedOutOf: user.familyBasedOutOf || 'Not Specified',
        },
        astroDetails: {
          manglik: user.manglik,
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
          timeOfBirth: user.timeOfBirth,
          cityOfBirth: user.cityOfBirth,
          zodiacSign: user.zodiacSign || getZodiacSign(user.dateOfBirth),
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
          ownHouse: user.ownHouse ? 'Yes' : 'No',
          ownCar: user.ownCar ? 'Yes' : 'No',
          smoking: user.smoking,
          drinking: user.drinking,
          openToPets: user.openToPets ? 'Yes' : 'No',
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
      },
    });

  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};


 export const updateProfileImagesOnly = async (req, res) => {
  try {
    const userId = req.userId;
    const file = req.files?.profileImage?.[0];  // ✅ correct

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No image provided',
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'profiles',
      use_filename: true,
      unique_filename: false,
    });

    // Delete temp file
    fs.unlinkSync(file.path);

    // Save URL in DB
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      { profileImage: result.secure_url },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      profileImage: result.secure_url,  // ✅ string URL
    });
  } catch (error) {
    console.error('[Image Update Error]', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
      _id: { $ne: currentUserId },
      profileImage: { $exists: true, $ne: '' },
    };

    const total = await RegisterModel.countDocuments(query);

    const users = await RegisterModel.find(query)
      .select(
        'id firstName lastName dateOfBirth height religion caste employedIn ' +
        'annualIncome highestEducation currentCity city state currentState ' +
        'motherTongue gender profileImage updatedAt createdAt designation'
      )
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const calculateAge = (dob) => {
      if (!dob) return "N/A";
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    const photo = users.map(user => ({
      _id: user._id,
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || "N/A",
      age: calculateAge(user.dateOfBirth),
      height: user.height || "N/A",
      caste: user.caste || "N/A",
      designation: user.designation || "N/A",
      religion: user.religion || "N/A",
      profession: user.employedIn || "N/A",
      salary: user.annualIncome || "N/A",
      education: user.highestEducation || "N/A",
      location: [
        user.city || user.currentCity,
        user.state || user.currentState
      ].filter(Boolean).join(", ") || "N/A",
      languages: Array.isArray(user.motherTongue) ? user.motherTongue.join(", ") : user.motherTongue || "N/A",
      gender: user.gender || "N/A",
      profileImage: user.profileImage || "https://res.cloudinary.com/dppe3ni5z/image/upload/v1234567890/default-profile.png",
      altText: `${user.firstName || 'User'}'s profile picture`,
      lastSeen: moment(user.updatedAt || user.createdAt).fromNow(),
    }));

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      photo,
    });
  } catch (error) {
    console.error('Error fetching users with profile images:', error);

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
