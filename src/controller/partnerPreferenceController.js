import PartnerPreferenceModel from "../modal/PartnerPreferenceModel.js";
import moment from 'moment';
import RegisterModel from "../modal/register.js";


export const createOrUpdatePartnerPreference = async (req, res) => {
  const userId = req.userId;  
  const data = req.body;

  try {
    const preference = await PartnerPreferenceModel.findOneAndUpdate(
      { userId },
      { ...data, userId },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, preference });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

export const getPartnerPreference = async (req, res) => {
  const userId = req.userId;

  try {
    const preference = await PartnerPreferenceModel.findOne({ userId });
    if (!preference) {
      return res.status(404).json({ success: false, message: 'No preferences found' });
    }

    res.status(200).json({ success: true, preference });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};






// export const searchUsers = async (req, res) => {
//   try {
//     const userId = req.userId;
//     console.log(userId,"user")

//     const {
//       gender,        
//       religion,    
//       caste,        
//       ageMin,       
//       ageMax,        
//       height,        
//       colorComplex,
//       state
//     } = req.body;

//     const query = {};

//     if (userId) {
//       const currentUser = await RegisterModel.findById(userId);
//       if (currentUser && currentUser.gender) {
//         if (currentUser.gender === 'Male') {
//           query.gender = 'Female';
//         } else if (currentUser.gender === 'Female') {
//           query.gender = 'Male';
//         }
//       }
//     } else if (gender) {
//       query.gender = gender; 
//     }

//     if (religion) query.religion = religion;
//     if (caste) query.caste = caste;
//     if (height) query.height = height;
//     if (colorComplex) query.colorComplex = colorComplex;
//     if (state) query.state = state;

//     if (ageMin || ageMax) {
//       const today = moment();
//       const maxDOB = ageMax ? today.clone().subtract(ageMax, 'years').toDate() : null;
//       const minDOB = ageMin ? today.clone().subtract(ageMin, 'years').toDate() : null;

//       query.dateOfBirth = {};
//       if (maxDOB) query.dateOfBirth.$lte = maxDOB;
//       if (minDOB) query.dateOfBirth.$gte = minDOB;
//     }

//     const users = await RegisterModel.find(query).select('-password -mobileOTP');

//     res.status(200).json({ success: true, data: users });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: 'Server Error' });
//   }
// };



export const searchUsers = async (req, res) => {
  try {
    const userId = req.userId;

    const {
      ageMin,
      ageMax,
      heightMin,
      heightMax,
      religion,
      caste,
      colorComplex,
      maritalStatus,
      country,
      state,
      city,
      highestEducation,
      employedIn,
      designation,
      gender
    } = req.body;

    const query = { adminApprovel: "approved" };

    // ---------------------- FIXED GENDER LOGIC ----------------------
    if (gender === "Male" || gender === "Female") {
      query.gender = gender;
    }
    // If empty or undefined → search ALL genders

    // ---------------------- DYNAMIC FILTERS ------------------------
    if (religion) query.religion = religion;
    if (caste) query.caste = caste;
    if (maritalStatus) query.maritalStatus = maritalStatus;
    if (colorComplex) query.colorComplex = colorComplex;
    if (country) query.country = country;
    if (state) query.state = state;
    if (city) query.city = city;
    if (highestEducation) query.highestEducation = highestEducation;
    if (employedIn) query.occupation = employedIn;
    if (designation) query.designation = designation;

    // ---------------------- CORRECT AGE FILTER ----------------------
    if (ageMin || ageMax) {
      const today = moment();

      const minYear = Number(ageMin); // youngest
      const maxYear = Number(ageMax); // oldest

      const youngestDOB =
        !isNaN(minYear) && minYear > 0
          ? today.clone().subtract(minYear, "years").toDate()
          : null;

      const oldestDOB =
        !isNaN(maxYear) && maxYear > 0
          ? today.clone().subtract(maxYear, "years").toDate()
          : null;

      query.dateOfBirth = {};

      // oldest first
      if (oldestDOB instanceof Date && !isNaN(oldestDOB)) {
        query.dateOfBirth.$gte = oldestDOB;
      }

      // youngest second
      if (youngestDOB instanceof Date && !isNaN(youngestDOB)) {
        query.dateOfBirth.$lte = youngestDOB;
      }

      if (Object.keys(query.dateOfBirth).length === 0) {
        delete query.dateOfBirth;
      }
    }

    // ---------------------- SAFE HEIGHT FILTER ----------------------
    if (heightMin || heightMax) {
      const minH = Number(heightMin);
      const maxH = Number(heightMax);

      query.height = {};

      if (!isNaN(minH) && minH > 0) query.height.$gte = minH;
      if (!isNaN(maxH) && maxH > 0) query.height.$lte = maxH;

      if (Object.keys(query.height).length === 0) delete query.height;
    }

    // ---------------------- FETCH USERS ----------------------------
    const users = await RegisterModel.find(query).select(`
      _id id firstName lastName dateOfBirth height religion caste occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation maritalStatus country
    `);

    // Helper: calculate age
    const calculateAge = (dob) => {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    // Format response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      age: calculateAge(user.dateOfBirth),
      height: user.height,
      caste: user.caste,
      religion: user.religion,
      maritalStatus: user.maritalStatus,
      designation: user.designation,
      profession: user.occupation,
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

    res.status(200).json({ success: true, data: formattedUsers });

  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


export const getMatchedUsersByPreference = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized user" });
    }

    // Get preference
    const pref = await PartnerPreferenceModel.findOne({ userId });
    if (!pref) {
      return res.status(200).json({
        success: false,
        message: "No preferences saved",
        users: [],
      });
    }

    // Fetch current user for exclusion lists
    const currentUser = await RegisterModel.findById(userId).select(
      "likedUsers sentRequests skippedUsers"
    );

    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Build excluded user list (permanent remove)
    const excludedUsers = [
      userId,                        // yourself
      ...currentUser.likedUsers,     // liked
      ...currentUser.sentRequests,   // connection sent
      ...currentUser.skippedUsers,   // skipped
    ];

    // Fetch all users except excluded
    const allUsers = await RegisterModel.find({
      _id: { $nin: excludedUsers }
    }).select("-password -mobileOTP");

    const matched = [];

    allUsers.forEach((user) => {
      let score = 0;

      // 🌟 Matching Logic (same as your logic)
      if (!pref.gender || user.gender === pref.gender) score++;
      if (!pref.religion || user.religion === pref.religion) score++;
      if (!pref.caste || user.caste === pref.caste) score++;
      if (!pref.community || user.community === pref.community) score++;
      if (!pref.gotra || user.gotra === pref.gotra) score++;
      if (!pref.city || user.currentCity === pref.city) score++;
      if (!pref.state || user.currentState === pref.state) score++;
      if (!pref.highestEducation || user.highestEducation === pref.highestEducation) score++;
      if (!pref.designation || user.designation === pref.designation) score++;
      if (!pref.income || user.annualIncome === pref.income) score++;
      if (!pref.maritalStatus || user.maritalStatus === pref.maritalStatus) score++;

      if (!pref.minheight || user.height >= pref.minheight) score++;
      if (!pref.maxheight || user.height <= pref.maxheight) score++;

      if (!pref.minWeight || user.weight >= pref.minWeight) score++;
      if (!pref.maxWeight || user.weight <= pref.maxWeight) score++;

      if (pref.minAge || pref.maxAge) {
        const age = getAge(user.dateOfBirth);

        if (!pref.minAge || age >= pref.minAge) score++;
        if (!pref.maxAge || age <= pref.maxAge) score++;
      }

      matched.push({
        ...user.toObject(),
        matchScore: score,
      });
    });

    // Sort high to low score
    matched.sort((a, b) => b.matchScore - a.matchScore);

    return res.status(200).json({
      success: true,
      message: "Matches fetched successfully",
      users: matched,
    });

  } catch (error) {
    console.error("[MATCH ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// Helper function
function getAge(dob) {
  if (!dob) return 0;
  const diff = Date.now() - new Date(dob).getTime();
  return new Date(diff).getUTCFullYear() - 1970;
}

export const getSearchUserById = async (req, res) => {
  const userId = req.params.id; // this is Mongo _id

  try {
    const user = await RegisterModel.findOne({
      _id: userId,                 // <-- FIXED: search by MongoDB _id
      adminApprovel: "approved"
    }).select(`
      _id id firstName lastName dateOfBirth height religion caste occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation maritalStatus country
    `);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or not approved",
      });
    }

    // Age Calculation
    const today = new Date();
    const birthDate = new Date(user.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

    const formatted = {
      id: user.id,
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      age,
      height: user.height,
      caste: user.caste,
      religion: user.religion,
      maritalStatus: user.maritalStatus,
      designation: user.designation,
      profession: user.occupation,
      salary: user.annualIncome,
      education: user.highestEducation,
      location: `${user.city || user.currentCity || ""}, ${user.state || user.currentState || ""}`,
      languages: Array.isArray(user.motherTongue)
        ? user.motherTongue.join(", ")
        : user.motherTongue,
      gender: user.gender,
      profileImage: user.profileImage,
      lastSeen: user.updatedAt || user.createdAt,
    };

    res.status(200).json({ success: true, data: formatted });

  } catch (err) {
    console.error("SearchById Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


