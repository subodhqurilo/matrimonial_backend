import { LikeModel } from "../modal/likeRequestModal.js";
import RegisterModel from "../modal/register.js";
import NotificationModel from "../modal/Notification.js";
import { sendExpoPush } from "../utils/expoPush.js"; // expo push function

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
  try {
    const senderId = req.userId;
    const { receiverId } = req.body;

    // ------------------------------
    // 1️⃣ Basic validations
  
    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "senderId and receiverId are required",
      });
    }

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot like your own profile",
      });
    }

    // ------------------------------
    // 2️⃣ Check if already liked
    
    const existingLike = await LikeModel.findOne({ senderId, receiverId });

    if (existingLike) {
      return res.status(400).json({
        success: false,
        message: "You already liked this user",
      });
    }

    // ------------------------------
    // 3️⃣ Check if reverse like exists (receiver already liked sender)
    
    const reverseLike = await LikeModel.findOne({
      senderId: receiverId,
      receiverId: senderId,
    });

    // Determine status
    const status = reverseLike ? "matched" : "liked";

    // ------------------------------
    // 4️⃣ Create like entry
    
    const newLike = await LikeModel.create({
      userId: senderId,
      senderId,
      receiverId,
      status,
    });

    // ------------------------------
    // 5️⃣ If reverse like exists → update both to "matched"
    
    if (reverseLike && reverseLike.status !== "matched") {
      reverseLike.status = "matched";
      await reverseLike.save();
    }

    return res.status(201).json({
      success: true,
      message: reverseLike ? "It’s a match!" : "Like sent successfully",
      data: newLike,
    });

  } catch (error) {
    console.error("[SEND LIKE ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


// this
export const unlikeUser = async (req, res) => {
  try {
    const senderId = req.userId;
    const { receiverId } = req.body;

    // -----------------------------------
    // 1️⃣ Validate Input
    // -----------------------------------
    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "senderId and receiverId are required",
      });
    }

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot unlike yourself",
      });
    }

    // -----------------------------------
    // 2️⃣ Check if like exists
    // -----------------------------------
    const like = await LikeModel.findOne({ senderId, receiverId });

    if (!like) {
      return res.status(404).json({
        success: false,
        message: "Like does not exist",
      });
    }

    // -----------------------------------
    // 3️⃣ Delete the like
    // -----------------------------------
    await LikeModel.findOneAndDelete({ senderId, receiverId });

    // -----------------------------------
    // 4️⃣ Fix reverseLike (if matched → set back to only 'liked')
    // -----------------------------------
    const reverseLike = await LikeModel.findOne({
      senderId: receiverId,
      receiverId: senderId,
    });

    if (reverseLike && reverseLike.status === "matched") {
      reverseLike.status = "liked";
      await reverseLike.save();
    }

    // -----------------------------------
    // 5️⃣ Final Response
    // -----------------------------------
    return res.status(200).json({
      success: true,
      message: "Unliked successfully",
    });

  } catch (error) {
    console.error("[UNLIKE ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



// this work proper according to frontend fields 

export const getReceivedLikes = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing",
      });
    }

    // -----------------------------------
    // 1️⃣ Fetch likes received
    // -----------------------------------
    const likes = await LikeModel.find({ receiverId: userId })
      .populate(
        "senderId",
        `
          id _id firstName lastName dateOfBirth height religion caste occupation
          annualIncome highestEducation currentCity city state currentState motherTongue
          gender profileImage updatedAt createdAt designation
        `
      )
      .sort({ createdAt: -1 });

    // -----------------------------------
    // 2️⃣ Helper to calculate age
    // -----------------------------------
    const calculateAge = (dob) => {
      if (!dob) return null;
      const birth = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    // -----------------------------------
    // 3️⃣ Format response
    // -----------------------------------
    const formatted = likes
      .filter((like) => like.senderId) // avoid null sender
      .map((like) => {
        const u = like.senderId;

        const location = [
          u.city || u.currentCity || "",
          u.state || u.currentState || "",
        ]
          .filter(Boolean)
          .join(", ");

        return {
          id: u.id,
          _id: u._id,
          name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
          age: calculateAge(u.dateOfBirth),
          height: u.height,
          caste: u.caste,
          designation: u.designation,
          religion: u.religion,
          profession: u.occupation,
          salary: u.annualIncome,
          education: u.highestEducation,
          location,
          languages: Array.isArray(u.motherTongue)
            ? u.motherTongue.join(", ")
            : u.motherTongue || "",
          gender: u.gender,
          profileImage: u.profileImage,
          lastSeen: u.updatedAt || u.createdAt,
          likeStatus: like.status, // liked / matched
        };
      });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      likes: formatted,
    });
  } catch (error) {
    console.error("Error getting received likes:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};






 // this 
export const getSentLikes = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing",
      });
    }

    // -----------------------------------
    // 1️⃣ Fetch likes sent by user
    // -----------------------------------
    const likes = await LikeModel.find({ senderId: userId })
      .populate(
        "receiverId",
        `
          id _id firstName lastName dateOfBirth height religion caste occupation
          annualIncome highestEducation currentCity city state currentState motherTongue
          gender profileImage updatedAt createdAt designation
        `
      )
      .sort({ createdAt: -1 });

    // -----------------------------------
    // 2️⃣ Helper: Age calculator
    // -----------------------------------
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

    // -----------------------------------
    // 3️⃣ Format Response
    // -----------------------------------
    const formatted = likes
      .filter((like) => like.receiverId) // avoid null profiles
      .map((like) => {
        const u = like.receiverId;

        const location = [
          u.city || u.currentCity || "",
          u.state || u.currentState || "",
        ]
          .filter(Boolean)
          .join(", ");

        return {
          id: u.id,
          _id: u._id,
          name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
          age: calculateAge(u.dateOfBirth),
          height: u.height,
          caste: u.caste,
          designation: u.designation,
          religion: u.religion,
          profession: u.occupation,
          salary: u.annualIncome,
          education: u.highestEducation,
          location,
          languages: Array.isArray(u.motherTongue)
            ? u.motherTongue.join(", ")
            : u.motherTongue || "",
          gender: u.gender,
          profileImage: u.profileImage,
          lastSeen: u.updatedAt || u.createdAt,
          likeStatus: like.status, // liked / matched
        };
      });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });

  } catch (error) {
    console.error("Error getting sent likes:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting sent likes",
      error: error.message,
    });
  }
};






export const getAllUsersILiked = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing",
      });
    }

    // -----------------------------------
    // Fetch likes where YOU are the sender
    // -----------------------------------
    const likes = await LikeModel.find({ senderId: userId })
      .populate(
        "receiverId",
        `
          id _id firstName lastName dateOfBirth height religion caste occupation
          annualIncome highestEducation currentCity city state currentState motherTongue
          gender profileImage updatedAt createdAt designation
        `
      )
      .sort({ createdAt: -1 });

    // Helper – Age Calculation
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

    // -----------------------------------
    // Format final response
    // -----------------------------------
    const profiles = likes
      .filter((like) => like.receiverId) // avoid null users
      .map((like) => {
        const user = like.receiverId;

        const location = [
          user.city || user.currentCity || "",
          user.state || user.currentState || "",
        ]
          .filter(Boolean)
          .join(", ");

        return {
          id: user.id,
          _id: user._id,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          age: calculateAge(user.dateOfBirth),
          height: user.height,
          caste: user.caste,
          religion: user.religion,
          profession: user.occupation,
          salary: user.annualIncome,
          education: user.highestEducation,
          location,
          languages: Array.isArray(user.motherTongue)
            ? user.motherTongue.join(", ")
            : user.motherTongue || "",
          gender: user.gender,
          profileImage: user.profileImage,
          lastSeen: user.updatedAt || user.createdAt,
          likeStatus: like.status, // liked / matched
        };
      });

    return res.status(200).json({
      success: true,
      count: profiles.length,
      likedUsers: profiles,
    });
  } catch (error) {
    console.error("[getAllUsersILiked Error]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
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

export const getAllUsers = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: userId missing",
      });
    }

    // Fetch all users except the logged-in user
    const users = await RegisterModel.find(
      { _id: { $ne: userId } }  // exclude yourself
    )
      .select("-password -mobileOTP") // hide sensitive fields
      .sort({ createdAt: -1 });       // newest first

    return res.status(200).json({
      success: true,
      message: "All users fetched successfully",
      count: users.length,
      users,
    });

  } catch (error) {
    console.error("[getAllUsers ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
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


export const getShortlistCount = async (req, res) => {
  try {
    const myUserId = req.userId;

    // Get all shortlisted records with receiver details (same as getIShortlisted)
    const likes = await LikeModel.find({ senderId: myUserId })
      .populate('receiverId', `
        _id id firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `);

    // Apply SAME FILTER as main API
    const validShortlisted = likes.filter(like => like.receiverId);

    return res.status(200).json({
      success: true,
      count: validShortlisted.length,
      message: "Shortlisted users count fetched successfully",
    });

  } catch (error) {
    console.error("Error fetching shortlist count:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching shortlist count",
      error: error.message,
    });
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
