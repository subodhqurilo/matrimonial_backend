import RegisterModel from "../modal/register.js";



export const updateAdditionalDetails = async (req, res) => {
  try {
    const userId = req.userId; // comes from auth middleware
    const updates = req.body;

    // Optional: Validate allowed fields here if needed

    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...updates,
          horoscope: updates.horoscope || {},
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Additional details updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('[Update Additional Details]', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong while updating additional details',
      error: error.message
    });
  }
};


export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await RegisterModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('[Get User By ID Error]', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};




export const updateProfileImagesOnly = async (req, res) => {
  try {
    const userId = req.userId;

    // Image from multer-cloudinary
    const profileImage = req.files?.["profileImage"]?.[0]?.path;

    if (!profileImage) {
      return res.status(400).json({
        success: false,
        message: "No profile image provided",
      });
    }

    // Find user
    const user = await RegisterModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updateData = {
      profileImage,
    };

    // Update user
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      data: updatedUser, // ⭐ RETURN THE UPDATED USER
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


