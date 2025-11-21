import PartnerPreferenceModel from "../modal/PartnerPreferenceModel.js";
import RegisterModel from "../modal/register.js";


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

    let user = await RegisterModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 1️⃣ BASIC INFO
    if (basicInfo) {
      Object.assign(user, {
        profileFor: basicInfo.postedBy || user.profileFor,
        firstName: basicInfo.firstName || user.firstName,
        middleName: basicInfo.middleName === "None" ? "" : basicInfo.middleName,
        lastName: basicInfo.lastName || user.lastName,
        maritalStatus: basicInfo.maritalStatus || user.maritalStatus,
        anyDisability: basicInfo.anyDisability === "Yes",
        weight: basicInfo.weight === "None" ? "" : basicInfo.weight,
        complexion: basicInfo.complexion === "None" ? "" : basicInfo.complexion,
        healthInformation:
          basicInfo.healthInformation === "None"
            ? ""
            : basicInfo.healthInformation,
        height: basicInfo.height || user.height,
        dateOfBirth: basicInfo.dateOfBirth
          ? new Date(basicInfo.dateOfBirth)
          : user.dateOfBirth,
        gender: basicInfo.gender || user.gender,
      });
    }

    // 2️⃣ RELIGION DETAILS
    if (religionDetails) {
      Object.assign(user, {
        religion: religionDetails.religion || user.religion,
        caste: religionDetails.caste || user.caste,
        community: religionDetails.community || user.community,
        gothra:
          religionDetails.gothra === "Not Specified"
            ? ""
            : religionDetails.gothra,
        motherTongue:
          religionDetails.motherTongue || user.motherTongue,
        casteNoBar: religionDetails.casteNoBar === "Yes",
      });
    }

    // 3️⃣ FAMILY DETAILS
    if (familyDetails) {
      Object.assign(user, {
        familyType: familyDetails.familyType || user.familyType,
        familyStatus: familyDetails.familyStatus || user.familyStatus,
        fatherOccupation: familyDetails.fatherOccupation || user.fatherOccupation,
        motherOccupation: familyDetails.motherOccupation || user.motherOccupation,
        brother: familyDetails.brother ?? user.brother,
        sister: familyDetails.sister ?? user.sister,
        state: familyDetails.state || user.state,
        city: familyDetails.city || user.city,
      });
    }

    // 4️⃣ ASTRO DETAILS
    if (astroDetails) {
      Object.assign(user, {
        manglik: astroDetails.manglik || user.manglik,
        timeOfBirth: astroDetails.timeOfBirth || user.timeOfBirth,
        cityOfBirth: astroDetails.cityOfBirth || user.cityOfBirth,
        dateOfBirth: astroDetails.dateOfBirth
          ? new Date(astroDetails.dateOfBirth)
          : user.dateOfBirth,
      });
    }

    // 5️⃣ EDUCATION DETAILS
    if (educationDetails) {
      Object.assign(user, {
        highestEducation:
          educationDetails.highestEducation || user.highestEducation,
        postGraduation: educationDetails.postGraduation || user.postGraduation,
        underGraduation:
          educationDetails.underGraduation || user.underGraduation,
        school: educationDetails.school || user.school,
        schoolStream: educationDetails.schoolStream || user.schoolStream,
      });
    }

    // 6️⃣ CAREER DETAILS
    if (careerDetails) {
      Object.assign(user, {
        employedIn: careerDetails.employedIn || user.employedIn,
        designation: careerDetails.designation || user.designation,
        company: careerDetails.company || user.company,
        annualIncome: careerDetails.annualIncome || user.annualIncome,
      });
    }

    // 7️⃣ LIFESTYLE & HOBBIES
    if (lifestyleHobbies) {
      Object.assign(user, {
        diet: lifestyleHobbies.diet || user.diet,
        ownHouse: lifestyleHobbies.ownHouse === "Yes",
        ownCar: lifestyleHobbies.ownCar === "Yes",
        smoking: lifestyleHobbies.smoking || user.smoking,
        drinking: lifestyleHobbies.drinking || user.drinking,
        openToPets: lifestyleHobbies.openToPets === "Yes",
        foodICook: lifestyleHobbies.foodICook || user.foodICook,
        hobbies: lifestyleHobbies.hobbies || user.hobbies,
        interests: lifestyleHobbies.interests || user.interests,
        favoriteMusic: lifestyleHobbies.favoriteMusic || user.favoriteMusic,
        sports: lifestyleHobbies.sports || user.sports,
        cuisine: lifestyleHobbies.cuisine || user.cuisine,
        movies: lifestyleHobbies.movies || user.movies,
        tvShows: lifestyleHobbies.tvShows || user.tvShows,
        vacationDestination:
          lifestyleHobbies.vacationDestination || user.vacationDestination,
      });
    }

    // 8️⃣ ABOUT ME
    if (aboutMe) {
      user.aboutYourself = aboutMe;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
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
