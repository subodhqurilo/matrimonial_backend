import moment from "moment";
import NotificationModel from "../modal/Notification.js";
import { sendExpoPush } from "../utils/expoPush.js"; // expo push function


import { AccountRequestModel } from "../modal/accountRequestModel.js";

export const calculateAge = dob => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};
export const formatUserProfile = (user) => {
  if (!user) return null;

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const location = [
    user.city || user.currentCity || "",
    user.state || user.currentState || ""
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: user.id,
    _id: user._id,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    age: calculateAge(user.dateOfBirth),
    height: user.height,
    caste: user.caste,
    designation: user.designation || user.occupation,
    religion: user.religion,
    profession: user.occupation,
    salary: user.annualIncome,
    education: user.highestEducation,
    location,
    languages: Array.isArray(user.motherTongue)
      ? user.motherTongue.join(", ")
      : user.motherTongue || "",
    gender: user.gender,
    profileImage: user.profileImage,
    lastSeen: user.updatedAt || user.createdAt,
  };
};



export const requestAccount = async (req, res) => {
  const requesterId = req.userId;
  const { receiverId } = req.body;

  if (!requesterId || !receiverId) {
    return res.status(400).json({
      success: false,
      message: "Both requesterId and receiverId are required"
    });
  }

  if (requesterId.toString() === receiverId.toString()) {
    return res.status(400).json({
      success: false,
      message: "You cannot send a request to yourself"
    });
  }

  try {
    const existing = await AccountRequestModel.findOne({
      $or: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId }
      ]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          existing.status === "accepted"
            ? "You are already connected"
            : "A request already exists"
      });
    }

    const newRequest = new AccountRequestModel({
      requesterId,
      receiverId,
      status: "pending"
    });

    await newRequest.save();

    /* =====================================================
       🔔 NOTIFICATION SECTION (ONLY ADDITION)
       - DB  → BOTH
       - SOCKET → BOTH
       - PUSH → RECEIVER ONLY
    ===================================================== */

    const io = global.io;

    const receiverUser = await RegisterModel.findById(receiverId);

    /* ---------- DB + SOCKET → REQUESTER ---------- */
    const requesterNotification = await NotificationModel.create({
      user: requesterId,
      title: "Request Sent",
      message: "Your account request has been sent successfully."
    });

    io?.to(String(requesterId)).emit("notification", requesterNotification);

    /* ---------- DB + SOCKET → RECEIVER ---------- */
    const receiverNotification = await NotificationModel.create({
      user: receiverId,
      title: "New Request Received",
      message: "You have received a new account request."
    });

    io?.to(String(receiverId)).emit("notification", receiverNotification);

    /* ---------- PUSH → RECEIVER ONLY ---------- */
    if (receiverUser?.expoToken) {
      await sendExpoPush(
        receiverUser.expoToken,
        "New Request Received",
        "You have received a new account request."
      );
    }

    /* ===================================================== */

    return res.status(201).json({
      success: true,
      message: "Request sent successfully",
      request: newRequest
    });

  } catch (error) {
    console.error("❌ requestAccount error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};







export const updateAccountRequestStatus = async (req, res) => {
  const userId = req.userId; // Logged-in user (receiver)
  const { requestId, status } = req.body;

  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status"
    });
  }

  try {
    // 🔍 Find the request where YOU are the receiver
    const request = await AccountRequestModel.findOne({
      _id: requestId,
      receiverId: userId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found or you are not authorized"
      });
    }

    // ❗ If already accepted/rejected
    if (request.status === status) {
      return res.status(200).json({
        success: true,
        message: `Request already ${status}`,
        request
      });
    }

    // ✔ Update request status
    request.status = status;
    await request.save();

    // 🔁 OPTIONAL reverse request
    const reverseRequest = await AccountRequestModel.findOne({
      requesterId: userId,
      receiverId: request.requesterId
    });

    if (reverseRequest) {
      reverseRequest.status = status;
      await reverseRequest.save();
    }

    /* =====================================================
       🔔 NOTIFICATION SECTION (COMPLETE & FIXED)
       RULE:
       - DB     → BOTH USERS
       - SOCKET → BOTH USERS
       - PUSH   → REQUESTER ONLY
    ===================================================== */

    const io = global.io;

    const requesterId = request.requesterId; // jisne request bheji
    const receiverId = request.receiverId;   // jisne accept/reject ki

    const requesterUser = await RegisterModel.findById(requesterId);

    const title =
      status === "accepted"
        ? "Request Accepted"
        : "Request Rejected";

    const requesterMessage =
      status === "accepted"
        ? "Your account request has been accepted."
        : "Your account request has been rejected.";

    const receiverMessage =
      status === "accepted"
        ? "You accepted the account request."
        : "You rejected the account request.";

    /* ---------- DB → REQUESTER ---------- */
    const requesterNotification = await NotificationModel.create({
      user: requesterId,
      title,
      message: requesterMessage,
      read: false
    });

    /* ---------- DB → RECEIVER ---------- */
    const receiverNotification = await NotificationModel.create({
      user: receiverId,
      title,
      message: receiverMessage,
      read: false
    });

    /* ---------- SOCKET → REQUESTER ---------- */
    io?.to(String(requesterId)).emit("notification", requesterNotification);

    /* ---------- SOCKET → RECEIVER ---------- */
    io?.to(String(receiverId)).emit("notification", receiverNotification);

    /* ---------- PUSH → REQUESTER ONLY ---------- */
    if (requesterUser?.expoToken) {
      await sendExpoPush(
        requesterUser.expoToken,
        title,
        requesterMessage
      );
    }

    /* ===================================================== */

    return res.status(200).json({
      success: true,
      message: `Request ${status} successfully`,
      request
    });

  } catch (error) {
    console.error("❌ updateAccountRequestStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};





















export const getReceivedRequests = async (req, res) => {
  const userId = req.userId;

  try {
    // ---------------------- GET REQUESTS ----------------------
    const requests = await AccountRequestModel.find({ receiverId: userId })
      .populate({
        path: "requesterId",
        select: `
          id _id firstName lastName dateOfBirth height religion caste occupation
          annualIncome highestEducation currentCity city state currentState motherTongue
          gender profileImage updatedAt createdAt designation maritalStatus country
        `,
      })
      .sort({ createdAt: -1 });

    // ---------------------- AGE HELPER ----------------------
    const calculateAge = (dob) => {
      if (!dob) return null;
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    // ---------------------- FORMAT RESPONSE ----------------------
    const data = requests
      .filter((r) => r.requesterId) // skip null users
      .map((reqItem) => {
        const user = reqItem.requesterId;

        // 🔹 Format name
        const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

        // 🔹 Location (fix: avoid ", ,")
        const city = user.city || user.currentCity || "";
        const state = user.state || user.currentState || "";
        const location = [city, state].filter(Boolean).join(", ");

        // 🔹 Language formatting
        const languages = Array.isArray(user.motherTongue)
          ? user.motherTongue.join(", ")
          : user.motherTongue || null;

        return {
          requestId: reqItem._id,
          requestStatus: reqItem.status,

          // User details
          id: user.id,
          _id: user._id,
          name,
          age: calculateAge(user.dateOfBirth),

          height: user.height || null,
          caste: user.caste || null,
          designation: user.designation || user.occupation || null,
          religion: user.religion || null,

          salary: user.annualIncome || null,
          education: user.highestEducation || null,
          maritalStatus: user.maritalStatus || null,

          location,
          languages,
          gender: user.gender,
          profileImage: user.profileImage || null,

          lastSeen: user.updatedAt || user.createdAt,
          createdAt: reqItem.createdAt,
        };
      });

    // ---------------------- RESPONSE ----------------------
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });

  } catch (error) {
    console.error("❌ Error in getReceivedRequests:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};









export const getReceivedRequestsByStatus = async (req, res) => {
  const userId = req.userId;
  const { status } = req.query;

  const validStatuses = ["pending", "accepted", "rejected"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status filter" });
  }

  try {
    const filter = { receiverId: userId };
    if (status) filter.status = status;

    const requests = await AccountRequestModel.find(filter)
      .populate({
        path: "requesterId",
        select: `
          firstName lastName phoneNumber profileImage 
          partnerPreference.setAssProfileImage height caste designation 
          annualIncome currentCity currentState motherTongue highestEducation dateOfBirth id
        `,
      })
      .sort({ createdAt: -1 });

    const formatted = requests
      .filter((req) => req.requesterId) // Skip deleted users
      .map((req) => {
        const user = req.requesterId;

        // Age
        const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;

        // Location formatting
        const location = [user.currentCity, user.currentState]
          .filter(Boolean)
          .join(", ");

        // Language formatting
        const languages = Array.isArray(user.motherTongue)
          ? user.motherTongue.join(", ")
          : user.motherTongue || null;

        return {
          requestId: req._id,
          status: req.status,
          createdAt: req.createdAt,

          user: {
            _id: user._id,
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,

            age,
            height: user.height || null,
            caste: user.caste || null,
            designation: user.designation || null,
            annualIncome: user.annualIncome || null,
            highestEducation: user.highestEducation || null,

            location,
            languages,

            profileImage:
              user.profileImage ||
              user?.partnerPreference?.setAssProfileImage ||
              null,

            dateOfBirth: user.dateOfBirth,
          },
        };
      });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      requests: formatted,
    });

  } catch (error) {
    console.error("❌ Error in getReceivedRequestsByStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};







export const getSentRequests = async (req, res) => {
  const userId = req.userId;

  try {
    // ---------------------- FETCH SENT REQUESTS ----------------------
    const requests = await AccountRequestModel.find({ requesterId: userId })
      .populate({
        path: "receiverId",
        select: `
          id _id firstName lastName dateOfBirth height religion caste occupation
          annualIncome highestEducation currentCity city state currentState motherTongue
          gender profileImage updatedAt createdAt designation maritalStatus country
        `,
      })
      .sort({ createdAt: -1 });

    // ---------------------- AGE HELPER ----------------------
    const calculateAge = (dob) => {
      if (!dob) return null;
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    // ---------------------- FORMAT RESPONSE ----------------------
    const formatted = requests
      .filter((req) => req.receiverId) // Skip deleted/missing users
      .map((reqItem) => {
        const user = reqItem.receiverId;

        // Format name
        const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

        // Location formatting
        const city = user.city || user.currentCity || "";
        const state = user.state || user.currentState || "";
        const location = [city, state].filter(Boolean).join(", ");

        // Language formatting
        const languages = Array.isArray(user.motherTongue)
          ? user.motherTongue.join(", ")
          : user.motherTongue || null;

        return {
          requestId: reqItem._id,
          requestStatus: reqItem.status,
          createdAt: reqItem.createdAt,

          // ---------------------- USER DETAILS ----------------------
          id: user.id,
          _id: user._id,
          name,
          age: calculateAge(user.dateOfBirth),

          height: user.height || null,
          caste: user.caste || null,
          religion: user.religion || null,
          designation: user.designation || user.occupation || null,
          salary: user.annualIncome || null,
          education: user.highestEducation || null,
          maritalStatus: user.maritalStatus || null,

          location,
          languages,
          gender: user.gender || null,
          profileImage: user.profileImage || null,
          lastSeen: user.updatedAt || user.createdAt,
        };
      });

    // ---------------------- SEND RESPONSE ----------------------
    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });

  } catch (err) {
    console.error("❌ getSentRequests Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};








export const getRejectedRequests = async (req, res) => {
  const userId = req.userId;

  try {
    // ---------------------- FETCH REJECTED REQUESTS ----------------------
    const requests = await AccountRequestModel.find({
      receiverId: userId,
      status: "rejected",
    })
      .populate({
        path: "requesterId",
        select: `
          id _id firstName lastName dateOfBirth height religion caste occupation
          annualIncome highestEducation currentCity city state currentState motherTongue
          gender profileImage updatedAt createdAt designation maritalStatus country
        `,
      })
      .sort({ createdAt: -1 });

    // ---------------------- AGE HELPER ----------------------
    const calculateAge = (dob) => {
      if (!dob) return null;
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    // ---------------------- FORMAT RESPONSE ----------------------
    const formatted = requests
      .filter((reqItem) => reqItem.requesterId) // Skip deleted profiles
      .map((reqItem) => {
        const user = reqItem.requesterId;

        // 🔹 Format location
        const city = user.city || user.currentCity || "";
        const state = user.state || user.currentState || "";
        const location = [city, state].filter(Boolean).join(", ");

        // 🔹 Format languages
        const languages = Array.isArray(user.motherTongue)
          ? user.motherTongue.join(", ")
          : user.motherTongue || null;

        return {
          requestId: reqItem._id,
          requestStatus: reqItem.status,
          createdAt: reqItem.createdAt,

          // ---------------------- USER DETAILS ----------------------
          id: user.id,
          _id: user._id,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          age: calculateAge(user.dateOfBirth),

          height: user.height || null,
          caste: user.caste || null,
          religion: user.religion || null,
          designation: user.designation || user.occupation || null,
          salary: user.annualIncome || null,
          education: user.highestEducation || null,
          maritalStatus: user.maritalStatus || null,

          location,
          languages,
          gender: user.gender || null,
          profileImage: user.profileImage || null,
          lastSeen: user.updatedAt || user.createdAt,
        };
      });

    // ---------------------- SEND RESPONSE ----------------------
    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });

  } catch (error) {
    console.error("❌ Error fetching rejected requests:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};





export const deleteAccountRequest = async (req, res) => {
  try {
    const userId = req.userId;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "RequestId is required",
      });
    }

    /* =====================================================
       🔐 CHECK AUTHORIZATION
    ===================================================== */
    const request = await AccountRequestModel.findOne({
      _id: requestId,
      $or: [{ requesterId: userId }, { receiverId: userId }],
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found or unauthorized",
      });
    }

    /* =====================================================
       👤 IDENTIFY USERS
    ===================================================== */
    const requesterId = request.requesterId.toString();
    const receiverId = request.receiverId.toString();

    const deletedByRequester = userId === requesterId;

    /* =====================================================
       🗑️ DELETE REQUEST
    ===================================================== */
    await AccountRequestModel.findByIdAndDelete(requestId);

    /* =====================================================
       🔔 FETCH BOTH USERS
    ===================================================== */
    const requesterUser = await RegisterModel.findById(requesterId).select(
      "expoPushToken fullName"
    );
    const receiverUser = await RegisterModel.findById(receiverId).select(
      "expoPushToken fullName"
    );

    /* =====================================================
       📝 NOTIFICATION CONTENT
    ===================================================== */
    const title = "Account Request Update";

    const msgForRequester = deletedByRequester
      ? "You deleted the account request."
      : "Your account request has been deleted.";

    const msgForReceiver = deletedByRequester
      ? "Your account request has been deleted."
      : "You deleted the account request.";

    /* =====================================================
       📱 EXPO PUSH NOTIFICATIONS
    ===================================================== */
    if (requesterUser?.expoPushToken) {
      sendExpoPush(
        requesterUser.expoPushToken,
        title,
        msgForRequester
      ).catch((err) =>
        console.log("❌ Expo Push Error (Requester):", err)
      );
    }

    if (receiverUser?.expoPushToken) {
      sendExpoPush(
        receiverUser.expoPushToken,
        title,
        msgForReceiver
      ).catch((err) =>
        console.log("❌ Expo Push Error (Receiver):", err)
      );
    }

    /* =====================================================
       🔴 SOCKET NOTIFICATIONS
    ===================================================== */
    const io = req.app.get("io");

    if (io) {
      io.to(String(requesterId)).emit("newNotification", {
        title,
        message: msgForRequester,
        type: "request_deleted",
        requestId,
        actor: userId,
        createdAt: new Date(),
      });

      io.to(String(receiverId)).emit("newNotification", {
        title,
        message: msgForReceiver,
        type: "request_deleted",
        requestId,
        actor: userId,
        createdAt: new Date(),
      });
    }

    /* =====================================================
       ✅ RESPONSE (UNCHANGED)
    ===================================================== */
    return res.status(200).json({
      success: true,
      message: "Request deleted successfully",
      deletedRequestId: requestId,
    });
  } catch (error) {
    console.error("❌ deleteAccountRequest Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};









export const getRequestsAcceptedByMe = async (req, res) => {
  const userId = req.userId;

  try {
    // ---------------------- FETCH ACCEPTED REQUESTS ----------------------
    const requests = await AccountRequestModel.find({
      receiverId: userId,
      status: "accepted",
    })
      .populate({
        path: "requesterId",
        select: `
          id _id firstName lastName dateOfBirth height religion caste occupation
          annualIncome highestEducation currentCity city state currentState motherTongue
          gender profileImage updatedAt createdAt designation maritalStatus country
        `,
      })
      .sort({ createdAt: -1 });

    // ---------------------- AGE HELPER ----------------------
    const calculateAge = (dob) => {
      if (!dob) return null;
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    // ---------------------- FORMAT RESPONSE ----------------------
    const formatted = requests
      .filter((reqItem) => reqItem.requesterId) // Skip deleted profiles
      .map((reqItem) => {
        const user = reqItem.requesterId;

        // Format location
        const city = user.city || user.currentCity || "";
        const state = user.state || user.currentState || "";
        const location = [city, state].filter(Boolean).join(", ");

        // Language formatting
        const languages = Array.isArray(user.motherTongue)
          ? user.motherTongue.join(", ")
          : user.motherTongue || null;

        return {
          requestId: reqItem._id,
          requestStatus: reqItem.status,
          acceptedBy: "me",
          createdAt: reqItem.createdAt,

          // ---------------------- USER DETAILS ----------------------
          id: user.id,
          _id: user._id,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          age: calculateAge(user.dateOfBirth),

          height: user.height || null,
          caste: user.caste || null,
          religion: user.religion || null,
          designation: user.designation || user.occupation || null,
          salary: user.annualIncome || null,
          education: user.highestEducation || null,
          maritalStatus: user.maritalStatus || null,

          location,
          languages,
          gender: user.gender,
          profileImage: user.profileImage || null,
          lastSeen: user.updatedAt || user.createdAt,
        };
      });

    // ---------------------- SEND RESPONSE ----------------------
    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });

  } catch (error) {
    console.error("❌ Error fetching accepted requests by me:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};




export const getRequestsAcceptedByOthers = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await AccountRequestModel.find({
      requesterId: userId,
      status: "accepted",
    })
      .populate({
        path: "receiverId",
        select: `
          id _id firstName lastName dateOfBirth height religion caste occupation
          annualIncome highestEducation currentCity currentState motherTongue
          gender profileImage updatedAt createdAt designation
        `,
      })
      .sort({ createdAt: -1 });

    // Calculate Age
    const calculateAge = (dob) => {
      if (!dob) return null;
      const today = new Date();
      const birth = new Date(dob);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    };

    const formatted = requests
      .filter((req) => req.receiverId) // Skip null deleted accounts
      .map((request) => {
        const user = request.receiverId;

        // Location
        const location = [
          user.currentCity || user.city,
          user.currentState || user.state,
        ]
          .filter(Boolean)
          .join(", ");

        // Languages
        const languages = Array.isArray(user.motherTongue)
          ? user.motherTongue.join(", ")
          : user.motherTongue || null;

        return {
          requestId: request._id,
          status: request.status,
          createdAt: request.createdAt,
          acceptedBy: "other",

          user: {
            id: user.id,
            _id: user._id,
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),

            age: calculateAge(user.dateOfBirth),
            height: user.height,
            caste: user.caste,
            religion: user.religion,
            designation: user.designation || user.occupation,
            salary: user.annualIncome,
            education: user.highestEducation,

            location,
            languages,
            gender: user.gender,

            profileImage: user.profileImage,
            lastSeen: user.updatedAt || user.createdAt,
          },
        };
      });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      requests: formatted,
    });

  } catch (error) {
    console.error("❌ Error fetching accepted requests by others:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

