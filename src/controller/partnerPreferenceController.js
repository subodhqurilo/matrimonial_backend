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
    console.log(userId, "user");

    const {
      gender,
      religion,
      caste,
      ageMin,
      ageMax,
      height,
      colorComplex,
      state,
    } = req.body;

    const query = { adminApprovel: "approved" }; // ✅ Only approved users

    // Prefer opposite gender of current user
    if (userId) {
      const currentUser = await RegisterModel.findById(userId);
      if (currentUser && currentUser.gender) {
        query.gender = currentUser.gender === 'Male' ? 'Female' : 'Male';
      }
    } else if (gender) {
      query.gender = gender;
    }

    if (religion) query.religion = religion;
    if (caste) query.caste = caste;
    if (height) query.height = height;
    if (colorComplex) query.colorComplex = colorComplex;
    if (state) query.state = state;

    if (ageMin || ageMax) {
      const today = moment();
      const maxDOB = ageMax ? today.clone().subtract(ageMax, 'years').toDate() : null;
      const minDOB = ageMin ? today.clone().subtract(ageMin, 'years').toDate() : null;

      query.dateOfBirth = {};
      if (maxDOB) query.dateOfBirth.$lte = maxDOB;
      if (minDOB) query.dateOfBirth.$gte = minDOB;
    }

    const users = await RegisterModel.find(query).select(`
      _id id firstName lastName dateOfBirth height religion caste occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation
    `);

    // Helper to calculate age
    const calculateAge = (dob) => {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Format output
    const formattedUsers = users.map(user => ({
      id: user.id,
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      age: calculateAge(user.dateOfBirth),
      height: user.height,
      caste: user.caste,
      designation: user.designation,
      religion: user.religion,
      profession: user.occupation,
      salary: user.annualIncome,
      education: user.highestEducation,
      location: `${user.city || user.currentCity || ''}, ${user.state || user.currentState || ''}`,
      languages: Array.isArray(user.motherTongue)
        ? user.motherTongue.join(', ')
        : user.motherTongue,
      gender: user.gender,
      profileImage: user.profileImage,
      lastSeen: user.updatedAt || user.createdAt,
    }));

    res.status(200).json({ success: true, data: formattedUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


export const getSearchUserById = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await RegisterModel.findOne({ id: userId, adminApprovel: "approved" }).select(`
      _id id firstName lastName dateOfBirth height religion caste occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation
    `);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found or not approved" });
    }

    const calculateAge = (dob) => {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    const formattedUser = {
      id: user.id,
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      age: calculateAge(user.dateOfBirth),
      height: user.height,
      caste: user.caste,
      designation: user.designation,
      religion: user.religion,
      profession: user.occupation,
      salary: user.annualIncome,
      education: user.highestEducation,
      location: `${user.city || user.currentCity || ''}, ${user.state || user.currentState || ''}`,
      languages: Array.isArray(user.motherTongue)
        ? user.motherTongue.join(', ')
        : user.motherTongue,
      gender: user.gender,
      profileImage: user.profileImage,
      lastSeen: user.updatedAt || user.createdAt,
    };

    res.status(200).json({ success: true, data: formattedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


export const getUsersByPreference = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const preference = await PartnerPreferenceModel.findOne({ userId }).lean();
    const currentUser = await RegisterModel.findById(userId).lean();
    if (!currentUser)
      return res.status(404).json({ success: false, message: "User not found" });

    const today = new Date();
    const orConditions = [];

    // Gender is now strict
    const targetGender = preference?.gender || (currentUser.gender === "Male" ? "Female" : "Male");

    // Push other preferences if defined (soft matching)
    if (preference?.religion) orConditions.push({ religion: preference.religion });
    if (preference?.caste) orConditions.push({ caste: preference.caste });
    if (preference?.state) orConditions.push({ state: preference.state });
    if (preference?.city) orConditions.push({ city: preference.city });
    if (preference?.maritalStatus) orConditions.push({ maritalStatus: preference.maritalStatus });
    if (preference?.designation) orConditions.push({ designation: preference.designation });
    if (preference?.highestEducation) orConditions.push({ highestEducation: preference.highestEducation });
    if (preference?.income) orConditions.push({ annualIncome: { $gte: Number(preference.income) } });

    // Height range
    if (preference?.minHeight || preference?.maxHeight) {
      const heightCondition = {};
      if (preference.minHeight) heightCondition.$gte = Number(preference.minHeight);
      if (preference.maxHeight) heightCondition.$lte = Number(preference.maxHeight);
      orConditions.push({ height: heightCondition });
    }

    // Age range
    if (preference?.minAge || preference?.maxAge) {
      const ageCondition = {};
      if (preference.maxAge)
        ageCondition.$lte = new Date(today.getFullYear() - Number(preference.maxAge), today.getMonth(), today.getDate());
      if (preference.minAge)
        ageCondition.$gte = new Date(today.getFullYear() - Number(preference.minAge), today.getMonth(), today.getDate());
      orConditions.push({ dateOfBirth: ageCondition });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Main query: gender strict, soft match for other fields
    const query = {
      adminApprovel: "approved",
      _id: { $ne: userId },
      gender: targetGender,       // ✅ strict gender filter
      $or: orConditions.length ? orConditions : [{}],
    };

    const users = await RegisterModel.find(query)
      .select(`
        _id id firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `)
      .skip(skip)
      .limit(limit)
      .lean();

    const calculateAge = (dob) => {
      if (!dob) return "N/A";
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    const formattedUsers = users.map((user) => ({
      id: user.id,
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      age: calculateAge(user.dateOfBirth),
      height: user.height || "N/A",
      caste: user.caste || "N/A",
      designation: user.designation || "N/A",
      religion: user.religion || "N/A",
      profession: user.occupation || "N/A",
      salary: user.annualIncome || "N/A",
      education: user.highestEducation || "N/A",
      location: `${user.city || user.currentCity || ""}, ${user.state || user.currentState || ""}`.replace(/^, |, $/g, ""),
      languages: Array.isArray(user.motherTongue) ? user.motherTongue.join(", ") : user.motherTongue || "N/A",
      gender: user.gender || "N/A",
      profileImage: user.profileImage || "https://res.cloudinary.com/default-profile.png",
      lastSeen: user.updatedAt || user.createdAt,
    }));

    const total = await RegisterModel.countDocuments(query);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: formattedUsers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};


