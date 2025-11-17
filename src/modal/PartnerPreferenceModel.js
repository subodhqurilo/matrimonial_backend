import mongoose from 'mongoose';

const partnerPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Register',
    required: true,
    unique: true
  },
  gender: { type: String },
  minAge: { type: String },
  maxAge: { type: String },
  minheight: { type: String },
  maxheight: { type: String },
  minWeight: { type: String },   
  maxWeight: { type: String },    
  state: { type: String },
  city: { type: String },
  maritalStatus: { type: String },
  designation: { type: String },   
  income: { type: String },
  religion: { type: String },
  caste: { type: String },
  community: { type: String },
  gotra: { type: String },        
  highestEducation: { type: String }, 
  // motherTongue: { type: String }
}, { timestamps: true });

const PartnerPreferenceModel = mongoose.model('PartnerPreference', partnerPreferenceSchema);

export default PartnerPreferenceModel;
