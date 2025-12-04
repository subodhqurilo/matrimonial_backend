import express  from "express";
import { updateReportStatus,getWeeklyReportStats ,getAdminProfile,
  updateAdminBasicInfo,
  changeAdminPassword,
  updateAdminSecurity,getWeeklyRequestStats ,
  updateAdminPreferences, getAllManageUserData, getAllReportsAnalize, getAllUsers,getReportedContent, getFilteredManageUsers, getMatchesPerMonth, getProfileOverview, getSearchToMatchStats, getSignupGender, getSingleUserById, getStatsSummary, getUserManage, getUsers, getUserSignupTrends, getWeeklyReports, updateUserById, updateUserStatus, verifyAadhaar } from "../controller/dashboardController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";
import upload from '../middlewares/multer.js';

const adminRoute = express.Router();

 adminRoute.get("/profile", authenticateUser, getAdminProfile);
adminRoute.put(
  "/profile/basic",
  authenticateUser,
  upload.single("profileImage"),   // THIS FIXES EVERYTHING
  updateAdminBasicInfo
);

adminRoute.put("/profile/password", authenticateUser, changeAdminPassword);
adminRoute.put("/profile/security", authenticateUser, updateAdminSecurity);
adminRoute.put("/profile/preferences", authenticateUser, updateAdminPreferences);


adminRoute.get('/summary', getStatsSummary);
adminRoute.get('/getByGender', getSignupGender);
adminRoute.get('/getUser', getUsers)
adminRoute.get('/user-stats', getUserManage)
adminRoute.get('/WeeklyRequestStats', getWeeklyRequestStats)



adminRoute.get('/user-manage', getAllManageUserData);
adminRoute.put('/user-manage/:userId', updateUserById);
adminRoute.get('/user-manage-get', getFilteredManageUsers);


adminRoute.get('/report', getReportedContent );

adminRoute.get('/report-analize', getAllReportsAnalize);
adminRoute.put("/report/status/:reportId", updateReportStatus);

adminRoute.get('/user-verify', getAllUsers);
adminRoute.patch('/user-verify/:id/status', updateUserStatus);

adminRoute.get('/user/:id', getSingleUserById);


adminRoute.get('/user-signup-trends', getUserSignupTrends);
adminRoute.get('/WeeklyReportStats', getWeeklyReportStats );

adminRoute.get('/overview', getProfileOverview);
adminRoute.get('/matches-per-month', getMatchesPerMonth);

adminRoute.get('/reports-this-week', getWeeklyReports);
adminRoute.get('/search-to-match', getSearchToMatchStats);

adminRoute.put('/verify-aadhaar/:id', verifyAadhaar);

export default adminRoute