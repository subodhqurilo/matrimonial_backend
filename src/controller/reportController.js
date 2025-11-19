import ReportModel from '../modal/ReportModel.js';
import RegisterModel from '../modal/register.js';

export const createReport = async (req, res) => {
  try {
    const reporter = req.userId;
    const { reportedUser, title, description } = req.body;

    if (!reportedUser || !title) {
      return res.status(400).json({
        success: false,
        message: "reportedUser and title are required",
      });
    }

    // Check if reported user exists
    const userExists = await RegisterModel.findById(reportedUser);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "Reported user not found",
      });
    }

    // uploaded files (multer)
    const reportImages = req.files?.map((file) => file.path) || [];

    const newReport = await ReportModel.create({
      reporter,
      reportedUser,
      title,
      description: description || "",
      image: reportImages,
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully.',
      data: newReport,
    });

  } catch (err) {
    console.error('[Report Create Error]', err);
    res.status(500).json({
      success: false,
      message: 'Error creating report',
      error: err.message,
    });
  }
};
export const getAllReports = async (req, res) => {
  try {
    const reports = await ReportModel.find()
      .populate('reporter', 'firstName lastName email')
      .populate('reportedUser', 'firstName lastName email adminApprovel')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reports });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: err.message
    });
  }
};
