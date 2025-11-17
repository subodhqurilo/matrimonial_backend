import mongoose from 'mongoose';

const registerSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  mobile: { type: String, unique: true, sparse: true },
email: { type: String,  },
id: {
  type: String,
  required: true,
  unique: true
}
,
  // password: { type: String },

  middleName: { type: String },

  isMobileVerified: { type: Boolean, default: false },
  adminApprovel: {
  type: String,
  default: 'pending',
  enum: ['approved', 'pending', 'reject']
},


  mobileOTP: { type: String },
colorComplex: { type: String },
  profileImage: { type: String },

  profileFor: { type: String },
 
  dateOfBirth: { type: Date },
gender: {
  type: String,
  enum: ['Male', 'Female'],
  set: (v) => {
    if (!v) return v;
    const clean = v.trim().toLowerCase();
    if (clean === "male") return "Male";
    if (clean === "female") return "Female";
    return v;
  }
},

personalFirstName:{type:String},
personalLastName:{type:String},
personalMiddleName:{type:String},
  religion: { type: String },
  zodiacSign:{type:String},
  willingToMarryOtherCaste: { type: Boolean },
  caste: { type: String },
  community: { type: String },
  gotra: { type: String },
  motherTongue: { type: String },
  currentCity:{ type: String },
  currentState:{ type: String },
  maritalStatus: { type: String },
  numberOfChildren: { type: Number },
  isChildrenLivingWithYou: { type: Boolean },
  height: { type: String },
  diet: { type: String },
  familyType: { type: String, enum: ["Joint", "Nuclear", "joint", "nuclear"] },
  familyStatus: { type: String },
  // familyIncome: { type: String },
  anyDisability: { type: Boolean },
  complexion:{type:String},
  city: { type: String },
  state: { type: String },
country:{type:String},
  highestEducation: { type: String },
  employedIn: { type: String },
  annualIncome: { type: String },
  workLocation: {
    city: { type: String },
    state: { type: String },
  },
  designation: { type: String },
    verification: { type: String },
    verificationType: { type: String, enum: ['Pan Card', 'Driving License', 'Voter ID'] },
weight:{type:Number},


      // 🔮 Astro Details
  manglik: { type: String, enum: ['Yes', 'No', 'Don’t Know'] },
  timeOfBirth: { type: String },
  cityOfBirth: { type: String },

horoscope: {
  rashi: { type: String }, // simha rashi (non manglik)
  nakshatra: { type: String }, // purvaphalguni nakshatra
  matchRequired: { type: String }, // Horoscope match is not necessary
},

    // 👨‍👩‍👧 Family Details
  fatherOccupation: { type: String },
  motherOccupation: { type: String },
  brother: { type: Number },
  sister: { type: Number },
  familyBasedOutOf: { type: String },

    // 🎓 Extra Education
  postGraduation: { type: String },
  underGraduation: { type: String },
  school: { type: String },



  // 🌿 Lifestyle & Interests
  ownHouse: { type: Boolean },
  ownCar: { type: Boolean },
  smoking: { type: String, enum: ['Yes', 'No', 'Occasionally'] },
  drinking: { type: String, enum: ['Yes', 'No', 'Occasionally'] },
  openToPets: { type: Boolean },
  foodICook: [{ type: String }],
  hobbies: [{ type: String }],
  interests: [{ type: String }],
  favoriteMusic: [{ type: String }],
  sports: [{ type: String }],
  cuisine: [{ type: String }],
  movies: [{ type: String }],
  tvShows: [{ type: String }],
  vacationDestination: [{ type: String }],

    // 🧬 Culture
  gothra: { type: String },


healthInformation: { type: String },
aboutYourself: { type: String },
casteNoBar: { type: Boolean },
familyIncome: { type: String },
familyBackground: { type: String },
schoolStream: { type: String },
company: { type: String },

adhaarCard:{
  frontImage:String,
  backImage:String,
  isVerified: { type: Boolean, default: false }
},
zodiacSign:{type:String},
status:{
  type:Boolean,
  default:false
}

}, { timestamps: true });

const RegisterModel = mongoose.model('Register', registerSchema);
export default RegisterModel;
