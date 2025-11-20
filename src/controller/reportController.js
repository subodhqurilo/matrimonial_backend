import mongoose from "mongoose";
import ReportModel from '../modal/ReportModel.js';
import RegisterModel from '../modal/register.js';

// ------------------------------------------------------
// 1️⃣ Create Report
// ------------------------------------------------------
export const createReport = async (req, res) => {
  try {
    const reporter = req.userId;
    const { reportedUser, title, description = "" } = req.body;

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

    const userExists = await RegisterModel.findById(reportedUser);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "Reported user not found",
      });
    }

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

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully.",
      data: populatedReport,
    });

  } catch (err) {
    console.error("[Report Create Error]", err);
    res.status(500).json({
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
    const reports = await ReportModel.find()
      .populate('reporter', 'firstName lastName email profileImage gender')
      .populate('reportedUser', 'firstName lastName email profileImage gender adminApprovel')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
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

    // 🔍 Validate Mongo ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    // 🔍 Fetch report with population
    const report = await ReportModel.findById(id)
      .populate("reporter", "id fullName email profileImage gender")
      .populate("reportedUser", "id fullName email profileImage gender adminApprovel");

    // Report not found
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Success
    return res.status(200).json({
      success: true,
      data: report,
    });

  } catch (err) {
    console.error("[View Single Report Error]", err);
    res.status(500).json({
      success: false,
      message: "Error fetching report details",
      error: err.message,
    });
  }
};