
import RegisterModel from '../modal/register.js';
import mongoose from 'mongoose'; 
import ReportModel from '../modal/ReportModel.js';
import MatchModel from '../modal/MatchModel.js';
import moment from "moment-timezone";
import { Parser } from "json2csv";
import AdminModel from "../modal/adminModal.js"; // make sure correct path
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cloudinary from "../utils/cloudinary.js";

const ADMIN_JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";



const now = moment().tz("Asia/Kolkata");
 

 
 





// ===========================
// SAFE VALUE: No ZERO allowed
// ===========================


// ===========================
// MAIN FUNCTION UPDATED
// ===========================
const safe = (n) => (n === 0 ? 1 : n);

// TRUE PERCENT FUNCTION
const percent = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

export const getStatsSummary = async (req, res) => {
  try {
    const now = moment().tz("Asia/Kolkata");

    // TODAY / YESTERDAY
    const todayStart = now.clone().startOf("day");
    const tomorrowStart = todayStart.clone().add(1, "day");

    const yesterdayStart = todayStart.clone().subtract(1, "day");
    const yesterdayEnd = todayStart.clone();

    // THIS WEEK (Mon-Sun)
    const thisWeekStart = now.clone().startOf("isoWeek");
    const nextWeekStart = thisWeekStart.clone().add(1, "week");

    // LAST WEEK (Mon-Sun)
    const lastWeekStart = thisWeekStart.clone().subtract(1, "week");
    const lastWeekEnd = thisWeekStart.clone();


    // ============ DATABASE QUERIES =============
    const [
      totalUsers,

      // Signup Today / Yesterday
      newSignupsToday,
      newSignupsYesterday,

      // Approved this week
      approvedThisWeek,
      approvedLastWeek,

      // Pending counts
      pendingTotal,
      pendingThisWeek,
      pendingLastWeek,

      // Active users
      activeUsers,
      activeUsersLastWeek,

      // Reports
      pendingReports,
      blockedReports
    ] = await Promise.all([

      RegisterModel.countDocuments(),

      RegisterModel.countDocuments({
        createdAt: { $gte: todayStart.toDate(), $lt: tomorrowStart.toDate() }
      }),

      RegisterModel.countDocuments({
        createdAt: { $gte: yesterdayStart.toDate(), $lt: yesterdayEnd.toDate() }
      }),

      // APPROVED THIS WEEK
      RegisterModel.countDocuments({
        adminApprovel: "approved",
        createdAt: { $gte: thisWeekStart.toDate(), $lt: nextWeekStart.toDate() }
      }),

      // APPROVED LAST WEEK
      RegisterModel.countDocuments({
        adminApprovel: "approved",
        createdAt: { $gte: lastWeekStart.toDate(), $lt: lastWeekEnd.toDate() }
      }),

      // ALL pending
      RegisterModel.countDocuments({ adminApprovel: "pending" }),

      // Pending THIS WEEK
      RegisterModel.countDocuments({
        adminApprovel: "pending",
        createdAt: { $gte: thisWeekStart.toDate(), $lt: nextWeekStart.toDate() }
      }),

      // Pending LAST WEEK
      RegisterModel.countDocuments({
        adminApprovel: "pending",
        createdAt: { $gte: lastWeekStart.toDate(), $lt: lastWeekEnd.toDate() }
      }),

      // ACTIVE
      RegisterModel.countDocuments({
        lastLoginAt: { $gte: now.clone().subtract(24, "hours").toDate() }
      }),

      RegisterModel.countDocuments({
        lastLoginAt: {
          $gte: now.clone().subtract(8, "days").toDate(),
          $lt: now.clone().subtract(7, "days").toDate()
        }
      }),

      // Reports
      ReportModel.countDocuments({ status: { $regex: /^pending$/i } }),
      ReportModel.countDocuments({ status: { $regex: /^blocked$/i } })
    ]);


    // ============ RESPONSE =============
    res.status(200).json({
      totalUsers: safe(totalUsers),

      newSignups: safe(newSignupsToday),
      signupChangePercent: percent(newSignupsToday, newSignupsYesterday),

      // FINAL VERIFIED = This Week Approved
      verifiedProfiles: safe(approvedThisWeek),
      verifiedChangePercent: percent(approvedThisWeek, approvedLastWeek),

      pendingVerifications: safe(pendingTotal),
      pendingChangePercent: percent(pendingThisWeek, pendingLastWeek),

      activeUsers: safe(activeUsers),
      activeUsersChangePercent: percent(activeUsers, activeUsersLastWeek),

      reportedPercent: Math.max(1, Number(((pendingReports / totalUsers) * 100).toFixed(1))),
      blockedPercent: Math.max(1, Number(((blockedReports / totalUsers) * 100).toFixed(1))),
    });

  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};





export const getWeeklyRequestStats = async (req, res) => {
  try {
    const now = moment().tz("Asia/Kolkata");

    // THIS WEEK (Mon → Sun)
    const thisWeekStart = now.clone().startOf("isoWeek").toDate();
    const thisWeekEnd = now.clone().endOf("isoWeek").toDate();

    // ====================================
    // RUN QUERIES (Mixed week + total)
    // ====================================

    const [
      totalRequestsThisWeek,   // WEEK WISE
      pendingVerification,     // TOTAL
      approvedThisWeek,        // WEEK WISE
      rejectedDueToMismatch    // TOTAL
    ] = await Promise.all([

      // 1️⃣ Total Requests This Week
      RegisterModel.countDocuments({
        createdAt: { $gte: thisWeekStart, $lte: thisWeekEnd }
      }),

      // 2️⃣ Pending Verification (All-time)
      RegisterModel.countDocuments({
        adminApprovel: "pending"
      }),

      // 3️⃣ Approved This Week
      RegisterModel.countDocuments({
        adminApprovel: "approved",
        createdAt: { $gte: thisWeekStart, $lte: thisWeekEnd }
      }),

      // 4️⃣ Rejected Due to mismatch (All-time)
      RegisterModel.countDocuments({
        adminApprovel: "reject"
      })
    ]);

    // ====================================
    // SEND RESPONSE
    // ====================================
    return res.status(200).json({
      success: true,
      data: {
        totalRequestsThisWeek,
        pendingVerification,
        approvedThisWeek,
        rejectedDueToMismatch
      }
    });

  } catch (err) {
    console.error("Weekly Request Stats Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message
    });
  }
};





export const getSignupGender = async (req, res) => {
  try {
    const now = moment().tz("Asia/Kolkata");

    /* ----------------------------------------
        0️⃣ MONTH NAME → NUMBER CONVERTER
    ---------------------------------------- */
    const monthMap = {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12
    };

    let monthQuery = req.query.month; // user input (december / dec / 12)
    let yearQuery = req.query.year || now.year();

    let selectedMonth;

    // If month is number → use directly
    if (!monthQuery) {
      selectedMonth = now.month() + 1;
    } else if (!isNaN(monthQuery)) {
      selectedMonth = Number(monthQuery);
    } else {
      // If month is string → convert to number
      const key = monthQuery.toLowerCase().slice(0, 3); // first 3 chars
      const found = Object.keys(monthMap).find(m => m.startsWith(key));
      selectedMonth = monthMap[found];
    }

    if (!selectedMonth) {
      return res.status(400).json({
        success: false,
        message: "Invalid month format. Example: ?month=december or ?month=12"
      });
    }

    // Selected Month Dates
    const selectedMonthStart = moment()
      .year(yearQuery)
      .month(selectedMonth - 1)
      .startOf("month")
      .toDate();

    const selectedMonthEnd = moment()
      .year(yearQuery)
      .month(selectedMonth - 1)
      .endOf("month")
      .toDate();

    // Previous Month
    const previousMonthStart = moment(selectedMonthStart)
      .subtract(1, "month")
      .startOf("month")
      .toDate();

    const previousMonthEnd = moment(selectedMonthStart)
      .toDate();

    /* -----------------------------------------
       1️⃣ GENDER COUNTS
    ----------------------------------------- */
    const genderAgg = await RegisterModel.aggregate([
      {
        $group: { _id: "$gender", count: { $sum: 1 } }
      }
    ]);

    const genderCounts = { Male: 0, Female: 0, Others: 0 };
    genderAgg.forEach(g => {
      if (g._id === "Male") genderCounts.Male = g.count;
      else if (g._id === "Female") genderCounts.Female = g.count;
      else genderCounts.Others += g.count;
    });

    /* -----------------------------------------
       2️⃣ MATCH STATS
    ----------------------------------------- */
    const sevenDaysAgo = moment().subtract(7, "days").toDate();

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
      if (user.adminApprovel === "approved") matchStats.matched++;
      else if (!user.isMobileVerified) matchStats.inactive++;
      else if (user.createdAt >= sevenDaysAgo) matchStats.newlyRegistered++;
      else matchStats.stillLooking++;
    });

    /* -----------------------------------------
       3️⃣ MONTH GRAPH (Selected Month)
    ----------------------------------------- */
    const monthAgg = await RegisterModel.aggregate([
      {
        $match: {
          createdAt: { $gte: previousMonthStart, $lte: selectedMonthEnd }
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

    const daysInMonth = moment(selectedMonthStart).daysInMonth();

    const signInData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      signInData.push({
        day: String(day).padStart(2, "0"),
        currentMonth: 0,
        previousMonth: 0,
      });
    }

    monthAgg.forEach(entry => {
      const dayKey = String(entry._id.day).padStart(2, "0");

      if (entry._id.month === selectedMonth) {
        const d = signInData.find(v => v.day === dayKey);
        d.currentMonth += entry.count;
      }

      if (
        entry._id.month === selectedMonth - 1 ||
        (selectedMonth === 1 && entry._id.month === 12)
      ) {
        const d = signInData.find(v => v.day === dayKey);
        d.previousMonth += entry.count;
      }
    });

    /* -----------------------------------------
       4️⃣ TOTALS & GROWTH
    ----------------------------------------- */
    const totalCurrentMonthSignIns = signInData.reduce((a, b) => a + b.currentMonth, 0);
    const totalPreviousMonthSignIns = signInData.reduce((a, b) => a + b.previousMonth, 0);

    let percentGrowth = 0;

    if (totalPreviousMonthSignIns > 0) {
      percentGrowth =
        ((totalCurrentMonthSignIns - totalPreviousMonthSignIns) /
          totalPreviousMonthSignIns) *
        100;
    }

    /* -----------------------------------------
       FINAL RESPONSE
    ----------------------------------------- */
    res.json({
      selectedMonthName: moment().month(selectedMonth - 1).format("MMMM"),
      selectedMonth,
      selectedYear: yearQuery,

      genderData: [
        { name: "Male", value: genderCounts.Male },
        { name: "Female", value: genderCounts.Female }
      ],

      matchData: [
        { name: "Still Looking", value: matchStats.stillLooking },
        { name: "Successfully Matched", value: matchStats.matched },
        { name: "Newly Registered", value: matchStats.newlyRegistered },
        { name: "Inactive", value: matchStats.inactive }
      ],

      signInData,
      totalCurrentMonthSignIns,
      totalPreviousMonthSignIns,
      percentGrowth: Math.round(percentGrowth)
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
      csv = false,
      page = 1,
      limit = 10,
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
    if (status) query.adminApprovel = status;
    if (gender) query.gender = gender;
    if (city) query.currentCity = city;
    if (state) query.state = state;

    if (verified !== undefined) {
      query.verification = verified === "true" ? "Verified" : { $ne: "Verified" };
    }

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
    // 📊 PAGINATION LOGIC
    // ------------------------------------
    const skip = (Number(page) - 1) * Number(limit);

    const totalUsers = await RegisterModel.countDocuments(query);

    const users = await RegisterModel.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .collation({ locale: "en", strength: 2 });

    // ------------------------------------
    // 🎨 FORMAT DATA FOR UI
    // ------------------------------------
    const formatted = users.map((user, idx) => {
      const userId = String(skip + idx + 1).padStart(6, "0");

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
lastActive: user.lastLogin
  ? moment(user.lastLogin).format("DD MMM, YYYY")
  : "N/A",
      };
    });

    // ------------------------------------
    // 📤 CSV EXPORT
    // ------------------------------------
    if (csv === "true") {
      const fields = ["id", "name", "location", "gender", "joined", "verified", "status", "lastActive"];
      const parser = new Parser({ fields });
      const csvData = parser.parse(formatted);

      res.header("Content-Type", "text/csv");
      res.attachment("users.csv");
      return res.send(csvData);
    }

    // ------------------------------------
    // 📤 JSON RESPONSE WITH PAGINATION
    // ------------------------------------
    res.status(200).json({
      currentPage: Number(page),
      totalPages: Math.ceil(totalUsers / Number(limit)),
      totalUsers,
      limit: Number(limit),
      data: formatted
    });

  } catch (error) {
    console.error("getUsers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};











// ===========================
// SAFE VALUE: Avoid ZERO in Dashboard
// ===========================


// ===========================
// SAFE PERCENTAGE CALCULATION
// ===========================
const percentageChange = (current, previous) => {
  if (previous === 0) return 100;
  return +(((current - previous) / previous) * 100).toFixed(1);
};

const direction = (change) => (change >= 0 ? "up" : "down");


// ===========================
// MAIN FUNCTION UPDATED
// ===========================
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


    // 1️⃣ TOTAL USERS (vs last week)
    const [totalUsersRaw, totalUsersLastWeekRaw] = await Promise.all([
      RegisterModel.countDocuments(),
      RegisterModel.countDocuments({ createdAt: { $lte: lastWeekEnd } })
    ]);

    const totalUsers = safe(totalUsersRaw);
    const totalUsersLastWeek = safe(totalUsersLastWeekRaw);


    // 2️⃣ NEW SIGNUPS TODAY vs YESTERDAY
    const [newTodayRaw, newYesterdayRaw] = await Promise.all([
      RegisterModel.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      RegisterModel.countDocuments({ createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } })
    ]);

    const newSignupsToday = safe(newTodayRaw);
    const newSignupsYesterday = safe(newYesterdayRaw);


    // 3️⃣ PROFILE COMPLETED & INCOMPLETE
    const profileCompletedQuery = {
      profileImage: { $ne: null },
      gender: { $ne: null },
      currentCity: { $ne: null }
    };

    const completedRaw = await RegisterModel.countDocuments(profileCompletedQuery);
    const completedLastWeekRaw = await RegisterModel.countDocuments({
      ...profileCompletedQuery,
      createdAt: { $lte: lastWeekEnd }
    });

    const profileCompleted = safe(completedRaw);
    const profileCompletedLastWeek = safe(completedLastWeekRaw);

    const profileIncomplete = safe(totalUsersRaw - completedRaw);
    const profileIncompleteLastWeek = safe(totalUsersLastWeekRaw - completedLastWeekRaw);


    // 4️⃣ APPROVED & PENDING PROFILES
    const approvedRaw = await RegisterModel.countDocuments({ adminApprovel: "approved" });
    const approvedLastWeekRaw = await RegisterModel.countDocuments({
      adminApprovel: "approved",
      createdAt: { $lte: lastWeekEnd }
    });

    const approvedProfilesCount = safe(approvedRaw);
    const approvedProfilesLastWeek = safe(approvedLastWeekRaw);

    const pendingRaw = await RegisterModel.countDocuments({ adminApprovel: "pending" });
    const pendingLastWeekRaw = await RegisterModel.countDocuments({
      adminApprovel: "pending",
      createdAt: { $lte: lastWeekEnd }
    });

    const pendingProfilesCount = safe(pendingRaw);
    const pendingProfilesLastWeek = safe(pendingLastWeekRaw);


    // 5️⃣ FETCH PROFILE IMAGES
    const [approvedProfileImages, pendingProfileImages] = await Promise.all([
      RegisterModel.find({ adminApprovel: "approved", profileImage: { $ne: null } })
        .select("profileImage")
        .limit(4),

      RegisterModel.find({ adminApprovel: "pending", profileImage: { $ne: null } })
        .select("profileImage")
        .limit(4)
    ]);

    const approvedImageUrls = approvedProfileImages.map(u => u.profileImage);
    const pendingImageUrls = pendingProfileImages.map(u => u.profileImage);


    // 📌 FINAL RESPONSE
    res.status(200).json({
      totalUsers: {
        count: totalUsers,
        change: percentageChange(totalUsers, totalUsersLastWeek),
        trend: direction(percentageChange(totalUsers, totalUsersLastWeek))
      },

      newSignups: {
        count: newSignupsToday,
        change: percentageChange(newSignupsToday, newSignupsYesterday),
        trend: direction(percentageChange(newSignupsToday, newSignupsYesterday))
      },

      profileCompleted: {
        count: profileCompleted,
        change: percentageChange(profileCompleted, profileCompletedLastWeek),
        trend: direction(percentageChange(profileCompleted, profileCompletedLastWeek))
      },

      profileIncomplete: {
        count: profileIncomplete,
        change: percentageChange(profileIncomplete, profileIncompleteLastWeek),
        trend: direction(percentageChange(profileIncomplete, profileIncompleteLastWeek))
      },

      approvedProfiles: {
        count: approvedProfilesCount,
        change: percentageChange(approvedProfilesCount, approvedProfilesLastWeek),
        trend: direction(percentageChange(approvedProfilesCount, approvedProfilesLastWeek)),
        profileImage: approvedImageUrls
      },

      pendingProfiles: {
        count: pendingProfilesCount,
        change: percentageChange(pendingProfilesCount, pendingProfilesLastWeek),
        trend: direction(percentageChange(pendingProfilesCount, pendingProfilesLastWeek)),
        profileImage: pendingImageUrls
      }
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch user stats",
      error: err.message
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
    // 🔍 SEARCH (supports vm12345, 12345, vm12, etc.)
    // -----------------------------------------
    if (search.trim()) {
      const s = search.trim();

      const isVmId = /^vm?[0-9]{3,6}$/i.test(s);

      if (isVmId) {
        const clean = s.replace("vm", "");
        filter.id = { $regex: clean, $options: "i" };
      } else {
        filter.$or = [
          { fullName: { $regex: s, $options: "i" } },
          { lastName: { $regex: s, $options: "i" } },
          { email: { $regex: s, $options: "i" } },
          { mobile: { $regex: s, $options: "i" } },
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
      sort.createdAt = -1;
    }

    // -----------------------------------------
    // 📌 PAGINATION LOGIC
    // -----------------------------------------
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    const total = await RegisterModel.countDocuments(filter);

    const users = await RegisterModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // -----------------------------------------
    // 🎨 FORMAT OUTPUT
    // -----------------------------------------
    const formattedUsers = users.map((user, index) => {
      const fallbackId = "vm" + String(skip + index + 1).padStart(5, "0");

      return {
        id: user.id || fallbackId,
        name:
          user.fullName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          "N/A",
        gender: user.gender || "",
        location: user.currentCity || user.city || "",
        profileImage: user.profileImage || null,

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
      };
    });

    res.status(200).json({
      users: formattedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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







export const getAllManageUserData = async (req, res) => {
  try {
    const {
      search = "",
      statusFilter = "",
      genderFilter = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 5,
    } = req.query;

    const query = {};

    // ------------------------------------
    // 🔍 SEARCH (supports vm ID search)
    // ------------------------------------
    if (search.trim()) {
      const s = search.trim();

      const isVm = /^vm?[0-9]{3,6}$/i.test(s);

      if (isVm) {
        const clean = s.replace("vm", "");
        query.id = { $regex: clean, $options: "i" };
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
    // 🟡 FILTERS
    // ------------------------------------
    if (statusFilter.trim())
      query.adminApprovel = new RegExp(statusFilter, "i");

    if (genderFilter.trim())
      query.gender = new RegExp(genderFilter, "i");

    // ------------------------------------
    // 🔼 SORTING
    // ------------------------------------
    const sortFieldMap = {
      name: "fullName",
      email: "email",
      mobile: "mobile",
      gender: "gender",
      joined: "createdAt",
      status: "adminApprovel",
      lastActive: "lastLoginAt",
    };

    const sortKey = sortFieldMap[sortBy] || "createdAt";
    const sort = { [sortKey]: sortOrder === "asc" ? 1 : -1 };

    // ------------------------------------
    // 📌 PAGINATION LOGIC
    // ------------------------------------
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalUsers = await RegisterModel.countDocuments(query);

    const users = await RegisterModel.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // ------------------------------------
    // 🎨 FORMAT RESPONSE
    // ------------------------------------
    const formatted = users.map((u, index) => {
      const fallbackId = "vm" + String(skip + index + 1).padStart(5, "0");
      const finalId = u.id || fallbackId;

      const name =
        u.fullName ||
        `${u.firstName || ""} ${u.middleName || ""} ${u.lastName || ""}`.trim() ||
        "N/A";

      return {
        id: finalId,
        mongoId: u._id,
        fullName: name,
        email: u.email || "N/A",
        mobile: u.mobile || "N/A",
        gender: u.gender || "N/A",
        status: u.adminApprovel || "Pending",
        location: u.currentCity || u.city || "N/A",
        profileImage: u.profileImage || null,
        joined: moment(u.createdAt).format("DD MMM, YYYY"),
        lastActive: u.lastLoginAt
          ? moment(u.lastLoginAt).format("DD MMM, YYYY")
          : "N/A",
      };
    });

    res.status(200).json({
      success: true,
      totalUsers,
      currentPage: pageNum,
      totalPages: Math.ceil(totalUsers / limitNum),
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



 

export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    let { status } = req.body; // "approved" or "rejected"

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required.",
      });
    }

    status = status.toLowerCase();

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use 'approved' or 'rejected'.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await ReportModel.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    let updatedUser = null;
    let finalReportStatus = null;

    // 🔥 APPROVED → BLOCK USER + BLOCK REPORT
    if (status === "approved") {

      // USER BLOCK
      updatedUser = await RegisterModel.findByIdAndUpdate(
        report.reportedUser,
        { adminApprovel: "blocked" },
        { new: true }
      );

      // REPORT STATUS ALSO BLOCKED
      finalReportStatus = "blocked";
    }

    // 🔥 REJECTED → APPROVE USER + REPORT ALSO APPROVED
    if (status === "rejected") {

      // USER APPROVED
      updatedUser = await RegisterModel.findByIdAndUpdate(
        report.reportedUser,
        { adminApprovel: "approved" },
        { new: true }
      );

      // REPORT STATUS ALSO APPROVED
      finalReportStatus = "approved";
    }

    // Save final report status
    report.status = finalReportStatus;
    await report.save();

    return res.status(200).json({
      success: true,
      message:
        finalReportStatus === "blocked"
          ? "Report approved — User BLOCKED"
          : "Report rejected — User APPROVED",
      report,
      user: updatedUser,
      userStatus: updatedUser?.adminApprovel,
    });

  } catch (err) {
    console.error("Error in updateReportStatus:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating report.",
      error: err.message,
    });
  }
};









// GET all users
export const getAllUsers = async (req, res) => {
  try {
    const { search = "", gender, status } = req.query;

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

    // 🧍 Filter by gender
    if (gender) {
      query.gender = gender;
    }

    // 🔵 Filter by verification status
    if (status) {
      query.verificationStatus = status;
    }

    // 👉 NO PAGINATION
    const users = await RegisterModel.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users,
      total: users.length, // optional count
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




export const getWeeklyReportStats = async (req, res) => {
  try {
    const today = moment().startOf("day");
    const result = [];

    // Report Categories (must match your chart labels)
    const categories = [
      "Fake",
      "Inappropriate profile",
      "Spam",
      "Harassment"
    ];

    for (let i = 6; i >= 0; i--) {
      const dayStart = moment(today).subtract(i, "days").startOf("day");
      const dayEnd = moment(today).subtract(i, "days").endOf("day");

      const dayName = dayStart.format("ddd"); // Sun, Mon...

      const dayData = {
        day: dayName,
        fake: 0,
        inappropriate: 0,
        spam: 0,
        harassment: 0
      };

      // Fetch counts per category
      const fakeCount = await ReportModel.countDocuments({
        title: "Fake",
        createdAt: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() }
      });

      const inapCount = await ReportModel.countDocuments({
        title: "Inappropriate profile",
        createdAt: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() }
      });

      const spamCount = await ReportModel.countDocuments({
        title: "Spam",
        createdAt: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() }
      });

      const harassmentCount = await ReportModel.countDocuments({
        title: "Harassment",
        createdAt: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() }
      });

      // assign values
      dayData.fake = fakeCount;
      dayData.inappropriate = inapCount;
      dayData.spam = spamCount;
      dayData.harassment = harassmentCount;

      result.push(dayData);
    }

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("Report Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};



export const getUserSignupTrends = async (req, res) => {
  try {
    const today = moment().startOf("day");
    const trendData = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = moment(today).subtract(i, "days").startOf("day");
      const dayEnd = moment(today).subtract(i, "days").endOf("day");

      // 🟡 NEW USERS
      const newUsers = await RegisterModel.countDocuments({
        createdAt: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() },
        adminApprovel: "approved",
      });

      // 🟢 RETURNING USERS (LOGIN DONE TODAY)
      const returningUsers = await RegisterModel.countDocuments({
        lastLogin: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() },
        adminApprovel: "approved",
      });

      trendData.push({
        date: dayStart.format("ddd"),
        newUsers,
        returningUsers,
      });
    }

    res.status(200).json({ success: true, data: trendData });

  } catch (err) {
    console.error("User Trend Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
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
export const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.userId; // set by authenticateUser()

    const admin = await AdminModel.findById(adminId).select("-password");
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        name: admin.name,
        email: admin.email,
        phone: admin.phone || "",
        role: admin.role || "Admin",
        profileImage: admin.profileImage || "",
        assignedRegion: admin.assignedRegion || "All India",

        // Security
        twoFactor: admin.twoFactor || false,
        suspiciousLoginAlert: admin.suspiciousLoginAlert || false,
        recentLoginDevice: admin.recentLoginDevice || "Desktop",

        // Preferences
        language: admin.language || "English",
        theme: admin.theme || "light",
        notifications: admin.notifications ?? true,
        landingPage: admin.landingPage || "Dashboard",
      }
    });

  } catch (error) {
    console.error("GET ADMIN PROFILE ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


/* ============================================================
   2. UPDATE BASIC PROFILE INFO
============================================================ */
export const updateAdminBasicInfo = async (req, res) => {
  try {
    const adminId = req.userId;

    // form-data fields come via req.body
    const { name, email, phone, assignedRegion } = req.body;

    // Profile image via Multer (optional)
    const profileImage = req.file ? req.file.path : null;

    const updateFields = {};

    // Only apply if field exists
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) {
      // Check duplicate email only when provided
      const emailExists = await AdminModel.findOne({
        email,
        _id: { $ne: adminId }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use by another admin",
        });
      }

      updateFields.email = email;
    }

    if (phone !== undefined) updateFields.phone = phone;
    if (assignedRegion !== undefined)
      updateFields.assignedRegion = assignedRegion;

    if (profileImage) updateFields.profileImage = profileImage;

    // If no fields provided
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    const updated = await AdminModel.findByIdAndUpdate(
      adminId,
      updateFields,
      { new: true }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Basic info updated successfully",
      data: updated,
    });

  } catch (error) {
    console.error("UPDATE ADMIN BASIC INFO:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};




/* ============================================================
   3. CHANGE ADMIN PASSWORD
============================================================ */
export const changeAdminPassword = async (req, res) => {
  try {
    const adminId = req.userId;
    const { oldPassword, newPassword } = req.body;

    // 🔍 Validation
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required",
      });
    }

    // 🔍 Fetch admin
    const admin = await AdminModel.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // 🔍 Check old password
    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect",
      });
    }

    // ❌ Prevent reusing the same password
    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as old password",
      });
    }

    // 🔐 Optional: enforce strong password (recommended)
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // 🔐 Hash & update password
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};



/* ============================================================
   4. UPDATE SECURITY SETTINGS
============================================================ */
export const updateAdminSecurity = async (req, res) => {
  try {
    const adminId = req.userId;

    const {
      newPassword,              // 🔥 only new password needed
      twoFactor,
      suspiciousLoginAlert,
      recentLoginDevice
    } = req.body;

    const admin = await AdminModel.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const toBool = (v) => {
      if (v === true || v === "true") return true;
      if (v === false || v === "false") return false;
      return undefined;
    };

    let updateFields = {};

    /* ------------------------------
       1️⃣ DIRECT PASSWORD CHANGE
    ------------------------------ */
    if (newPassword) {
      updateFields.password = await bcrypt.hash(newPassword, 10);
    }

    /* ------------------------------
       2️⃣ TWO FACTOR
    ------------------------------ */
    if (twoFactor !== undefined) {
      updateFields.twoFactor = toBool(twoFactor);
    }

    /* ------------------------------
       3️⃣ ALERT ON LOGIN
    ------------------------------ */
    if (suspiciousLoginAlert !== undefined) {
      updateFields.suspiciousLoginAlert = toBool(suspiciousLoginAlert);
    }

    /* ------------------------------
       4️⃣ RECENT LOGIN DEVICE
    ------------------------------ */
    if (recentLoginDevice !== undefined) {
      updateFields.recentLoginDevice = recentLoginDevice;
    }

    /* ------------------------------
       NOTHING SENT?
    ------------------------------ */
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    const updatedAdmin = await AdminModel.findByIdAndUpdate(
      adminId,
      updateFields,
      { new: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Security settings updated successfully",
      data: updatedAdmin
    });

  } catch (error) {
    console.error("SECURITY UPDATE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};




/* ============================================================
   5. UPDATE ADMIN PREFERENCES
============================================================ */
export const updateAdminPreferences = async (req, res) => {
  try {
    const adminId = req.userId;
    let { language, theme, notifications, landingPage } = req.body;

    // Convert boolean strings to true/false
    const toBool = (value) => {
      if (value === true || value === "true") return true;
      if (value === false || value === "false") return false;
      return undefined;
    };

    // Allowed values (optional but recommended)
    const allowedThemes = ["light", "dark", "system"];
    const allowedLanguages = ["English", "Hindi", "Tamil", "Telugu", "Bengali"];
    const allowedLandingPages = ["Dashboard", "Users", "Reports", "Settings"];

    const updateFields = {};

    if (language !== undefined) {
      updateFields.language = allowedLanguages.includes(language)
        ? language
        : "English";
    }

    if (theme !== undefined) {
      updateFields.theme = allowedThemes.includes(theme)
        ? theme
        : "light";
    }

    if (notifications !== undefined) {
      updateFields.notifications = toBool(notifications);
    }

    if (landingPage !== undefined) {
      updateFields.landingPage = allowedLandingPages.includes(landingPage)
        ? landingPage
        : "Dashboard";
    }

    // Ensure at least one field is being updated
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid preference fields provided",
      });
    }

    const updated = await AdminModel.findByIdAndUpdate(
      adminId,
      updateFields,
      { new: true }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      data: updated,
    });

  } catch (error) {
    console.error("PREFERENCES UPDATE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

