import { BlockModel } from "../modal/blockModel.js";


export const blockUser = async (req, res) => {
  try {
    const blockedBy = req.userId;              // The person performing the block
    const { userIdToBlock } = req.body;        // The target user

    // Validation
    if (!blockedBy || !userIdToBlock) {
      return res.status(400).json({
        success: false,
        message: "Missing required user ID"
      });
    }

    // Prevent self-block
    if (blockedBy.toString() === userIdToBlock.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot block yourself"
      });
    }

    // Check if already blocked
    const alreadyBlocked = await BlockModel.findOne({
      blockedBy,
      blockedUser: userIdToBlock
    });

    if (alreadyBlocked) {
      return res.status(200).json({
        success: true,
        message: "User already blocked",
        data: alreadyBlocked
      });
    }

    // Create block entry
    const blockEntry = await BlockModel.create({
      blockedBy,
      blockedUser: userIdToBlock
    });

    return res.status(200).json({
      success: true,
      message: "User blocked successfully",
      data: blockEntry
    });

  } catch (error) {
    console.error("blockUser error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};



export const unblockUser = async (req, res) => {
  try {
    const blockedBy = req.userId;
    const { userIdToUnblock } = req.body;

    // Validation
    if (!blockedBy || !userIdToUnblock) {
      return res.status(400).json({
        success: false,
        message: "Missing required user ID"
      });
    }

    // Prevent self-unblock error
    if (blockedBy.toString() === userIdToUnblock.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot unblock yourself"
      });
    }

    // Check if entry exists
    const exists = await BlockModel.findOne({
      blockedBy,
      blockedUser: userIdToUnblock
    });

    if (!exists) {
      return res.status(200).json({
        success: true,
        message: "User is not blocked"
      });
    }

    // Delete block entry
    await BlockModel.findOneAndDelete({
      blockedBy,
      blockedUser: userIdToUnblock
    });

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully"
    });

  } catch (err) {
    console.error("unblockUser error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};



export const getMyBlockedList = async (req, res) => {
  try {
    const userId = req.userId;

    // Find all block entries where you are the blocker
    const blocked = await BlockModel.find({ blockedBy: userId })
      .populate("blockedUser", "firstName lastName profileImage gender age currentCity currentState");

    // Format clean output
    const formatted = blocked.map(entry => ({
      _id: entry.blockedUser?._id,
      name: `${entry.blockedUser?.firstName || ''} ${entry.blockedUser?.lastName || ''}`,
      profileImage: entry.blockedUser?.profileImage || null,
      gender: entry.blockedUser?.gender,
      location: `${entry.blockedUser?.currentCity || ''}, ${entry.blockedUser?.currentState || ''}`,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });

  } catch (err) {
    console.error("getMyBlockedList error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};





export const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};
export const getBlockedCount = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing user ID"
      });
    }

    // Count how many users this person has blocked
    const count = await BlockModel.countDocuments({ blockedBy: userId });

    return res.status(200).json({
      success: true,
      count,
      message: "Blocked users count fetched successfully"
    });

  } catch (error) {
    console.error("getBlockedCount error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
