
import RegisterModel from '../modal/register.js';
import mongoose from 'mongoose'; 
import ReportModel from '../modal/ReportModel.js';
import MatchModel from '../modal/MatchModel.js';
import moment from "moment-timezone";
import { Parser } from "json2csv";

const now = moment().tz("Asia/Kolkata");
 

 
 

const percent = (current, previous) => {
  if (previous > 0) return Number((((current - previous) / previous) * 100).toFixed(1));
  if (current > 0) return 100;
  return 0;
};

export const getStatsSummary = async (req, res) => {
  try {
    // Use IST timezone everywhere
    const now = moment().tz("Asia/Kolkata");

    // TODAY / YESTERDAY
    const todayStart   = now.clone().startOf("day");
    const tomorrowStart = todayStart.clone().add(1, "day");

    const yesterdayStart = todayStart.clone().subtract(1, "day");
    const yesterdayEnd   = todayStart.clone(); // start of today

    // THIS WEEK (Mon–Sun)
    const thisWeekStart = now.clone().startOf("isoWeek");
    const nextWeekStart = thisWeekStart.clone().add(1, "week");

    const lastWeekStart = thisWeekStart.clone().subtract(1, "week");
    const lastWeekEnd   = thisWeekStart.clone(); // start of this week

    // ACTIVE USERS (Last 24 hours)
    const last24HoursStart = now.clone().subtract(24, "hours");
    const lastWeekSameTimeStart = now.clone().subtract(8, "days");
    const lastWeekSameTimeEnd   = now.clone().subtract(7, "days");

    // QUERIES
    const [
      totalUsers,
      newSignupsToday,
      newSignupsYesterday,
      verifiedThisWeek,
      verifiedLastWeek,
      pendingVerifications,
      pendingThisWeek,
      pendingLastWeek,
      activeUsers,
      activeUsersLastWeek,
      pendingReports,
      blockedReports
    ] = await Promise.all([

      RegisterModel.countDocuments(),

      RegisterModel.countDocuments({ createdAt: { $gte: todayStart.toDate(), $lt: tomorrowStart.toDate() } }),

      RegisterModel.countDocuments({ createdAt: { $gte: yesterdayStart.toDate(), $lt: yesterdayEnd.toDate() } }),

      RegisterModel.countDocuments({
        verification: { $exists: true, $ne: "" },
        createdAt: { $gte: thisWeekStart.toDate(), $lt: nextWeekStart.toDate() }
      }),

      RegisterModel.countDocuments({
        verification: { $exists: true, $ne: "" },
        createdAt: { $gte: lastWeekStart.toDate(), $lt: lastWeekEnd.toDate() }
      }),

      RegisterModel.countDocuments({ adminApprovel: "pending" }),

      RegisterModel.countDocuments({
        adminApprovel: "pending",
        createdAt: { $gte: thisWeekStart.toDate(), $lt: nextWeekStart.toDate() }
      }),

      RegisterModel.countDocuments({
        adminApprovel: "pending",
        createdAt: { $gte: lastWeekStart.toDate(), $lt: lastWeekEnd.toDate() }
      }),

      RegisterModel.countDocuments({
        lastLoginAt: { $gte: last24HoursStart.toDate() }
      }),

      RegisterModel.countDocuments({
        lastLoginAt: { $gte: lastWeekSameTimeStart.toDate(), $lt: lastWeekSameTimeEnd.toDate() }
      }),

      ReportModel.countDocuments({ status: "Pending" }),

      ReportModel.countDocuments({ status: "Blocked" }),

    ]);

    // RESPONSE
    res.status(200).json({
      totalUsers,
      newSignups: newSignupsToday,
      signupChangePercent: percent(newSignupsToday, newSignupsYesterday),

      verifiedProfiles: verifiedThisWeek,
      verifiedChangePercent: percent(verifiedThisWeek, verifiedLastWeek),

      pendingVerifications,
      pendingChangePercent: percent(pendingThisWeek, pendingLastWeek),

      activeUsers,
      activeUsersChangePercent: percent(activeUsers, activeUsersLastWeek),

      reportedPercent: totalUsers ? Number(((pendingReports / totalUsers) * 100).toFixed(1)) : 0,
      blockedPercent: totalUsers ? Number(((blockedReports / totalUsers) * 100).toFixed(1)) : 0,
    });

  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};







export const getSignupGender = async (req, res) => {
  try {
    const now = moment().tz("Asia/Kolkata");

    const currentMonthStart = now.clone().startOf("month").toDate();
    const nextMonthStart = now.clone().startOf("month").add(1, "month").toDate();

    const previousMonthStart = now.clone().subtract(1, "month").startOf("month").toDate();
    const previousMonthEnd = now.clone().startOf("month").toDate();

    const sevenDaysAgo = now.clone().subtract(7, "days").toDate();
    const today = now.toDate();

    // ----------------------------------
    // 1️⃣ GENDER COUNTS
    // ----------------------------------
    const genderAgg = await RegisterModel.aggregate([
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 }
        }
      }
    ]);

    const genderCounts = { Male: 0, Female: 0, Others: 0 };
    genderAgg.forEach(g => {
      if (g._id === "Male") genderCounts.Male = g.count;
      else if (g._id === "Female") genderCounts.Female = g.count;
      else genderCounts.Others += g.count;
    });

    // ----------------------------------
    // 2️⃣ MATCH STATS
    // ----------------------------------
    const users = await RegisterModel.find(
      {},
      { createdAt: 1, adminApprovel: 1, isMobileVerified: 1 }
    );

    const matchStats = {
      stillLooking: 0,
      matched: 0,
      newlyRegistered: 0,
      inactive: 0,
    };

    users.forEach(user => {
      const createdAt = new Date(user.createdAt);

      if (user.adminApprovel === "approved") {
        matchStats.matched++;
      } else if (!user.isMobileVerified) {
        matchStats.inactive++;
      } else if (createdAt >= sevenDaysAgo) {
        matchStats.newlyRegistered++;
      } else {
        matchStats.stillLooking++;
      }
    });

    // ----------------------------------
    // 3️⃣ MONTH COMPARISON GRAPH (Current vs Previous Month)
    // ----------------------------------

    const monthAgg = await RegisterModel.aggregate([
      {
        $match: {
          createdAt: { $gte: previousMonthStart, $lt: nextMonthStart }
        }
      },
      {
        $project: {
          day: { $dayOfMonth: "$createdAt" },
          month: { $month: "$createdAt" }
        }
      },
      {
        $group: {
          _id: { day: "$day", month: "$month" },
          count: { $sum: 1 }
        }
      }
    ]);

    const daysInCurrent = now.daysInMonth();
    const daysInPrev = now.clone().subtract(1, "month").daysInMonth();

    const signInData = [];

    for (let day = 1; day <= daysInCurrent; day++) {
      signInData.push({
        day: String(day).padStart(2, "0"),
        currentMonth: 0,
        previousMonth: 0,
      });
    }

    monthAgg.forEach(entry => {
      const dayKey = String(entry._id.day).padStart(2, "0");

      const month = entry._id.month;
      if (month === now.month() + 1) {
        // current month
        const d = signInData.find(v => v.day === dayKey);
        if (d) d.currentMonth += entry.count;
      } else if (month === now.clone().subtract(1, "month").month() + 1) {
        // previous month only if that day exists in current month (UI safe)
        const d = signInData.find(v => v.day === dayKey);
        if (d) d.previousMonth += entry.count;
      }
    });

    // ----------------------------------
    // FINAL RESPONSE
    // ----------------------------------

    res.json({
      genderData: [
        { name: "Male", value: genderCounts.Male },
        { name: "Female", value: genderCounts.Female },
        // { name: "Others", value: genderCounts.Others }
      ],
      matchData: [
        { name: "Still Looking", value: matchStats.stillLooking },
        { name: "Successfully Matched", value: matchStats.matched },
        { name: "Newly Registered", value: matchStats.newlyRegistered },
        { name: "Inactive", value: matchStats.inactive },
      ],
      signInData, // current vs previous month graph
      totalCurrentMonthSignIns: signInData.reduce((s, v) => s + v.currentMonth, 0)
    });

  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
};


 
export const getUsers = async (req, res) => {
  try {
    const {
      search = "",
      status,
      gender,
      city,
      state,
      verified,
      active,
      sortBy = "createdAt",
      sortOrder = "desc",
      csv = false
    } = req.query;

    const query = {};

    // ------------------------------------
    // 🔍 SEARCH
    // ------------------------------------
    if (search) {
      if (mongoose.Types.ObjectId.isValid(search)) {
        query._id = new mongoose.Types.ObjectId(search);
      } else {
        query.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { middleName: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
          { mobile: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ];
      }
    }

    // ------------------------------------
    // 🟡 FILTERS
    // ------------------------------------
    if (status) query.adminApprovel = status;          // approved, pending, blocked
    if (gender) query.gender = gender;                 // Male/Female/Other
    if (city) query.currentCity = city;                
    if (state) query.state = state;

    if (verified !== undefined) {
      query.verification = verified === "true" ? "Verified" : { $ne: "Verified" };
    }

    // Active users last X days
    if (active) {
      const since = moment().tz("Asia/Kolkata").subtract(Number(active), "days").toDate();
      query.lastLoginAt = { $gte: since };
    }

    // ------------------------------------
    // 🔼 SORTING
    // ------------------------------------
    const sortFieldMap = {
      id: "_id",
      name: "fullName",
      location: "currentCity",
      gender: "gender",
      joined: "createdAt",
      status: "adminApprovel",
      lastActive: "lastLoginAt"
    };

    const sortField = sortFieldMap[sortBy] || "createdAt";
    const sort = { [sortField]: sortOrder === "asc" ? 1 : -1 };

    // ------------------------------------
    // 📥 FETCH USERS
    // ------------------------------------
    const users = await RegisterModel.find(query)
      .sort(sort)
      .collation({ locale: "en", strength: 2 });

    // ------------------------------------
    // 🎨 FORMAT DATA FOR UI
    // ------------------------------------
    const formatted = users.map((user, index) => {
      const userId = String(index + 1).padStart(6, "0");

      const fullName =
        `${user.firstName || ""} ${user.middleName || ""} ${user.lastName || ""}`.trim() ||
        user.fullName ||
        "N/A";

      const location = user.currentCity || user.city || user.state || "N/A";

      const verifiedStatus = user.verification === "Verified";

      return {
        id: `#${userId}`,
        mongoId: user._id,

        name: fullName,
        location,
        gender: user.gender || "N/A",

        joined: moment(user.createdAt).format("DD MMM, YYYY"),

        verified: verifiedStatus ? "Yes" : "No",
        verifiedIcon: verifiedStatus ? "green" : "red",

        status:
          user.adminApprovel?.charAt(0).toUpperCase() +
            user.adminApprovel?.slice(1).toLowerCase() || "Pending",

        lastActive: user.lastLoginAt
          ? moment(user.lastLoginAt).format("DD MMM, YYYY")
          : "N/A",
      };
    });

    // ------------------------------------
    // 📤 CSV EXPORT
    // ------------------------------------
    if (csv === "true") {
      const fields = [
        "id",
        "name",
        "location",
        "gender",
        "joined",
        "verified",
        "status",
        "lastActive"
      ];

      const parser = new Parser({ fields });
      const csvData = parser.parse(formatted);

      res.header("Content-Type", "text/csv");
      res.attachment("users.csv");
      return res.send(csvData);
    }

    // ------------------------------------
    // 📤 JSON RESPONSE
    // ------------------------------------
    res.status(200).json({
      totalUsers: formatted.length,
      data: formatted
    });

  } catch (error) {
    console.error("getUsers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};










export const getUserManage = async (req, res) => {
  try {
    const now = moment().tz("Asia/Kolkata");

    const todayStart = now.clone().startOf("day").toDate();
    const todayEnd = now.clone().endOf("day").toDate();

    const yesterdayStart = now.clone().subtract(1, "day").startOf("day").toDate();
    const yesterdayEnd = now.clone().subtract(1, "day").endOf("day").toDate();

    const thisWeekStart = now.clone().startOf("isoWeek").toDate();
    const lastWeekStart = now.clone().subtract(1, "week").startOf("isoWeek").toDate();
    const lastWeekEnd = now.clone().subtract(1, "week").endOf("isoWeek").toDate();

    // --------------------------------------------
    // 1️⃣ TOTAL USERS (vs last week)
    // --------------------------------------------
    const [totalUsers, totalUsersLastWeek] = await Promise.all([
      RegisterModel.countDocuments(),
      RegisterModel.countDocuments({
        createdAt: { $lte: lastWeekEnd },
      }),
    ]);

    // --------------------------------------------
    // 2️⃣ NEW SIGNUPS (Today vs Yesterday)
    // --------------------------------------------
    const [newSignupsToday, newSignupsYesterday] = await Promise.all([
      RegisterModel.countDocuments({
        createdAt: { $gte: todayStart, $lte: todayEnd },
      }),
      RegisterModel.countDocuments({
        createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
      }),
    ]);

    // --------------------------------------------
    // 3️⃣ PROFILE COMPLETED VS LAST WEEK
    // --------------------------------------------
    const profileCompletedQuery = {
      profileImage: { $ne: null },
      gender: { $ne: null },
      currentCity: { $ne: null },
    };

    const profileCompleted = await RegisterModel.countDocuments(profileCompletedQuery);

    const profileCompletedLastWeek = await RegisterModel.countDocuments({
      ...profileCompletedQuery,
      createdAt: { $lte: lastWeekEnd },
    });

    const profileIncomplete = totalUsers - profileCompleted;
    const profileIncompleteLastWeek = totalUsersLastWeek - profileCompletedLastWeek;

    // --------------------------------------------
    // 4️⃣ APPROVED & PENDING (vs last week)
    // --------------------------------------------
    const approvedProfilesCount = await RegisterModel.countDocuments({
      adminApprovel: "approved",
    });

    const approvedProfilesLastWeek = await RegisterModel.countDocuments({
      adminApprovel: "approved",
      createdAt: { $lte: lastWeekEnd },
    });

    const pendingProfilesCount = await RegisterModel.countDocuments({
      adminApprovel: "pending",
    });

    const pendingProfilesLastWeek = await RegisterModel.countDocuments({
      adminApprovel: "pending",
      createdAt: { $lte: lastWeekEnd },
    });

    // --------------------------------------------
    // 5️⃣ FETCH PROFILE IMAGES
    // --------------------------------------------
    const [approvedProfileImages, pendingProfileImages] = await Promise.all([
      RegisterModel.find({
        adminApprovel: "approved",
        profileImage: { $ne: null },
      })
        .select("profileImage")
        .limit(4),

      RegisterModel.find({
        adminApprovel: "pending",
        profileImage: { $ne: null },
      })
        .select("profileImage")
        .limit(4),
    ]);

    const approvedImageUrls = approvedProfileImages.map((u) => u.profileImage);
    const pendingImageUrls = pendingProfileImages.map((u) => u.profileImage);

    // --------------------------------------------
    // HELPERS
    // --------------------------------------------
    const percentageChange = (current, previous) => {
      if (previous === 0) return 100;
      return +(((current - previous) / previous) * 100).toFixed(1);
    };

    const direction = (change) => (change >= 0 ? "up" : "down");

    // --------------------------------------------
    // FINAL RESPONSE
    // --------------------------------------------
    res.status(200).json({
      totalUsers: {
        count: totalUsers,
        change: percentageChange(totalUsers, totalUsersLastWeek),
        trend: direction(percentageChange(totalUsers, totalUsersLastWeek)),
      },

      newSignups: {
        count: newSignupsToday,
        change: percentageChange(newSignupsToday, newSignupsYesterday),
        trend: direction(percentageChange(newSignupsToday, newSignupsYesterday)),
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
        change: percentageChange(approvedProfilesCount, approvedProfilesLastWeek),
        trend: direction(percentageChange(approvedProfilesCount, approvedProfilesLastWeek)),
        profileImage: approvedImageUrls,
      },

      pendingProfiles: {
        count: pendingProfilesCount,
        change: percentageChange(pendingProfilesCount, pendingProfilesLastWeek),
        trend: direction(percentageChange(pendingProfilesCount, pendingProfilesLastWeek)),
        profileImage: pendingImageUrls,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch user stats",
      error: err.message,
    });
  }
};




export const getAllManageUserData = async (req, res) => {
  try {
    const {
      search = "",
      statusFilter = "",
      genderFilter = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // ------------------------------------
    // 🔍 SAFE SEARCH (NO CAST ERROR)
    // ------------------------------------
    if (search.trim()) {
      const s = search.trim();

      // Only treat as ObjectId if EXACT 24-char hex
      if (/^[0-9a-fA-F]{24}$/.test(s)) {
        query._id = new mongoose.Types.ObjectId(s);
      } else {
        query.$or = [
          { fullName: { $regex: s, $options: "i" } },
          { firstName: { $regex: s, $options: "i" } },
          { middleName: { $regex: s, $options: "i" } },
          { lastName: { $regex: s, $options: "i" } },
          { mobile: { $regex: s, $options: "i" } },
          { email: { $regex: s, $options: "i" } },
        ];
      }
    }

    // ------------------------------------
    // 🟡 FILTERS (CASE-INSENSITIVE)
    // ------------------------------------
    if (statusFilter.trim()) {
      query.adminApprovel = {
        $regex: `^${statusFilter.trim()}$`,
        $options: "i",
      };
    }

    if (genderFilter.trim()) {
      query.gender = {
        $regex: `^${genderFilter.trim()}$`,
        $options: "i",
      };
    }

    // ------------------------------------
    // 🔼 SORTING MAP
    // ------------------------------------
    const sortFields = {
      name: "fullName",
      email: "email",
      mobile: "mobile",
      gender: "gender",
      joined: "createdAt",
      status: "adminApprovel",
      lastActive: "lastLoginAt",
    };

    const sortKey = sortFields[sortBy] || "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const sort = { [sortKey]: sortDirection };

    // ------------------------------------
    // 📥 FETCH USERS (NO PAGINATION)
    // ------------------------------------
    const users = await RegisterModel.find(query)
      .sort(sort)
      .collation({ locale: "en", strength: 2 });

    // ------------------------------------
    // 🎨 FORMAT CLEAN RESPONSE
    // ------------------------------------
    const formatted = users.map((u, index) => {
      const userId = String(index + 1).padStart(6, "0");

      const name =
        u.fullName ||
        `${u.firstName || ""} ${u.middleName || ""} ${u.lastName || ""}`.trim() ||
        "N/A";

      const status = u.adminApprovel
        ? u.adminApprovel.charAt(0).toUpperCase() +
          u.adminApprovel.slice(1).toLowerCase()
        : "Pending";

      const gender = u.gender
        ? u.gender.charAt(0).toUpperCase() + u.gender.slice(1).toLowerCase()
        : "N/A";

      return {
        id: `#${userId}`,
        mongoId: u._id,
        fullName: name,
        email: u.email || "N/A",
        mobile: u.mobile || "N/A",
        gender,
        status,
        location: u.currentCity || u.city || "N/A",
        joined: moment(u.createdAt).format("DD MMM, YYYY"),
        lastActive: u.lastLoginAt
          ? moment(u.lastLoginAt).format("DD MMM, YYYY")
          : "N/A",
      };
    });

    // ------------------------------------
    // RESPONSE
    // ------------------------------------
    res.status(200).json({
      success: true,
      total: formatted.length,
      data: formatted,
    });

  } catch (error) {
    console.error("User Manage Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Error while fetching users",
      error: error.message,
    });
  }
};






export const updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    let updateFields = req.body;

    // ------------------------------------
    // 🛡 SAFE UPDATE: Only allow valid fields
    // ------------------------------------
    const allowedFields = [
      "fullName",
      "firstName",
      "middleName",
      "lastName",
      "email",
      "mobile",
      "gender",
      "adminApprovel",
      "currentCity",
      "city",
      "profileFor",
      "verification",
      "isMobileVerified",
      "lastLoginAt"
    ];

    // Filter only allowed keys
    const filteredUpdate = {};
    for (let key in updateFields) {
      if (allowedFields.includes(key)) {
        filteredUpdate[key] = updateFields[key];
      }
    }

    // ------------------------------------
    // 🟡 NORMALIZE STATUS
    // ------------------------------------
    if (filteredUpdate.adminApprovel) {
      const val = filteredUpdate.adminApprovel.toLowerCase();

      const validStatus = ["approved", "pending", "reject", "blocked"];

      if (!validStatus.includes(val)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value. Use approved/pending/reject/blocked.",
        });
      }

      filteredUpdate.adminApprovel = val;
    }

    // ------------------------------------
    // 🟣 NORMALIZE GENDER
    // ------------------------------------
    if (filteredUpdate.gender) {
      filteredUpdate.gender =
        filteredUpdate.gender.charAt(0).toUpperCase() +
        filteredUpdate.gender.slice(1).toLowerCase();
    }

    // ------------------------------------
    // 🔄 UPDATE USER
    // ------------------------------------
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      filteredUpdate,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ------------------------------------
    // 🎨 CLEAN CLEAN RESPONSE
    // ------------------------------------
    const formatted = {
      id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
      gender: updatedUser.gender,
      status:
        updatedUser.adminApprovel.charAt(0).toUpperCase() +
        updatedUser.adminApprovel.slice(1),
      location: updatedUser.currentCity || updatedUser.city,
      lastActive: updatedUser.lastLoginAt,
    };

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: formatted,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};







export const getFilteredManageUsers = async (req, res) => {
  try {
    let {
      search = "",
      status = "",
      gender = "",
      sortField = "",
      sortOrder = "asc",
      page = 1,
      limit = 5,
    } = req.query;

    const filter = {};

    // -----------------------------------------
    // 🔍 SEARCH (name, mobile, email, id fragment)
    // -----------------------------------------
    if (search.trim()) {
      const s = search.trim();

      // partial ObjectId search (last 5–6 chars)
      const isIdFragment = /^[a-fA-F0-9]{4,6}$/.test(s);

      if (isIdFragment) {
        filter._id = { $regex: s, $options: "i" };
      } else {
        filter.$or = [
          { fullName: { $regex: s, $options: "i" } },
          { lastName: { $regex: s, $options: "i" } },
          { email: { $regex: s, $options: "i" } },
          { mobile: { $regex: s, $options: "i" } }
        ];
      }
    }

    // -----------------------------------------
    // 🟡 FILTERS
    // -----------------------------------------
    if (status) filter.adminApprovel = new RegExp(status, "i");
    if (gender) filter.gender = new RegExp(gender, "i");

    // -----------------------------------------
    // 🔽 SORTING
    // -----------------------------------------
    const sort = {};
    const validSort = ["name", "joined", "status", "gender", "lastActive"];

    if (validSort.includes(sortField)) {
      if (sortField === "name") sort.fullName = sortOrder === "asc" ? 1 : -1;
      else if (sortField === "joined") sort.createdAt = sortOrder === "asc" ? 1 : -1;
      else if (sortField === "status") sort.adminApprovel = sortOrder === "asc" ? 1 : -1;
      else if (sortField === "gender") sort.gender = sortOrder === "asc" ? 1 : -1;
      else if (sortField === "lastActive") sort.updatedAt = sortOrder === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1; // default
    }

    // -----------------------------------------
    // 📌 PAGINATION
    // -----------------------------------------
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      RegisterModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      RegisterModel.countDocuments(filter)
    ]);

    // -----------------------------------------
    // 🎨 FORMAT OUTPUT
    // -----------------------------------------
    const formattedUsers = users.map((user) => ({
      id: user.id || "N/A",
      name:
        user.fullName ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        "N/A",
      gender: user.gender || "",
      location: user.currentCity || user.city || "",
      joined: user.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "",
      verified: user.isMobileVerified || false,
      lastActive: user.updatedAt
        ? new Date(user.updatedAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "",
      status: capitalizeStatus(user.adminApprovel),
    }));

    res.status(200).json({
      users: formattedUsers,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// -------------------------------------------
// 🔧 Helper: Capitalize Status
// -------------------------------------------
const capitalizeStatus = (status) => {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};


const capitalize = (str) => {
  if (!str) return '';
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
};




 

 

export const getAllReportsAnalize = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status = "all",
      gender = "",
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const matchStage = {};

    // Status Filter
    if (status !== "all") {
      matchStage.status = { $regex: new RegExp(`^${status}$`, "i") };
    }

    // -----------------------------
    // 🔥 MAIN PIPELINE
    // -----------------------------
    const pipeline = [
      { $match: matchStage },

      // Reporter lookup
      {
        $lookup: {
          from: "registers",
          localField: "reporter",
          foreignField: "_id",
          as: "reporter",
        },
      },
      { $unwind: "$reporter" },

      // Reported User lookup
      {
        $lookup: {
          from: "registers",
          localField: "reportedUser",
          foreignField: "_id",
          as: "reportedUser",
        },
      },
      { $unwind: "$reportedUser" },
    ];

    // -----------------------------
    // 🔍 Gender Filter
    // -----------------------------
    if (gender) {
      pipeline.push({
        $match: {
          "reportedUser.gender": { $regex: new RegExp(gender, "i") },
        },
      });
    }

    // -----------------------------
    // 🔍 Search Filter  
    // supports: name, id, reason, title
    // -----------------------------
    if (search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");

      pipeline.push({
        $match: {
          $or: [
            { "reporter.firstName": searchRegex },
            { "reporter.lastName": searchRegex },
            { "reportedUser.firstName": searchRegex },
            { "reportedUser.lastName": searchRegex },
            { "reporter.id": searchRegex },
            { "reportedUser.id": searchRegex },
            { title: searchRegex },
            { reason: searchRegex },
          ],
        },
      });
    }

    // -----------------------------
    // Sorting → newest first
    // -----------------------------
    pipeline.push({ $sort: { createdAt: -1 } });

    // -----------------------------
    // Pagination
    // -----------------------------
    const countPipeline = [...pipeline, { $count: "total" }];

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // -----------------------------
    // Format Output
    // -----------------------------
    pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        reason: 1,
        status: 1,
        image: 1,
        createdAt: 1,

        reporter: {
          userId: "$reporter.id",
          fullName: {
            $concat: [
              "$reporter.firstName",
              " ",
              { $ifNull: ["$reporter.lastName", ""] }
            ]
          },
          profileImage: "$reporter.profileImage",
          gender: "$reporter.gender",
          email: "$reporter.email",
        },

        reportedUser: {
          userId: "$reportedUser.id",
          fullName: {
            $concat: [
              "$reportedUser.firstName",
              " ",
              { $ifNull: ["$reportedUser.lastName", ""] }
            ]
          },
          profileImage: "$reportedUser.profileImage",
          gender: "$reportedUser.gender",
          email: "$reportedUser.email",
          adminApprovel: "$reportedUser.adminApprovel",
        },
      },
    });

    // Execute
    const reports = await ReportModel.aggregate(pipeline);

    const countDocs = await ReportModel.aggregate(countPipeline);
    const total = countDocs[0]?.total || 0;

    res.status(200).json({
      success: true,
      reports,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};



export const getReportedContent = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status = "all",
      gender = "",
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const matchStage = {};

    // Status Filter
    if (status !== "all") {
      matchStage.status = { $regex: new RegExp(`^${status}$`, "i") };
    }

    // -----------------------------
    // 🔥 MAIN PIPELINE
    // -----------------------------
    const pipeline = [
      { $match: matchStage },

      // Reporter lookup
      {
        $lookup: {
          from: "registers",
          localField: "reporter",
          foreignField: "_id",
          as: "reporter",
        }
      },
      { $unwind: "$reporter" },

      // Reported User lookup
      {
        $lookup: {
          from: "registers",
          localField: "reportedUser",
          foreignField: "_id",
          as: "reportedUser",
        }
      },
      { $unwind: "$reportedUser" },
    ];

    // Gender filter (after lookup)
    if (gender) {
      pipeline.push({
        $match: {
          "reportedUser.gender": { $regex: new RegExp(gender, "i") }
        }
      });
    }

    // -----------------------------
    // 🔍 Search Filter
    // -----------------------------
    if (search.trim() !== "") {
      const s = new RegExp(search, "i");

      pipeline.push({
        $match: {
          $or: [
            { "reporter.firstName": s },
            { "reporter.lastName": s },
            { "reportedUser.firstName": s },
            { "reportedUser.lastName": s },
            { "reporter.id": s },
            { "reportedUser.id": s },
            { reason: s },
            { title: s }
          ]
        }
      });
    }

    // -----------------------------
    // Sorting
    // -----------------------------
    pipeline.push({ $sort: { createdAt: -1 } });

    // -----------------------------
    // Pagination
    // -----------------------------
    const paginatedPipeline = [
      ...pipeline,
      { $skip: skip },
      { $limit: limit },

      // Format output
      {
        $project: {
          _id: 1,
          reason: 1,
          status: 1,
          createdAt: 1,

          reportedUser: {
            id: "$reportedUser.id",
            gender: "$reportedUser.gender",
            avatar: "$reportedUser.profileImage",
            name: {
              $concat: [
                "$reportedUser.firstName",
                " ",
                { $ifNull: ["$reportedUser.lastName", ""] }
              ]
            }
          },

          reporterUser: {
            id: "$reporter.id",
            gender: "$reporter.gender",
            avatar: "$reporter.profileImage",
            name: {
              $concat: [
                "$reporter.firstName",
                " ",
                { $ifNull: ["$reporter.lastName", ""] }
              ]
            }
          }
        }
      }
    ];

    // -----------------------------
    // TOTAL COUNT PIPELINE
    // (must not include skip/limit)
    // -----------------------------
    const countPipeline = [
      ...pipeline,
      { $count: "total" }
    ];

    // Execute in parallel
    const [reports, totalArr] = await Promise.all([
      ReportModel.aggregate(paginatedPipeline),
      ReportModel.aggregate(countPipeline),
    ]);

    const total = totalArr[0]?.total || 0;

    res.status(200).json({
      success: true,
      reports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReports: total,
      }
    });

  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};



 

export const blockReportedUser = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    // Fetch report
    const report = await ReportModel.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Block the reported user
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      report.reportedUser,
      { adminApprovel: "reject" },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Reported user not found",
      });
    }

    // Update report status
    report.status = status || "Blocked";
    await report.save();

    return res.status(200).json({
      success: true,
      message: "User blocked successfully & report updated",
      report,
      blockedUser: updatedUser,
    });

  } catch (err) {
    console.error("Error in blockReportedUser:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while blocking user",
      error: err.message,
    });
  }
};





// GET all users
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      gender,
      status,
    } = req.query;

    const query = {};

    // 🔍 Search by userId, firstName, lastName, email
    if (search) {
      query.$or = [
        { userId: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // 🧍‍♂️ Filter by gender
    if (gender) {
      query.gender = gender;
    }

    // 🟢🟡🔴 Filter by verification status
    if (status) {
      query.verificationStatus = status; // status = 'approved' | 'pending' | 'rejected'
    }

    // Pagination values
    const skip = (page - 1) * limit;

    const users = await RegisterModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalUsers = await RegisterModel.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total: totalUsers,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { adminApprovel } = req.body;

  // Validation
  const allowedStatus = ['approved', 'pending', 'reject'];
  if (!allowedStatus.includes(adminApprovel)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status value. Allowed: approved, pending, reject'
    });
  }

  try {
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      id,
      { adminApprovel },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User verification status updated',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
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
