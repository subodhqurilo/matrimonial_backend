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
  console.log("Fetching profiles I viewed for userId:", userId);

  try {
    const views = await ProfileViewModel.find({ userId: userId })
      .populate('profileIViewed.userId');

    console.log("Fetched views:", views);

    const formatted = views
      .filter(v => v.profileIViewed?.userId)
      .map(v => formatUser(v.profileIViewed.userId));

    res.status(200).json({ success: true, data: formatted });

  } catch (error) {
    console.error('[getProfilesIViewed Error]', error);
    res.status(500).json({ success: false, message: 'Error fetching profiles I viewed', error });
  }
};


// ✅ Get Profiles Who Viewed Me
export const getProfilesWhoViewedMe = async (req, res) => {
  const userId = req.userId;
  console.log("Fetching profiles that viewed userId:", userId);

  try {
    const views = await ProfileViewModel.find({ userId: userId })
      .populate('profileViewedBy.userId');

    console.log("Fetched views:", views);

    const formatted = views
      .filter(v => v.profileViewedBy?.userId)
      .map(v => formatUser(v.profileViewedBy.userId));

    res.status(200).json({ success: true, data: formatted });

  } catch (error) {
    console.error('[getProfilesWhoViewedMe Error]', error);
    res.status(500).json({ success: false, message: 'Error fetching viewers', error });
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
