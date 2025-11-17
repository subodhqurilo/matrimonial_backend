import { BlockModel } from "../modal/blockModel.js";


export const blockUser = async (req, res) => {
  try {
    const blockedBy = req.userId;
    const { userIdToBlock } = req.body;

    if (!blockedBy || !userIdToBlock) {
      return res.status(400).json({ success: false, message: 'Missing user id to block' });
    }

    if (blockedBy.toString() === userIdToBlock.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot block yourself' });
    }

    const block = await BlockModel.findOneAndUpdate(
      { blockedBy, blockedUser: userIdToBlock },
      { $setOnInsert: { blockedBy, blockedUser: userIdToBlock } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'User blocked',
      data: {
        blockedBy: block.blockedBy,
        blockedUser: block.blockedUser
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ success: true, message: 'User already blocked' });
    }
    console.error('blockUser error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


export const unblockUser = async (req, res) => {
  try {
    const blockedBy = req.userId;
    const { userIdToUnblock } = req.body;

    await BlockModel.findOneAndDelete({ blockedBy, blockedUser: userIdToUnblock });
    return res.status(200).json({ success: true, message: 'User unblocked' });
  } catch (err) {
    console.error('unblockUser error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


export const getMyBlockedList = async (req, res) => {
  try {
    const blockedBy = req.userId;

    const blocks = await BlockModel.find({ blockedBy }).populate('blockedUser');

    const formattedUsers = blocks.map((block) => {
      const user = block.blockedUser;

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
        location: `${user.city || ''}, ${user.state || ''}`,
        languages: Array.isArray(user.motherTongue)
          ? user.motherTongue.join(', ')
          : user.motherTongue,
        gender: user.gender,
        profileImage: user.profileImage,
        lastSeen: user.updatedAt || user.createdAt,
      };
    });

    return res.status(200).json({ success: true, data: formattedUsers });
  } catch (err) {
    console.error('getMyBlockedList error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
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
