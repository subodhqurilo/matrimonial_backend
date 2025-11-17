import RegisterModel from "../modal/register.js";


export const getMutualMatches = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID missing',
      });
    }

    const currentUser = await RegisterModel.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const {
      hobbies = [],
      interests = [],
      favoriteMusic = [],
      sports = [],
      cuisine = [],
      movies = [],
      tvShows = [],
      vacationDestination = [],
    } = currentUser;

    const mutualMatches = await RegisterModel.find({
      _id: { $ne: userId },
      $or: [
        { hobbies: { $in: hobbies } },
        { interests: { $in: interests } },
        { favoriteMusic: { $in: favoriteMusic } },
        { sports: { $in: sports } },
        { cuisine: { $in: cuisine } },
        { movies: { $in: movies } },
        { tvShows: { $in: tvShows } },
        { vacationDestination: { $in: vacationDestination } },
      ],
    }).select(`
      id firstName lastName dateOfBirth height religion caste company as occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation
    `);

    res.status(200).json({
      success: true,
      count: mutualMatches.length,
      message: 'Mutual matches fetched successfully',
      mutualMatches: mutualMatches,
    });

  } catch (error) {
    console.error('[Mutual Matches Error]', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
