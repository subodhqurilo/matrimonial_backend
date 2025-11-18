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



export const requestAccount = async (req, res) => {
  const requesterId = req.userId; 
  const { receiverId } = req.body;

  if (!requesterId || !receiverId) {
    return res.status(400).json({ message: 'Both requester and receiver are required' });
  }

  if (requesterId.toString() === receiverId.toString()) {
    return res.status(400).json({ message: 'Cannot send request to yourself' });
  }

  try {
    const existingRequest = await AccountRequestModel.findOne({
      requesterId,
      receiverId,
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Request already exists' });
    }

  
    const request = new AccountRequestModel({
      userId: requesterId, // optional if userId used for other tracking
      requesterId,
      receiverId,
    });

    await request.save();

    res.status(201).json({
      success: true,
      message: 'Request sent successfully',
      request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};


export const updateAccountRequestStatus = async (req, res) => {
  const userId = req.userId; // should be receiver
  const { requestId, status } = req.body;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const request = await AccountRequestModel.findOne({
      _id: requestId,
      receiverId: userId,
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found or unauthorized' });
    }

    request.status = status;
    await request.save();

    res.status(200).json({ success: true, message: `Request ${status}`, request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};






export const getReceivedRequests = async (req, res) => {
  const userId = req.userId;

  try {
    // Find all requests received by the logged-in user
    const requests = await AccountRequestModel.find({ receiverId: userId })
      .populate({
        path: 'requesterId',
        select: `
          id _id firstName lastName dateOfBirth height religion caste occupation
          annualIncome highestEducation currentCity city state currentState motherTongue
          gender profileImage updatedAt createdAt designation
        `,
      })
      .sort({ createdAt: -1 });

    // Format response
    const data = requests.flatMap(req => {
      const user = req.requesterId;
      if (!user) return []; // Skip if user deleted

      return {
        id: user.id,
        _id: user._id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),

        age: calculateAge(user.dateOfBirth),

        height: user.height || null,
        caste: user.caste || null,
        designation: user.designation || user.occupation || null,
        religion: user.religion || null,

        salary: user.annualIncome || null,
        education: user.highestEducation || null,

        // Best location handling
        location:
          (user.city || user.currentCity || '') +
          (user.state || user.currentState ? `, ${user.state || user.currentState}` : ''),

        // Language conversion
        languages: Array.isArray(user.motherTongue)
          ? user.motherTongue.join(', ')
          : user.motherTongue || null,

        gender: user.gender || null,
        profileImage: user.profileImage || null,

        lastSeen: user.updatedAt || user.createdAt,
        requestStatus: req.status,
        requestId: req._id,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ Error in getReceivedRequests:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};







export const getReceivedRequestsByStatus = async (req, res) => {
  const userId = req.userId;
  const { status } = req.query;

  const validStatuses = ['pending', 'accepted', 'rejected'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status filter' });
  }

  try {
    const filter = { receiverId: userId };
    if (status) {
      filter.status = status;
    }

    const requests = await AccountRequestModel.find(filter)
      .populate({
        path: 'requesterId',
        select: `
          firstName lastName phoneNumber profileImage 
          partnerPreference.setAssProfileImage height caste designation 
          annualIncome currentCity motherTongue highestEducation dateOfBirth id
        `
      })
      .sort({ createdAt: -1 });

    // Format response
    const formatted = requests.map((request) => {
      const user = request.requesterId;
      return {
        requestId: request._id,
        status: request.status,
        createdAt: request.createdAt,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          id: user.id,
          height: user.height,
          caste: user.caste,
          designation: user.designation,
          annualIncome: user.annualIncome,
          currentCity: user.currentCity,
          motherTongue: user.motherTongue,
          highestEducation: user.highestEducation,
          profileImage: user.profileImage || user?.partnerPreference?.setAssProfileImage || null,
          dateOfBirth: user.dateOfBirth,
        }
      };
    });

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    console.error('Error in getReceivedRequestsByStatus:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};




export const getSentRequests = async (req, res) => {
  const userId = req.userId;
  console.log("User ID:", userId);
  try {
    const requests = await AccountRequestModel.find({ requesterId: userId })
      .populate({
        path: 'receiverId',
        select: `
          id _id firstName lastName dateOfBirth height religion caste occupation
          annualIncome highestEducation currentCity city state currentState motherTongue
          gender profileImage updatedAt createdAt designation
        `
      })
      .sort({ createdAt: -1 });

    const formatted = requests.map((req) => ({
      requestId: req._id,
      status: req.status,
      createdAt: req.createdAt,
      user: req.receiverId
    }));

    res.status(200).json({ success: true, requests: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};




export const getRejectedRequests = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await AccountRequestModel.find({
      receiverId: userId,
      status: 'rejected',
    })
      .populate({
        path: 'requesterId',
        select: `
          id _id firstName lastName dateOfBirth height religion caste occupation
          annualIncome highestEducation currentCity city state currentState motherTongue
          gender profileImage updatedAt createdAt designation
        `
      })
      .sort({ createdAt: -1 });

    const formatted = requests.map((request) => ({
      requestId: request._id,
      status: request.status,
      createdAt: request.createdAt,
      user: request.requesterId
    }));

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    console.error('Error fetching rejected requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteAccountRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ success: false, message: "RequestId required" });

    // Delete logic here, e.g., MongoDB
    await AccountRequestModel.findByIdAndDelete(requestId);

    return res.json({ success: true, message: "Request deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};




export const getRequestsAcceptedByMe = async (req, res) => {
  const userId = req.userId;
  console.log("User ID:", userId);

  try {
    const requests = await AccountRequestModel.find({
      receiverId: userId,
      status: 'accepted',
    }).populate({
      path: 'requesterId',
      select: `
        id _id firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `,
    }).sort({ createdAt: -1 });

    const formatted = requests.map((request) => ({
      requestId: request._id,
      status: request.status,
      createdAt: request.createdAt,
      user: request.requesterId,
      acceptedBy: 'me'
    }));

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    console.error('Error fetching accepted requests by me:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


export const getRequestsAcceptedByOthers = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await AccountRequestModel.find({
      requesterId: userId,
      status: 'accepted',
    }).populate({
      path: 'receiverId',
      select: `
        id _id firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `,
    }).sort({ createdAt: -1 });

    const formatted = requests.map((request) => ({
      requestId: request._id,
      status: request.status,
      createdAt: request.createdAt,
      user: request.receiverId,
      acceptedBy: 'other'
    }));

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    console.error('Error fetching accepted requests by others:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
