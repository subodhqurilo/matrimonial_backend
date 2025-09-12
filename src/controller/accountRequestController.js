import { AccountRequestModel } from "../modal/accountRequestModel.js";

// Utility: calculate age
export const calculateAge = dob => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

// Send a request
export const requestAccount = async (req, res) => {
  const requesterId = req.userId;
  const { receiverId } = req.body;

  if (!requesterId || !receiverId)
    return res.status(400).json({ message: 'Both requester and receiver are required' });

  if (requesterId === receiverId)
    return res.status(400).json({ message: 'Cannot send request to yourself' });

  try {
    const existingRequest = await AccountRequestModel.findOne({ requesterId, receiverId });
    if (existingRequest)
      return res.status(400).json({ message: 'Request already exists' });

    const request = new AccountRequestModel({ requesterId, receiverId });
    await request.save();

    res.status(201).json({ success: true, message: 'Request sent successfully', request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update request status


export const updateAccountRequestStatus = async (req, res) => {
  const userId = req.userId;
  const { requestId, status } = req.body;

  // Only allow accepted or rejected
  if (!["accepted", "rejected"].includes(status))
    return res.status(400).json({ message: "Invalid status" });

  try {
    // ✅ Allow updating pending or accepted requests
    const request = await AccountRequestModel.findOne({
      _id: requestId,
      $or: [{ receiverId: userId }, { requesterId: userId }],
      status: { $in: ["pending", "accepted"] }, 
    });

    if (!request)
      return res.status(404).json({ message: "Request not found or unauthorized" });

    // Prevent accepting already accepted requests again
    if (status === "accepted" && request.status === "accepted") {
      return res.status(400).json({ message: "Request already accepted" });
    }

    request.status = status;
    await request.save();

    res.status(200).json({ success: true, message: `Request ${status}`, request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// Get received requests (pending)
export const getReceivedRequests = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await AccountRequestModel.find({ receiverId: userId, status: "pending" })
      .populate({
        path: "requesterId",
        select: "id _id firstName lastName dateOfBirth height religion caste occupation annualIncome highestEducation city state motherTongue gender profileImage designation updatedAt createdAt",
      })
      .sort({ createdAt: -1 });

    const data = requests
      .filter(r => r.requesterId)
      .map(r => {
        const user = r.requesterId;
        return {
          requestId: r._id,
          status: r.status,
          id: user.id,
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          age: calculateAge(user.dateOfBirth),
          height: user.height,
          caste: user.caste,
          designation: user.designation,
          religion: user.religion,
          profession: user.occupation,
          salary: user.annualIncome,
          education: user.highestEducation,
          location: `${user.city || ""}, ${user.state || ""}`,
          languages: Array.isArray(user.motherTongue) ? user.motherTongue.join(", ") : user.motherTongue,
          gender: user.gender,
          profileImage: user.profileImage,
          lastSeen: user.updatedAt || user.createdAt,
        };
      });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get received requests by status
export const getReceivedRequestsByStatus = async (req, res) => {
  const userId = req.userId;
  const { status } = req.query;
  const validStatuses = ["pending", "accepted", "rejected"];
  if (status && !validStatuses.includes(status))
    return res.status(400).json({ message: "Invalid status filter" });

  try {
    const filter = { receiverId: userId };
    if (status) filter.status = status;

    const requests = await AccountRequestModel.find(filter)
      .populate({
        path: "requesterId",
        select: "firstName lastName phoneNumber profileImage partnerPreference.setAssProfileImage height caste designation annualIncome currentCity motherTongue highestEducation dateOfBirth id",
      })
      .sort({ createdAt: -1 });

    const formatted = requests.map(r => ({
      requestId: r._id,
      status: r.status,
      createdAt: r.createdAt,
      user: {
        _id: r.requesterId._id,
        firstName: r.requesterId.firstName,
        lastName: r.requesterId.lastName,
        id: r.requesterId.id,
        height: r.requesterId.height,
        caste: r.requesterId.caste,
        designation: r.requesterId.designation,
        annualIncome: r.requesterId.annualIncome,
        currentCity: r.requesterId.currentCity,
        motherTongue: r.requesterId.motherTongue,
        highestEducation: r.requesterId.highestEducation,
        profileImage: r.requesterId.profileImage || r.requesterId?.partnerPreference?.setAssProfileImage || null,
        dateOfBirth: r.requesterId.dateOfBirth,
      }
    }));

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get sent requests
export const getSentRequests = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await AccountRequestModel.find({ requesterId: userId })
      .populate({
        path: "receiverId",
        select: "id _id firstName lastName dateOfBirth height religion caste occupation annualIncome highestEducation city state motherTongue gender profileImage designation updatedAt createdAt",
      })
      .sort({ createdAt: -1 });

    const formatted = requests.map(r => ({
      requestId: r._id,
      status: r.status,
      createdAt: r.createdAt,
      user: r.receiverId,
    }));

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get rejected requests
export const getRejectedRequests = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await AccountRequestModel.find({ receiverId: userId, status: "rejected" })
      .populate({
        path: "requesterId",
        select: "id _id firstName lastName dateOfBirth height religion caste occupation annualIncome highestEducation currentCity city state motherTongue gender profileImage updatedAt createdAt designation",
      })
      .sort({ createdAt: -1 });

    const formatted = requests.map(r => ({
      requestId: r._id,
      status: r.status,
      createdAt: r.createdAt,
      user: r.requesterId,
    }));

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete a request (soft delete)
export const deleteAccountRequest = async (req, res) => {
  const { requestId } = req.body;
  if (!requestId) return res.status(400).json({ success: false, message: "Request ID is required" });

  try {
    const request = await AccountRequestModel.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    request.status = "deleted";
    await request.save();

    res.status(200).json({ success: true, message: "Request deleted successfully", request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get requests accepted by me
export const getRequestsAcceptedByMe = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await AccountRequestModel.find({ receiverId: userId, status: "accepted" })
      .populate({
        path: "requesterId",
        select: "id _id firstName lastName dateOfBirth height religion caste occupation annualIncome highestEducation currentCity city state motherTongue gender profileImage updatedAt createdAt designation",
      })
      .sort({ createdAt: -1 });

    const formatted = requests.map(r => ({
      requestId: r._id,
      status: r.status,
      createdAt: r.createdAt,
      user: r.requesterId,
      acceptedBy: "me",
    }));

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get requests accepted by others
export const getRequestsAcceptedByOthers = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await AccountRequestModel.find({ requesterId: userId, status: "accepted" })
      .populate({
        path: "receiverId",
        select: "id _id firstName lastName dateOfBirth height religion caste occupation annualIncome highestEducation currentCity city state motherTongue gender profileImage updatedAt createdAt designation",
      })
      .sort({ createdAt: -1 });

    const formatted = requests.map(r => ({
      requestId: r._id,
      status: r.status,
      createdAt: r.createdAt,
      user: r.receiverId,
      acceptedBy: "other",
    }));

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get deleted requests
export const getDeletedRequests = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await AccountRequestModel.find({
      $or: [{ requesterId: userId }, { receiverId: userId }],
      status: "deleted",
    })
      .populate({
        path: "requesterId receiverId",
        select: "id _id firstName lastName profileImage dateOfBirth caste designation",
      })
      .sort({ createdAt: -1 });

    const formatted = requests.map(r => {
      const otherUser = r.requesterId._id.toString() === userId.toString() ? r.receiverId : r.requesterId;
      return {
        requestId: r._id,
        status: r.status,
        createdAt: r.createdAt,
        user: {
          _id: otherUser._id,
          id: otherUser.id,
          name: `${otherUser.firstName} ${otherUser.lastName}`,
          profileImage: otherUser.profileImage,
          caste: otherUser.caste,
          designation: otherUser.designation,
        },
      };
    });

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
