import { AccountRequestModel } from '../modal/accountRequestModel.js';
import { BlockModel } from '../modal/blockModel.js';
import { LikeModel } from '../modal/likeRequestModal.js';
import PartnerPreferenceModel from '../modal/PartnerPreferenceModel.js';
import RegisterModel from '../modal/register.js';

// import { calculateAge } from '../utils/ageCalculate.js';

// export const getDailyRecomadation = async (req, res) => {
//   try {
//     const userId = req.userId;
//     if (!userId) return res.status(400).json({ message: 'User ID missing' });

//     const currentUser = await RegisterModel.findById(userId);
//     if (!currentUser) return res.status(404).json({ message: 'User not found' });

//     const oppositeGender = currentUser.gender === 'Male' ? 'Female' : 'Male';

//     const baseFilter = {
//       _id: { $ne: userId },
//       gender: oppositeGender,
//     };

//     const strongMatchFilter = {
//       ...baseFilter,
//       caste: currentUser.caste || undefined,
//       state: currentUser.state || undefined,
//       complexion: 'Fair',
//     };

//     // 1. Try exact match
//     let matchedUsers = await RegisterModel.find(strongMatchFilter).select(`
//       firstName lastName dateOfBirth height religion occupation
//       annualIncome highestEducation currentCity currentState motherTongue
//       gender imageProfileArray updatedAt createdAt
//     `);

//     // 2. Relax complexion
//     if (matchedUsers.length === 0) {
//       const relaxedFilter = { ...strongMatchFilter };
//       delete relaxedFilter.complexion;

//       matchedUsers = await RegisterModel.find(relaxedFilter).select(`
//         firstName lastName dateOfBirth height religion occupation
//         annualIncome highestEducation currentCity currentState motherTongue
//         gender imageProfileArray updatedAt createdAt
//       `);
//     }

//     // 3. Relax caste too (match only by gender and state)
//     if (matchedUsers.length === 0) {
//       const fallbackFilter = {
//         ...baseFilter,
//         state: currentUser.state,
//       };

//       matchedUsers = await RegisterModel.find(fallbackFilter).select(`
//         firstName lastName dateOfBirth height religion occupation
//         annualIncome highestEducation currentCity currentState motherTongue
//         gender imageProfileArray updatedAt createdAt
//       `);
//     }

//     // 4. Final fallback: only opposite gender
//     if (matchedUsers.length === 0) {
//       matchedUsers = await RegisterModel.find(baseFilter).select(`
//         firstName lastName dateOfBirth height religion occupation
//         annualIncome highestEducation currentCity currentState motherTongue
//         gender imageProfileArray updatedAt createdAt
//       `);
//     }

//     const calculateAge = (dob) => {
//       const today = new Date();
//       const birthDate = new Date(dob);
//       let age = today.getFullYear() - birthDate.getFullYear();
//       const m = today.getMonth() - birthDate.getMonth();
//       if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
//         age--;
//       }
//       return age;
//     };

//     const profiles = matchedUsers.map(user => ({
//       name: `${user.firstName} ${user.lastName}`,
//       age: calculateAge(user.dateOfBirth),
//       height: user.height,
//       religion: user.religion,
//       profession: user.occupation,
//       salary: user.annualIncome,
//       education: user.highestEducation,
//       location: `${user.currentCity || ''}, ${user.currentState || ''}`,
//       languages: user.motherTongue,
//       gender: user.gender,
//       profileImage: Array.isArray(user.imageProfileArray) && user.imageProfileArray.length > 0
//         ? user.imageProfileArray[0]
//         : null,
//       lastSeen: user.updatedAt || user.createdAt,
//     }));

//     res.status(200).json({ success: true, profiles });

//   } catch (error) {
//     console.error('Matching error:', error);
//     res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// };


export const getDailyRecomadation = async (req, res) => {
  try {
    const userId = req.userId;
    console.log("User ID:", userId);

    // Step 1: Blocked users
    const blockedUsers = await BlockModel.find({ blockedBy: userId }).select('blockedUser');
    const blockedUserIds = blockedUsers.map(block => block.blockedUser.toString());

    // Step 2: Users liked or matched by this user
    const likedUsers = await LikeModel.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    }).select('senderId receiverId');

    const likedUserIds = new Set();
    likedUsers.forEach(like => {
      if (like.senderId.toString() !== userId) likedUserIds.add(like.senderId.toString());
      if (like.receiverId.toString() !== userId) likedUserIds.add(like.receiverId.toString());
    });

    // Step 3: Users this user sent account requests to
    const sentRequests = await AccountRequestModel.find({ requesterId: userId }).select('receiverId');
    const requestedUserIds = sentRequests.map(req => req.receiverId.toString());

    const excludedUserIds = new Set([
      ...blockedUserIds,
      ...Array.from(likedUserIds),
      ...requestedUserIds,
      userId.toString() // Exclude self
    ]);

    // Step 5: Fetch users excluding blocked, liked, requested, and self
    const allUsers = await RegisterModel.find({
      _id: { $nin: Array.from(excludedUserIds) }
    }).select(`
      id _id firstName lastName dateOfBirth height religion caste occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation
    `);

    // Step 6: Age utility
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

    // Step 7: Format profiles
    const profiles = allUsers.map(user => ({
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
      location: `${user.city || ''}, ${user.state || ''}`,
      languages: Array.isArray(user.motherTongue)
        ? user.motherTongue.join(', ')
        : user.motherTongue,
      gender: user.gender,
      profileImage: user.profileImage,
      lastSeen: user.updatedAt || user.createdAt,
    }));

    res.status(200).json({ success: true, profiles });

  } catch (error) {
    console.error('Error fetching daily recommendations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};




export const blockUserRecomadationUserNotShow = async (req, res) => {
  try {
    const userId = req.userId;
    console.log(userId)
    // if (!userId) {
    //   return res.status(401).json({ success: false, message: 'Unauthorized' });
    // }

    // Step 1: Get the list of users this user has blocked
    const blockedUsers = await BlockModel.find({ blockedBy: userId }).select('blockedUser');
    const blockedUserIds = blockedUsers.map(block => block.blockedUser.toString());

    // Step 2: Fetch all users excluding blocked ones
    const allUsers = await RegisterModel.find({
      _id: { $nin: blockedUserIds, $ne: userId } // Exclude blocked users and self
    }).select(`
      id firstName lastName dateOfBirth height religion caste occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation
    `);

    // Step 3: Utility to calculate age
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

    // Step 4: Format response
    const profiles = allUsers.map(user => ({
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
      location: `${user.city || ''}, ${user.state || ''}`,
      languages: Array.isArray(user.motherTongue)
        ? user.motherTongue.join(', ')
        : user.motherTongue,
      gender: user.gender,
      profileImage: user.profileImage,
      lastSeen: user.updatedAt || user.createdAt,
    }));

    res.status(200).json({ success: true, profiles });

  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};





 

 




// export const getDailyRecomadation = async (req, res) => {
//   try {
//     const users = await RegisterModel.find({})
//       .select(
//         'firstName lastName dateOfBirth height religion occupation annualIncome highestEducation currentCity motherTongue gender profileImage updatedAt createdAt languages'
//       )
//       .limit(50);

//     const shuffled = users.sort(() => 0.5 - Math.random());
//     const selectedUsers = shuffled.slice(0, 10);

//     const profiles = selectedUsers.map((user) => ({
//       name: `${user.firstName} ${user.lastName}`,
//       age: calculateAge(user.dateOfBirth),
//       height: user.height,
//       // scrollImage:user.imageProfileArray,
//       religion: user.religion,
//       profession: user.occupation,
//       salary: user.annualIncome,
//       education: user.highestEducation,
//       location: user.currentCity,
//       languages: Array.isArray(user.languages) ? user.languages.join(',') : user.motherTongue,
//       profileImage: user.profileImage,
//       lastSeen: formatLastSeen(user.updatedAt || user.createdAt),
//     }));

//     res.status(200).json({ recommendedProfiles: profiles });
//   } catch (error) {
//     console.error('Error in getDailyRecomadation:', error);
//     res.status(500).json({ message: 'Server Error', error: error.message });
//   }
// };

const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const diff = Date.now() - birthDate.getTime();
  const ageDt = new Date(diff);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
};

const formatLastSeen = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `Last seen ${diffMins} mins ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `Last seen ${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};



// export const getDailyRecomadation = async (req, res) => {
//   try {
//     const userId = req.userId;

//     // Step 1: Get current user's preferences
//     const currentUser = await RegisterModel.findById(userId);
//     if (!currentUser) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const { gender, religion, caste, colorComplex } = currentUser;

//     // Step 2: Create opposite gender query (e.g., if user is male, fetch female)
//     const oppositeGender = gender === 'male' ? 'female' : 'male';

//     // Step 3: Filter users based on preferences
//     const users = await RegisterModel.find({
//       _id: { $ne: userId }, // Exclude current user
//       gender: oppositeGender,
//       religion: religion,
//       caste: caste,
//       colorComplex: colorComplex
//     })
//       .select(
//         'firstName lastName dateOfBirth height religion occupation annualIncome highestEducation currentCity motherTongue gender profileImage imageProfileArray updatedAt createdAt languages'
//       )
//       .limit(50);

//     // Step 4: Shuffle and pick 10
//     const shuffled = users.sort(() => 0.5 - Math.random());
//     const selectedUsers = shuffled.slice(0, 10);

//     // Step 5: Format response
//     const profiles = selectedUsers.map((user) => ({
//       name: `${user.firstName} ${user.lastName}`,
//       age: calculateAge(user.dateOfBirth),
//       height: user.height,
//       scrollImage: user.imageProfileArray,
//       religion: user.religion,
//       profession: user.occupation,
//       salary: user.annualIncome,
//       education: user.highestEducation,
//       location: user.currentCity,
//       languages: Array.isArray(user.languages) ? user.languages.join(', ') : user.motherTongue,
//       profileImage: user.profileImage,
//       lastSeen: formatLastSeen(user.updatedAt || user.createdAt),
//     }));

//     res.status(200).json({ recommendedProfiles: profiles });

//   } catch (error) {
//     console.error('Error in getDailyRecomadation:', error);
//     res.status(500).json({ message: 'Server Error', error: error.message });
//   }
// };

// // Helper to calculate age
// const calculateAge = (dob) => {
//   const birthDate = new Date(dob);
//   const ageDifMs = Date.now() - birthDate.getTime();
//   const ageDate = new Date(ageDifMs);
//   return Math.abs(ageDate.getUTCFullYear() - 1970);
// };

// // Helper to show last seen
// const formatLastSeen = (date) => {
//   const now = new Date();
//   const diffMs = now - new Date(date);
//   const diffMins = Math.floor(diffMs / (1000 * 60));
//   if (diffMins < 60) return `Last seen ${diffMins} mins ago`;
//   const diffHrs = Math.floor(diffMins / 60);
//   if (diffHrs < 24) return `Last seen ${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
//   const diffDays = Math.floor(diffHrs / 24);
//   return `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
// };




