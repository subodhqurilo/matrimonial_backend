import moment from "moment-timezone";

import mongoose from "mongoose";
import ReportModel from '../modal/ReportModel.js';
import RegisterModel from '../modal/register.js';
import NotificationModel from "../modal/Notification.js";
import { sendExpoPush } from "../utils/expoPush.js"; // expo push function

// ------------------------------------------------------
// 1️⃣ Create Report
// ------------------------------------------------------
export const createReport = async (req, res) => {
  try {
    const reporter = req.userId;
    const { reportedUser, title, description = "" } = req.body;

    /* ================= VALIDATIONS ================= */
    if (!reportedUser || !title) {
      return res.status(400).json({
        success: false,
        message: "reportedUser and title are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reportedUser)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reportedUser id",
      });
    }

    if (reportedUser === reporter) {
      return res.status(400).json({
        success: false,
        message: "You cannot report yourself",
      });
    }

    const reportedUserData = await RegisterModel.findById(reportedUser);
    if (!reportedUserData) {
      return res.status(404).json({
        success: false,
        message: "Reported user not found",
      });
    }

    /* ================= CREATE REPORT ================= */
    const reportImages = Array.isArray(req.files)
      ? req.files.map((file) => file.path)
      : [];

    const newReport = await ReportModel.create({
      reporter,
      reportedUser,
      title,
      description,
      image: reportImages,
      status: "pending",
    });

    const populatedReport = await ReportModel.findById(newReport._id)
      .populate("reporter", "id fullName email profileImage gender")
      .populate("reportedUser", "id fullName email profileImage gender adminApprovel");

    /* =====================================================
       🔔 NOTIFICATION SECTION (ONLY ADDITION)
    ===================================================== */

    const io = global.io;
    const ADMIN_ID = "68821cc7d845954b1afa5537";

    /* ========== 1️⃣ NOTIFY REPORTED USER ========== */
    const reportedUserNotification = await NotificationModel.create({
      user: reportedUser,
      title: "You have been reported",
      message: "A report has been submitted against your profile.",
      type: "report",
      referenceId: newReport._id,
    });

    // socket
    io?.to(String(reportedUser)).emit("notification", reportedUserNotification);

    // push (expo)
    if (reportedUserData.expoPushToken) {
      await sendExpoPush(
        reportedUserData.expoPushToken,
        "You have been reported",
        "A report has been submitted against your profile."
      );
    }

    /* ========== 2️⃣ NOTIFY REPORTER ========== */
    const reporterUser = await RegisterModel.findById(reporter);

    const reporterNotification = await NotificationModel.create({
      user: reporter,
      title: "Report submitted",
      message: "Your report has been sent to admin for review.",
      type: "report",
      referenceId: newReport._id,
    });

    // socket
    io?.to(String(reporter)).emit("notification", reporterNotification);

    // push
    if (reporterUser?.expoPushToken) {
      await sendExpoPush(
        reporterUser.expoPushToken,
        "Report submitted",
        "Your report has been sent to admin for review."
      );
    }

    /* ========== 3️⃣ NOTIFY ADMIN (FIXED ID) ========== */
    const adminUser = await RegisterModel.findById(ADMIN_ID);

    if (adminUser) {
      const adminNotification = await NotificationModel.create({
        user: ADMIN_ID,
        title: "New report received",
        message: "A new user report has been submitted. Please review.",
        type: "report",
        referenceId: newReport._id,
      });

      // socket
      io?.to(String(ADMIN_ID)).emit("notification", adminNotification);

      // push
      if (adminUser.expoPushToken) {
        await sendExpoPush(
          adminUser.expoPushToken,
          "New report received",
          "A new user report has been submitted. Please review."
        );
      }
    }

    /* ===================================================== */

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully.",
      data: populatedReport,
    });

  } catch (err) {
    console.error("[Report Create Error]", err);
    return res.status(500).json({
      success: false,
      message: "Error creating report",
      error: err.message,
    });
  }
};





// ------------------------------------------------------
// 2️⃣ GET ALL REPORTS (This is the ONE YOU WANT!)
// ------------------------------------------------------

export const getAllReportsAnalize = async (req, res) => {
  try {
    // Total reports count
    const totalReports = await ReportModel.countDocuments();

    // Fetch ALL reports (no pagination)
    const reports = await ReportModel.find()
      .populate('reporter', 'firstName lastName email profileImage gender')
      .populate('reportedUser', 'firstName lastName email profileImage gender adminApprovel')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      totalReports,
      data: reports
    });

  } catch (err) {
    console.error("[Get Reports Error]", err);
    res.status(500).json({
      success: false,
      message: "Error fetching reports",
      error: err.message,
    });
  }
};




export const getSingleReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },

      // Reporter
      {
        $lookup: {
          from: "registers",
          localField: "reporter",
          foreignField: "_id",
          as: "reporter",
        },
      },
      { $unwind: "$reporter" },

      // Reported user
      {
        $lookup: {
          from: "registers",
          localField: "reportedUser",
          foreignField: "_id",
          as: "reportedUser",
        },
      },
      { $unwind: "$reportedUser" },

      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          reason: 1,
          status: 1,
          image: 1,
          createdAt: 1,

          reporter: {
            id: "$reporter.id",
            email: "$reporter.email",
            gender: "$reporter.gender",
            avatar: "$reporter.profileImage",
            fullName: {
              $concat: [
                "$reporter.firstName",
                " ",
                { $ifNull: ["$reporter.lastName", ""] }
              ]
            }
          },

          reportedUser: {
            id: "$reportedUser.id",
            email: "$reportedUser.email",
            gender: "$reportedUser.gender",
            avatar: "$reportedUser.profileImage",
            adminApprovel: "$reportedUser.adminApprovel",
            fullName: {
              $concat: [
                "$reportedUser.firstName",
                " ",
                { $ifNull: ["$reportedUser.lastName", ""] }
              ]
            }
          }
        }
      }
    ];

    const result = await ReportModel.aggregate(pipeline);

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result[0],
    });

  } catch (err) {
    console.error("[View Single Report Error]", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching report details",
      error: err.message,
    });
  }
};

export const getWeeklyReportStats = async (req, res) => {
  try {
    const now = moment().tz("Asia/Kolkata");

    // THIS WEEK (Monday → Sunday)
    const thisWeekStart = now.clone().startOf("isoWeek").toDate();
    const thisWeekEnd = now.clone().endOf("isoWeek").toDate();

    // ===========================================
    // DATABASE QUERIES
    // ===========================================

    const [
      totalReportsThisWeek,
      pendingReportReview,
      actionTaken,
      blockedUsers
    ] = await Promise.all([

      // 1️⃣ Total reports this week
      ReportModel.countDocuments({
        createdAt: { $gte: thisWeekStart, $lte: thisWeekEnd }
      }),

      // 2️⃣ Pending review (ALL TIME)
      ReportModel.countDocuments({
        status: { $regex: /^pending$/i }
      }),

      // 3️⃣ Action Taken (approved OR rejected)
      ReportModel.countDocuments({
        status: { $in: ["approved", "rejected"] }
      }),

      // 4️⃣ Blocked users (two conditions)
      RegisterModel.countDocuments({
        adminApprovel: "blocked"
      })

    ]);

    // ===========================================
    // RESPONSE
    // ===========================================
    return res.status(200).json({
      success: true,
      data: {
        totalReportsThisWeek,
        pendingReportReview,
        actionTaken,
        blockedUsers
      }
    });

  } catch (err) {
    console.error("Report Stats Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message
    });
  }
};
