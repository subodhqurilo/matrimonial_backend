import ReportModel from '../modal/ReportModel.js';



export const createReport = async (req, res) => {
  try {
    const reporter = req.userId;
    const { reportedUser, title, description } = req.body;

    const reportImages = req.files?.map((file) => file.path) || [];
    console.log('Uploaded files:', reportImages);

    const newReport = new ReportModel({
      reporter,
      reportedUser,
      title,
      description,
      image: reportImages, 
    });

    await newReport.save();

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
      .populate('reporter', 'fullName email')
      .populate('reportedUser', 'fullName email adminApprovel')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching reports', error: err.message });
  }
};




