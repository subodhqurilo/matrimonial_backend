import express  from "express";
import { blockReportedUser, getAllManageUserData, getAllReportsAnalize, getAllUsers, getFilteredManageUsers, getMatchesPerMonth, getProfileOverview, getSearchToMatchStats, getSignupGender, getSingleUserById, getStatsSummary, getUserManage, getUsers, getUserSignupTrends, getWeeklyReports, updateUserById, updateUserStatus, verifyAadhaar } from "../controller/dashboardController.js";
import { getAllReports } from "../controller/reportController.js";
const adminRoute = express.Router();

 

adminRoute.get('/summary', getStatsSummary);
adminRoute.get('/getByGender', getSignupGender);
adminRoute.get('/getUser', getUsers)
adminRoute.get('/user-stats', getUserManage)



adminRoute.get('/user-manage', getAllManageUserData);
adminRoute.put('/user-manage/:userId', updateUserById);
adminRoute.get('/user-manage-get', getFilteredManageUsers);



adminRoute.get('/report-analize', getAllReportsAnalize);
adminRoute.put('/report/block/:reportId', blockReportedUser);

adminRoute.get('/user-verify', getAllUsers);
adminRoute.patch('/user-verify/:id/status', updateUserStatus);

adminRoute.get('/user/:id', getSingleUserById);


adminRoute.get('/user-signup-trends', getUserSignupTrends);

adminRoute.get('/overview', getProfileOverview);
adminRoute.get('/matches-per-month', getMatchesPerMonth);

adminRoute.get('/reports-this-week', getWeeklyReports);
adminRoute.get('/search-to-match', getSearchToMatchStats);

adminRoute.put('/verify-aadhaar/:id', verifyAadhaar);

export default adminRoute