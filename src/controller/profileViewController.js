import ProfileViewModel from "../modal/profileView.js";

// 🎂 Calculate age
function calculateAge(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  return new Date(diff).getUTCFullYear() - 1970;
}

// 🔁 Format user data
function formatUser(user) {
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
    languages: Array.isArray(user.motherTongue) ? user.motherTongue.join(', ') : user.motherTongue,
    gender: user.gender,
    profileImage: user.profileImage,
    lastSeen: user.updatedAt || user.createdAt,
  };
}

// ✅ Save Profile View
export const saveProfileView = async (req, res) => {
  const userId = req.userId;
  const { viewedUserId } = req.body;

  try {
    if (!viewedUserId) {
      return res.status(400).json({ success: false, message: 'Viewed userId is required' });
    }

    const existingView = await ProfileViewModel.findOne({
      'profileViewedBy.userId': viewedUserId,
      'profileIViewed.userId': userId,
    });

    if (existingView) {
      existingView.profileViewedBy.viewedAt = new Date();
      existingView.profileIViewed.viewedAt = new Date();
      await existingView.save();

      return res.status(200).json({ success: true, message: 'Profile view updated.' });
    }

    const newView = new ProfileViewModel({
      userId,
      profileViewedBy: {
        userId: viewedUserId,
        viewedAt: new Date(),
      },
      profileIViewed: {
        userId,
        viewedAt: new Date(),
      },
    });

    await newView.save();
    res.status(201).json({ success: true, message: 'Profile view recorded.' });

  } catch (error) {
    console.error('[Profile View Error]', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// ✅ Get Profiles I Viewed
export const getProfilesIViewed = async (req, res) => {
  const userId = req.userId;

  try {
    const views = await ProfileViewModel.find({ userId })
      .populate("profileIViewed.userId");

    let viewedUsers = [];

    views.forEach(entry => {
      const p = entry.profileIViewed;

      if (p?.userId) {
        viewedUsers.push({
          ...formatUser(p.userId),
          viewedAt: p.viewedAt
        });
      }
    });

    // 🛑 Remove Duplicate Profiles (keep latest viewedAt)
    const uniqueMap = {};

    viewedUsers.forEach(user => {
      const id = user._id.toString();

      if (!uniqueMap[id] || new Date(user.viewedAt) > new Date(uniqueMap[id].viewedAt)) {
        uniqueMap[id] = user;
      }
    });

    // Convert object back to array
    const uniqueUsers = Object.values(uniqueMap);

    // 🔥 Sort by latest view
    uniqueUsers.sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));

    return res.status(200).json({
      success: true,
      count: uniqueUsers.length,
      data: uniqueUsers
    });

  } catch (error) {
    console.error("[getProfilesIViewed Error]", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching profiles I viewed",
      error: error.message
    });
  }
};



// ✅ Get Profiles Who Viewed Me
export const getProfilesWhoViewedMe = async (req, res) => {
  const userId = req.userId;

  try {
    const views = await ProfileViewModel.find({ userId })
      .populate("profileViewedBy.userId");

    let viewedByUsers = [];

    views.forEach(entry => {
      let item = entry.profileViewedBy;

      if (!item) return;

      // CASE 1: If profileViewedBy is an ARRAY
      if (Array.isArray(item)) {
        item.forEach(p => {
          if (p?.userId) {
            viewedByUsers.push({
              ...formatUser(p.userId),
              viewedAt: p.viewedAt
            });
          }
        });
      }

      // CASE 2: If profileViewedBy is an OBJECT
      else if (item?.userId) {
        viewedByUsers.push({
          ...formatUser(item.userId),
          viewedAt: item.viewedAt
        });
      }
    });

    // 🛑 REMOVE DUPLICATE PROFILES
    const uniqueMap = {};

    viewedByUsers.forEach(user => {
      const id = user._id.toString();

      if (!uniqueMap[id] || new Date(user.viewedAt) > new Date(uniqueMap[id].viewedAt)) {
        uniqueMap[id] = user;
      }
    });

    const uniqueUsers = Object.values(uniqueMap);

    // 🔥 SORT BY MOST RECENT VIEWS
    uniqueUsers.sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));

    return res.status(200).json({
      success: true,
      count: uniqueUsers.length,
      data: uniqueUsers
    });

  } catch (error) {
    console.error("[getProfilesWhoViewedMe Error]", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching viewers",
      error: error.message
    });
  }
};



// ✅ Combined Summary (I viewed + Who viewed me)
export const getMyProfileViewsSummary = async (req, res) => {
  const userId = req.userId;

  try {
    const iViewed = await ProfileViewModel.find({ 'profileViewedBy.userId': userId })
      .populate('profileIViewed.userId')
      .sort({ 'profileViewedBy.viewedAt': -1 });

    const viewedMe = await ProfileViewModel.find({ 'profileIViewed.userId': userId })
      .populate('profileViewedBy.userId')
      .sort({ 'profileIViewed.viewedAt': -1 });

    const iViewedFormatted = iViewed
      .filter(v => v.profileIViewed?.userId)
      .map(v => formatUser(v.profileIViewed.userId));

    const viewedMeFormatted = viewedMe
      .filter(v => v.profileViewedBy?.userId)
      .map(v => formatUser(v.profileViewedBy.userId));

    res.status(200).json({
      success: true,
      iViewed: iViewedFormatted,
      viewedMe: viewedMeFormatted,
    });

  } catch (error) {
    console.error('[getMyProfileViewsSummary Error]', error);
    res.status(500).json({ success: false, message: 'Error fetching profile views', error });
  }
};
