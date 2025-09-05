import moment from 'moment';
import RegisterModel from '../modal/register.js';
import mongoose from 'mongoose'; 
import ReportModel from '../modal/ReportModel.js';
import MatchModel from '../modal/MatchModel.js';

 

 
 

export const getStatsSummary = async (req, res) => {
  try {
    const now = moment();

    const todayStart = now.clone().startOf('day');
    const todayEnd = now.clone().endOf('day');

    const yesterdayStart = now.clone().subtract(1, 'day').startOf('day');
    const yesterdayEnd = now.clone().subtract(1, 'day').endOf('day');

    const thisWeekStart = now.clone().startOf('isoWeek');
    const thisWeekEnd = now.clone().endOf('isoWeek');

    const lastWeekStart = now.clone().subtract(1, 'weeks').startOf('isoWeek');
    const lastWeekEnd = now.clone().subtract(1, 'weeks').endOf('isoWeek');

    const totalUsers = await RegisterModel.countDocuments();

    const newSignupsToday = await RegisterModel.countDocuments({
      createdAt: { $gte: todayStart.toDate(), $lte: todayEnd.toDate() },
    });

    const newSignupsYesterday = await RegisterModel.countDocuments({
      createdAt: { $gte: yesterdayStart.toDate(), $lte: yesterdayEnd.toDate() },
    });

    const signupChangePercent = newSignupsYesterday > 0
      ? (((newSignupsToday - newSignupsYesterday) / newSignupsYesterday) * 100).toFixed(1)
      : (newSignupsToday > 0 ? 100 : 0).toFixed(1);

    const verifiedProfilesThisWeek = await RegisterModel.countDocuments({
      verification: { $exists: true, $ne: '' },
      createdAt: { $gte: thisWeekStart.toDate(), $lte: thisWeekEnd.toDate() },
    });

    const verifiedProfilesLastWeek = await RegisterModel.countDocuments({
      verification: { $exists: true, $ne: '' },
      createdAt: { $gte: lastWeekStart.toDate(), $lte: lastWeekEnd.toDate() },
    });

    const verifiedChangePercent = verifiedProfilesLastWeek > 0
      ? (((verifiedProfilesThisWeek - verifiedProfilesLastWeek) / verifiedProfilesLastWeek) * 100).toFixed(1)
      : (verifiedProfilesThisWeek > 0 ? 100 : 0).toFixed(1);

    const pendingVerifications = await RegisterModel.countDocuments({ adminApprovel: 'pending' });

    const pendingVerificationsThisWeek = await RegisterModel.countDocuments({
      adminApprovel: 'pending',
      createdAt: { $gte: thisWeekStart.toDate(), $lte: thisWeekEnd.toDate() },
    });

    const pendingVerificationsLastWeek = await RegisterModel.countDocuments({
      adminApprovel: 'pending',
      createdAt: { $gte: lastWeekStart.toDate(), $lte: lastWeekEnd.toDate() },
    });

    const pendingChangePercent = pendingVerificationsLastWeek > 0
      ? (((pendingVerificationsThisWeek - pendingVerificationsLastWeek) / pendingVerificationsLastWeek) * 100).toFixed(1)
      : (pendingVerificationsThisWeek > 0 ? 100 : 0).toFixed(1);

    const activeUsers = await RegisterModel.countDocuments({
      lastLoginAt: { $gte: now.clone().subtract(1, 'days').toDate() },
    });

    const activeUsersLastWeek = await RegisterModel.countDocuments({
      lastLoginAt: {
        $gte: now.clone().subtract(8, 'days').toDate(),
        $lte: now.clone().subtract(7, 'days').toDate(),
      },
    });

    const activeUsersChangePercent = activeUsersLastWeek > 0
      ? (((activeUsers - activeUsersLastWeek) / activeUsersLastWeek) * 100).toFixed(1)
      : (activeUsers > 0 ? 100 : 0).toFixed(1);

  const pendingReportedCount = await ReportModel.countDocuments({ status: 'Pending' });
const pendingReportedPercent = totalUsers > 0
  ? ((pendingReportedCount / totalUsers) * 100).toFixed(1)
  : 0;


   const totalBlockedReportsCount = await ReportModel.countDocuments({ status: 'Blocked' });

    const blockedPercent = totalUsers > 0
      ? ((totalBlockedReportsCount / totalUsers) * 100).toFixed(1)
      : 0;

    res.status(200).json({
      totalUsers,
      newSignups: newSignupsToday,
      signupChangePercent,
      verifiedProfiles: verifiedProfilesThisWeek,
      verifiedChangePercent,
      pendingVerifications,
      pendingChangePercent,
      activeUsers,
      activeUsersChangePercent,
      reportedPercent: parseFloat(pendingReportedPercent),
      blockedPercent: parseFloat(blockedPercent),
    });

  } catch (error) {
    console.error('Stats Fetch Error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};






export const getSignupGender = async (req, res) => {
  try {

    const allUsers = await RegisterModel.find({});

    const genderCounts = { Male: 0, Female: 0, Others: 0 };
    const matchStats = {
      stillLooking: 0,
      matched: 0,
      newlyRegistered: 0,
      inactive: 0,
    };

    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const signInDataMap = new Map(); 

  
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPreviousMonth = new Date(currentYear, currentMonth, 0).getDate(); 

    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const dayKey = String(i).padStart(2, '0');
      signInDataMap.set(dayKey, { day: dayKey, july: 0, june: 0 }); 
    }
 

    allUsers.forEach(user => {
      const createdAt = new Date(user.createdAt);
      const userMonth = createdAt.getMonth();
      const userYear = createdAt.getFullYear();
      const userDay = String(createdAt.getDate()).padStart(2, '0');

    
      if (user.gender in genderCounts) {
        genderCounts[user.gender]++;
      } else {
        genderCounts.Others++;
      }

   
      if (user.adminApprovel === 'approved') {
        matchStats.matched++;
      } else if (!user.isMobileVerified) {
        matchStats.inactive++;
      } else {
     
        const diffTime = Math.abs(today - createdAt);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          matchStats.newlyRegistered++;
        } else {
          matchStats.stillLooking++;
        }
      }

    
      if (userYear === currentYear) {
        if (userMonth === currentMonth) {
          if (signInDataMap.has(userDay)) {
            signInDataMap.get(userDay).july++;
          }
        } else if (userMonth === currentMonth - 1 || (currentMonth === 0 && userMonth === 11)) {  
          if (signInDataMap.has(userDay)) {
            signInDataMap.get(userDay).june++; 
          }
        }
      }
    });

    const signInData = Array.from(signInDataMap.values()).sort((a, b) => parseInt(a.day) - parseInt(b.day));



    res.json({
      signInData,
      genderData: [
        { name: 'Male', value: genderCounts.Male },
        { name: 'Female', value: genderCounts.Female },
        // { name: 'Others', value: genderCounts.Others },
      ],
      matchData: [
        { name: 'Still Looking', value: matchStats.stillLooking },
        { name: 'Successfully Matched', value: matchStats.matched },
        { name: 'Newly Registered', value: matchStats.newlyRegistered },
        { name: 'Inactive', value: matchStats.inactive },
      ],
      totalJulySignIns: signInData.reduce((sum, dayData) => sum + dayData.july, 0),
    });

  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
};

 


export const getUsers = async (req, res) => {
  try {
    const { search = '', status, gender, page = 1, limit = 5 } = req.query;

    const query = {};

    if (search) {
      // Try to search by full _id if it's a valid ObjectId, otherwise search by name fields
if (mongoose.Types.ObjectId.isValid(search)) {
  query._id = new mongoose.Types.ObjectId(String(search)); // safe
}
 
      else {
        // If it's not a valid ObjectId, search across name fields
        query.$or = [
          { id: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { middleName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
        ];
      }
    }

    if (status) {
      query.adminApprovel = status;
    }

    if (gender) {
      query.gender = gender;
    }

    const total = await RegisterModel.countDocuments(query);

    const users = await RegisterModel.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const formattedUsers = users.map((user) => ({
      // Consider if slicing _id is really what you want for display.
      // A full ID or a proper sequential user ID might be better.
      id: `#${user.id}`,
      name: `${user.fullName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim(),
      location: user.currentCity || user.city || 'N/A',
      gender: user.gender || 'N/A',
      joined: moment(user.createdAt).format('DD MMM, YYYY'),
      verified: user.verification === 'Verified',
      status: user.adminApprovel || 'Pending',
      lastActive: moment(user.updatedAt).format('DD MMM, YYYY'),

    }));

    res.status(200).json({
      data: formattedUsers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};






export const getUserManage = async (req, res) => {
  try {
    const now = moment();
    const lastWeek = moment().subtract(7, 'days');

    const [totalUsers, totalUsersLastWeek] = await Promise.all([
      RegisterModel.countDocuments(),
      RegisterModel.countDocuments({ createdAt: { $lte: lastWeek.toDate() } }),
    ]);

   const startOfToday = moment().startOf('day').toDate();
const endOfToday = moment().endOf('day').toDate();

const startOfYesterday = moment().subtract(1, 'day').startOf('day').toDate();
const endOfYesterday = moment().subtract(1, 'day').endOf('day').toDate();

const [newSignups, newSignupsLastWeek] = await Promise.all([
  RegisterModel.countDocuments({
    createdAt: { $gte: startOfToday, $lte: endOfToday },
  }),
  RegisterModel.countDocuments({
    createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
  }),
]);


    const profileCompleted = await RegisterModel.countDocuments({
      profileImage: { $ne: null },
      profileFor: { $ne: null },
      gender: { $ne: null },
      currentCity: { $ne: null },
    });

    const profileIncomplete = totalUsers - profileCompleted;

    const approvedProfilesCount = await RegisterModel.countDocuments({
      adminApprovel: 'approved',
    });

    // Fetch a sample of approved profile images
    const approvedProfileImages = await RegisterModel.find({
      adminApprovel: 'approved',
      profileImage: { $ne: null },
    })
      .select('profileImage')
      .limit(4); // Limit to 4 images for display
    const approvedImageUrls = approvedProfileImages.map(
      (user) => user.profileImage
    );

    const pendingProfilesCount = await RegisterModel.countDocuments({
      adminApprovel: 'pending',
    });

    // Fetch a sample of pending profile images
    const pendingProfileImages = await RegisterModel.find({
      adminApprovel: 'pending',
      profileImage: { $ne: null },
    })
      .select('profileImage')
      .limit(4); // Limit to 4 images for display
    const pendingImageUrls = pendingProfileImages.map(
      (user) => user.profileImage
    );

    const percentageChange = (current, previous) => {
      if (previous === 0) return 0;
      return +(((current - previous) / previous) * 100).toFixed(1);
    };

    const direction = (change) => (change >= 0 ? 'up' : 'down');

    // For profileCompleted and profileIncomplete change, you'll need to define how "last week" is calculated for these specific metrics more precisely if they aren't just based on totalUsers last week.
    // For simplicity, I'm just putting placeholder values for change as it seems the original code did too.
    const profileCompletedLastWeek = 0; // You'll need to calculate this based on your logic
    const profileIncompleteLastWeek = 0; // You'll need to calculate this based on your logic

    // Placeholder for approved/pending change from last week - you'll need to implement actual calculation
    const approvedProfilesLastWeek = 100; // Example
    const pendingProfilesLastWeek = 50; // Example


    res.status(200).json({
      totalUsers: {
        count: totalUsers,
        change: percentageChange(totalUsers, totalUsersLastWeek),
        trend: direction(percentageChange(totalUsers, totalUsersLastWeek)),
      },
      newSignups: {
        count: newSignups,
        change: percentageChange(newSignups, newSignupsLastWeek),
        trend: direction(percentageChange(newSignups, newSignupsLastWeek)),
      },
      profileCompleted: {
        count: profileCompleted,
        change: percentageChange(profileCompleted, profileCompletedLastWeek),
        trend: direction(percentageChange(profileCompleted, profileCompletedLastWeek)),
      },
      profileIncomplete: {
        count: profileIncomplete,
        change: percentageChange(profileIncomplete, profileIncompleteLastWeek),
        trend: direction(percentageChange(profileIncomplete, profileIncompleteLastWeek)),
      },
      approvedProfiles: {
        count: approvedProfilesCount,
        change: percentageChange(approvedProfilesCount, approvedProfilesLastWeek), // Replace with actual calculation
        trend: direction(percentageChange(approvedProfilesCount, approvedProfilesLastWeek)),
        profileImage: approvedImageUrls, // Now includes actual image URLs
      },
      pendingProfiles: {
        count: pendingProfilesCount,
        change: percentageChange(pendingProfilesCount, pendingProfilesLastWeek), // Replace with actual calculation
        trend: direction(percentageChange(pendingProfilesCount, pendingProfilesLastWeek)),
        profileImage: pendingImageUrls, // Now includes actual image URLs
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user stats', error: err.message });
  }
};



export const getAllManageUserData = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      statusFilter = '',
      genderFilter = '',
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        {id:{$regex: search, $options: 'i' }},
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ];
    }

    if (statusFilter) {
      query.adminApprovel = statusFilter;
    }

    if (genderFilter) {
      query.gender = genderFilter;
    }

    const total = await RegisterModel.countDocuments(query);

    const users = await RegisterModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error while fetching users',
      error: error.message,
    });
  }
};

export const updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateFields = req.body;

    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message,
    });
  }
};






export const getFilteredManageUsers = async (req, res) => {
  try {
    const {
      search = '',
      status = '',
      gender = '',
      sortField = '',
      sortOrder = 'asc',
      page = 1,
      limit = 5,
    } = req.query;

    const filter = {};

    // 1. Improved Search Logic:
    // This allows searching by partial name or partial _id (last 5 digits)
    if (search) {
      // First, check if the search term could be a partial ID (last 5 digits)
      // This is a rough check; for exact ID matching, the frontend would need to send the full ID
      const isPotentialIdSearch = /^[a-fA-F0-9]{5}$/.test(search); // Checks if it's 5 hex characters

      if (isPotentialIdSearch) {
        // If it looks like an ID fragment, try to match using $regex
        // Note: This won't efficiently use an index if not at the start of the string
        filter._id = { $regex: search, $options: 'i' };
      } else {
        // Otherwise, search by name (case-insensitive)
        filter.$or = [
          { id: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
        ];
      }
    }

    // 2. Case-Insensitive Status Filter
    if (status) {
      filter.adminApprovel = { $regex: status, $options: 'i' }; // Make status filter case-insensitive
    }

    // 3. Case-Insensitive Gender Filter
    // Ensure the `gender` field in your `RegisterModel` stores values that match 'Male', 'Female', 'Others'
    // or adjust this regex to match what's stored (e.g., 'male' should match 'Male')
    if (gender) {
      filter.gender = { $regex: gender, $options: 'i' }; // Make gender filter case-insensitive
    }

    const sortOptions = {};

    // Apply sorting if field given, else default to createdAt (newest first)
    if (sortField) {
      sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      RegisterModel.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      RegisterModel.countDocuments(filter),
    ]);

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: `${user.fullName || ''} ${user.lastName || ''}`.trim(),
      gender: user.gender, // Ensure this `user.gender` value is 'Male', 'Female', or 'Others' as per your data
      location: user.currentCity || user.city || '',
      joined: user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '',
      verified: user.isMobileVerified,
      lastActive: user.updatedAt
        ? new Date(user.updatedAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '',
      status: capitalize(user.adminApprovel),
    }));

    res.status(200).json({
      users: formattedUsers,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const capitalize = (str) => {
  if (!str) return '';
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
};




 

 

export const getAllReportsAnalize = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
      gender = '',
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    // Filter by status
    if (status !== 'all') {
      query.status = new RegExp(`^${status}$`, 'i');
    }

    // Filter by gender of reported user
    if (gender) {
      const users = await RegisterModel.find(
        { gender: new RegExp(gender, 'i') },
        '_id'
      );
      const reportedUserIds = users.map((u) => u._id);
      query.reportedUser = { $in: reportedUserIds };
    }

    // Fetch and populate reports
    const reports = await ReportModel.find(query)
      .populate({
        path: 'reporter',
        select: 'fullName profileImage email _id gender id',
        model: RegisterModel,
      })
      .populate({
        path: 'reportedUser',
        select: 'fullName profileImage email _id gender id',
        model: RegisterModel,
      })
      .sort({ createdAt: -1 });

    // Apply search filter after population
    const filtered = reports.filter((r) => {
      const reportedUserName = r.reportedUser?.fullName?.toLowerCase() || '';
      const reporterName = r.reporter?.fullName?.toLowerCase() || '';
      return (
        reportedUserName.includes(search.toLowerCase()) ||
        reporterName.includes(search.toLowerCase())
      );
    });

    // Paginate filtered results
    const paginated = filtered.slice(skip, skip + Number(limit));
console.log(paginated[0])
    const formattedReports = paginated.map((r) => ({
      
      _id: r._id,
      title: r.title,
      status: r.status,
      reportDate: r.createdAt,
      description: r.description || '',
      reporter: {
        id: r.reporter?.id,
        name: r.reporter?.fullName || 'N/A',
        avatar: r.reporter?.profileImage || '/avatar-default.png',
        email: r.reporter?.email || 'N/A',
        gender: r.reporter?.gender || 'N/A',
      },
      reportedUser: {
        id: r.reportedUser?.id,
        name: r.reportedUser?.fullName || 'N/A',
        avatar: r.reportedUser?.profileImage || '/avatar-default.png',
        email: r.reportedUser?.email || 'N/A',
        gender: r.reportedUser?.gender || 'N/A',
      },
      image: r.image,
      createdAt: r.createdAt,
    }));

    res.status(200).json({
      reports: formattedReports,
      totalPages: Math.ceil(filtered.length / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};



 

export const blockReportedUser = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const report = await ReportModel.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    await RegisterModel.findByIdAndUpdate(report.reportedUser, {
      adminApprovel: 'reject',
    });

    report.status = status || 'Blocked';
    await report.save();

    res.status(200).json({ success: true, message: 'User blocked and report updated' });
  } catch (err) {
    console.error('Error in blockReportedUser:', err);
    res.status(500).json({ success: false, message: 'Error blocking user', error: err.message });
  }
};





// GET all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await RegisterModel.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};


export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { adminApprovel } = req.body;

  if (!['approved', 'pending', 'reject'].includes(adminApprovel)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      id,
      { adminApprovel },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Status updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user status:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};



export const getSingleUserById = async (req, res) => {
  try {
    const { id } = req.params;

   
    if (!id) return res.status(400).json({ message: 'User ID is required' });

    const user = await RegisterModel.findById(id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};




export const getUserSignupTrends = async (req, res) => {
  try {
    const today = moment().startOf('day');

    const userTrendData = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = moment(today).subtract(i, 'days').startOf('day');
      const dayEnd = moment(today).subtract(i, 'days').endOf('day');

      const count = await RegisterModel.countDocuments({
        createdAt: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() },
        adminApprovel: 'approved', 
      });

      userTrendData.push({
        date: dayStart.format('ddd'), 
        newUsers: count,
      });
    }

    res.status(200).json({ success: true, data: userTrendData });
  } catch (err) {
    console.error('Signup Trend Error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getProfileOverview = async (req, res) => {
  try {
    const users = await RegisterModel.find();

    let completed = 0, incomplete = 0, moderate = 0, low = 0;

    for (const user of users) {
      let filledFields = 0;
      let totalFields = 30; // adjust this to actual key count you're considering

      const keysToCheck = [
        'profileImage', 'dateOfBirth', 'gender', 'religion', 'caste', 'community',
        'height', 'diet', 'education', 'employedIn', 'annualIncome', 'occupation',
        'fatherOccupation', 'motherOccupation', 'ownHouse', 'ownCar',
        'smoking', 'drinking', 'hobbies', 'interests', 'aboutYourself'
      ];

      for (const key of keysToCheck) {
        if (user[key] && user[key] !== '') filledFields++;
      }

      const percentage = (filledFields / keysToCheck.length) * 100;

      if (percentage >= 80) completed++;
      else if (percentage >= 50) moderate++;
      else if (percentage >= 20) low++;
      else incomplete++;
    }

    return res.status(200).json({
      success: true,
      data: [
        { name: 'Completed', value: completed },
        { name: 'Moderate', value: moderate },
        { name: 'Low', value: low },
        { name: 'Incomplete', value: incomplete }
      ]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === 2. Matches Per Month Chart ===
export const getMatchesPerMonth = async (req, res) => {
  try {
    const currentYear = moment().year();

    const months = moment.monthsShort(); // ['Jan', 'Feb', ..., 'Dec']

    const result = await Promise.all(
      months.map(async (month, index) => {
        const start = moment().year(currentYear).month(index).startOf('month').toDate();
        const end = moment().year(currentYear).month(index).endOf('month').toDate();

        const totalUsers = await RegisterModel.countDocuments({
          createdAt: { $gte: start, $lte: end }
        });

        const matches = await MatchModel.countDocuments({
          createdAt: { $gte: start, $lte: end }
        });

        return {
          month,
          totalUsers,
          matches
        };
      })
    );

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

 

 

const normalizeTitle = (title = '') => {
  const t = title.toLowerCase();

  if (t.includes('fake')) return 'fake';
  if (t.includes('inappropriate')) return 'inappropriate';
  if (t.includes('harassment')) return 'harassment';
  if (t.includes('spam')) return 'spam';
  return null;
};

export const getWeeklyReports = async (req, res) => {
  try {
    const today = moment().startOf('day');
    const weekAgo = moment().subtract(6, 'days').startOf('day');

    const reports = await ReportModel.find({
      createdAt: { $gte: weekAgo.toDate(), $lte: today.clone().endOf('day').toDate() },
    }).select('title createdAt');

    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = Array(7).fill().map((_, i) => ({
      day: dayMap[i],
      fake: 0,
      inappropriate: 0,
      harassment: 0,
      spam: 0,
    }));

    reports.forEach((r) => {
      const normalized = normalizeTitle(r.title);
      if (!normalized) return;

      const dayIndex = new Date(r.createdAt).getDay();
      chartData[dayIndex][normalized]++;
    });

    res.status(200).json({ success: true, data: chartData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};







export const getSearchToMatchStats = async (req, res) => {
  try {
    // Total users
    const totalUsers = await RegisterModel.countDocuments();

    // Complete profile: users with key fields filled
    const completeProfiles = await RegisterModel.countDocuments({
      fullName: { $ne: '' },
      profileImage: { $ne: '' },
      dateOfBirth: { $ne: null },
      gender: { $in: ['Male', 'Female'] },
      religion: { $ne: '' },
      caste: { $ne: '' },
      currentCity: { $ne: '' },
    });

    // Matches (testimonials)
    const matchedProfiles = await MatchModel.countDocuments();

    // Reported profiles
    const reportedProfiles = await ReportModel.countDocuments();

    // Final funnel data (use plain values — no percentages or K)
    const funnelData = [
      { stage: 'Total Profiles', value: totalUsers },
      { stage: 'Complete Profiles', value: completeProfiles },
      { stage: 'Matched Profiles', value: matchedProfiles },
      { stage: 'Reported Profiles', value: reportedProfiles },
    ];

    res.json({ success: true, data: funnelData });

  } catch (error) {
    console.error('Funnel Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};




export const verifyAadhaar = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await RegisterModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.adhaarCard?.frontImage || !user.adhaarCard?.backImage) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar images are required to verify.',
      });
    }

    // Update Aadhaar verification
    user.adhaarCard.isVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Aadhaar verified successfully',
    });
  } catch (error) {
    console.error('Aadhaar verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Aadhaar verification',
    });
  }
};
