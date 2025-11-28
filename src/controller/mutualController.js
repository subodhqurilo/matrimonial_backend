import RegisterModel from "../modal/register.js";


export const getMutualMatches = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID missing",
      });
    }

    const currentUser = await RegisterModel.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Extract arrays safely
    const {
      hobbies = [],
      interests = [],
      favoriteMusic = [],
      sports = [],
      cuisine = [],
      movies = [],
      tvShows = [],
      vacationDestination = [],
      gender,
    } = currentUser;

    // Build dynamic filters
    const interestFilters = [];

    if (hobbies.length) interestFilters.push({ hobbies: { $in: hobbies } });
    if (interests.length) interestFilters.push({ interests: { $in: interests } });
    if (favoriteMusic.length) interestFilters.push({ favoriteMusic: { $in: favoriteMusic } });
    if (sports.length) interestFilters.push({ sports: { $in: sports } });
    if (cuisine.length) interestFilters.push({ cuisine: { $in: cuisine } });
    if (movies.length) interestFilters.push({ movies: { $in: movies } });
    if (tvShows.length) interestFilters.push({ tvShows: { $in: tvShows } });
    if (vacationDestination.length) interestFilters.push({ vacationDestination: { $in: vacationDestination } });

    // Fetch matches
    const mutualMatches = await RegisterModel.find({
      _id: { $ne: userId },
      gender: gender === "Male" ? "Female" : "Male",
      ...(interestFilters.length > 0 && { $or: interestFilters }),
    }).select(`
      _id id firstName lastName dateOfBirth height religion caste company
      annualIncome highestEducation currentCity state motherTongue
      gender profileImage updatedAt createdAt designation
    `);

    // FIX → Ensure VM ID exists: fallback to _id
    const finalMatches = mutualMatches.map((u) => ({
      ...u._doc,
      id: u.id || u._id.toString(),   // ★ ADD THIS → VM ID FIXED
    }));

    res.status(200).json({
      success: true,
      count: finalMatches.length,
      message: "Mutual matches fetched successfully",
      mutualMatches: finalMatches,
    });

  } catch (error) {
    console.error("[Mutual Matches Error]", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


