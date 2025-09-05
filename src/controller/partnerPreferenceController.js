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
