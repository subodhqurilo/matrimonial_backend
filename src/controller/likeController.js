import { LikeModel } from "../modal/likeRequestModal.js";
import RegisterModel from "../modal/register.js";

// Utility to calculate age from DOB
const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

// this
export const sendLike = async (req, res) => {
  const senderId = req.userId;
  const { receiverId } = req.body;

  if (!senderId || !receiverId || senderId === receiverId) {
    return res.status(400).json({ message: 'Invalid like request' });
  }

  try {
    const existingLike = await LikeModel.findOne({ senderId, receiverId });
    if (existingLike) {
      return res.status(400).json({ message: 'Already liked' });
    }

    const reverseLike = await LikeModel.findOne({ senderId: receiverId, receiverId: senderId });

    const newLike = new LikeModel({
      userId: senderId,
      senderId,
      receiverId,
      status: reverseLike ? 'matched' : 'liked',
    });

    await newLike.save();

    if (reverseLike && reverseLike.status !== 'matched') {
      reverseLike.status = 'matched';
      await reverseLike.save();
    }

    res.status(201).json({
      success: true,
      message: reverseLike ? 'It’s a match!' : 'Like sent',
      data: newLike,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// this
export const unlikeUser = async (req, res) => {
  const senderId = req.userId;
  const { receiverId } = req.body;

  if (!senderId || !receiverId || senderId === receiverId) {
    return res.status(400).json({ success: false, message: 'Invalid sender or receiver' });
  }

  try {

    const like = await LikeModel.findOneAndDelete({ senderId, receiverId });

    if (!like) {
      return res.status(404).json({ success: false, message: 'Like not found' });
    }

    
    const reverseLike = await LikeModel.findOne({ senderId: receiverId, receiverId: senderId });

    if (reverseLike && reverseLike.status === 'matched') {
      reverseLike.status = 'liked';
      await reverseLike.save();
    }

    res.status(200).json({ success: true, message: 'Unliked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// this work proper according to frontend fields 

export const getReceivedLikes = async (req, res) => {
  try {
    console.log("User ID:", req.userId);
    const likes = await LikeModel.find({
      receiverId: req.userId
    })
      .populate('senderId', `
        id _id firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `)
      .sort({ createdAt: -1 });

    // Age calculation helper
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

 const formattedLikes = likes
  .filter((like) => like.senderId) // Exclude null senderId
  .map((like) => {
    const user = like.senderId;

    return {
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
  });


    res.status(200).json({ success: true, like: formattedLikes });
  } catch (error) {
    console.error('Error getting received likes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};





 // this 
export const getSentLikes = async (req, res) => {
  try {
    console.log(req.userId)
    const likes = await LikeModel.find({ senderId: req.userId })
      .populate('receiverId', `
        id firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `)
      .sort({ createdAt: -1 });

    // Helper function to calculate age
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

    const formattedLikes = likes.map((like) => {
      const user = like.receiverId;

      return {
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
    });

    res.status(200).json({ success: true, data: formattedLikes });
  } catch (error) {
    console.error('Error getting sent likes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};





export const getAllUsersILiked = async (req, res) => {
  try {
    const userId = req.userId;

    const likes = await LikeModel.find({ senderId: userId })
      .populate({
        path: 'receiverId',
        select: `fullName lastName userName dateOfBirth height religion occupation 
        annualIncome highestEducation city state motherTongue 
        gender updatedAt createdAt`
      });

    const profiles = likes.map(like => {
      const user = like.receiverId;

      return {
        name: `${user.fullName} ${user.lastName}`,
        age: calculateAge(user.dateOfBirth),
        height: user.height,
        religion: user.religion,
        profession: user.occupation,
        salary: user.annualIncome,
        education: user.highestEducation,
        location: `${user.city}, ${user.state}`,
        languages: user.motherTongue,
        gender: user.gender,
        lastSeen: user.updatedAt || user.createdAt,
        likeStatus: like.status,
      };
    });

    res.status(200).json({
      success: true,
      likedUsers: profiles,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};




export const getMatchedUsers = async (req, res) => {
  try {
    const userId = req.userId;

    const matches = await LikeModel.find({
      status: 'matched',
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).lean();

    const oppositeUserIds = matches.map((match) => {
      if (match.senderId.toString() === userId) {
        return match.receiverId;
      } else {
        return match.senderId;
      }
    });


    const uniqueUserIds = [...new Set(oppositeUserIds.map(String))];


    const matchedUsers = await RegisterModel.find({
      _id: { $in: uniqueUserIds },
      adminApprovel: 'approved'
    }).select(`
      _id id firstName lastName dateOfBirth height religion caste occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation
    `);

    // Age calculation
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

    // Format result
    const formatted = matchedUsers.map((user) => ({
      _id: user._id,
      id: user.id,
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

    res.status(200).json({ success: true, allMatches: formatted });
  } catch (error) {
    console.error('Error getting matched users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// They Shortlisted Me
export const getTheyShortlisted = async (req, res) => {
  const myUserId = req.userId;

  try {
    const likes = await LikeModel.find({ receiverId: myUserId })
      .populate('senderId', `
        _id id firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `)
      .sort({ createdAt: -1 });

    const data = likes.map(like => {
      const user = like.senderId;
      return {
        id: user.id,
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        age: calculateAge(user.dateOfBirth),
        height: user.height,
        caste: user.caste,
        designation: user.designation,
        religion: user.religion,
        salary: user.annualIncome,
        education: user.highestEducation,
        location: `${user.city || user.currentCity || ''}, ${user.state || user.currentState || ''}`,
        languages: user.motherTongue,
        gender: user.gender,
        profileImage: user.profileImage,
        lastSeen: user.updatedAt,
        viewedAt: like.createdAt,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching shortlist data', error });
  }
};
export const getIShortlisted = async (req, res) => {
  const myUserId = req.userId;

  try {
    const likes = await LikeModel.find({ senderId: myUserId })
      .populate('receiverId', `
        _id id firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `)
      .sort({ createdAt: -1 });

    const data = likes
      .filter(like => like.receiverId)
      .map(like => {
        const user = like.receiverId;

        return {
          id: user.id,
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          age: calculateAge(user.dateOfBirth),
          height: user.height,
          caste: user.caste,
          designation: user.designation,
          religion: user.religion,
          salary: user.annualIncome,
          education: user.highestEducation,
          location: `${user.city || user.currentCity || ''}, ${user.state || user.currentState || ''}`,
          languages: user.motherTongue,
          gender: user.gender,
          profileImage: user.profileImage,
          lastSeen: user.updatedAt,
          viewedAt: like.createdAt,
        };
      });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching I shortlisted data:', error);
    res.status(500).json({ success: false, message: 'Error fetching shortlist data', error });
  }
};








// Get mutual matches
// export const getMutualMatches = async (req, res) => {
//   try {
//     const matches = await LikeModel.find({
//       $or: [
//         { senderId: req.userId, status: 'matched' },
//         { receiverId: req.userId, status: 'matched' },
//       ]
//     })
//       .populate('senderId', 'firstName lastName profileImages partnerPreference.setAssProfileImage')
//       .populate('receiverId', 'firstName lastName profileImages partnerPreference.setAssProfileImage')
//       .sort({ createdAt: -1 });

//     res.status(200).json({ success: true, matches });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };
