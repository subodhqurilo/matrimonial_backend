import ProfileForModel from '../modal/registerFormModal.js/ProfileForModel.js';
import ReligionModel from '../modal/registerFormModal.js/ReligionModel.js';
import CommunitiesModel from '../modal/registerFormModal.js/CommunitiesModel.js';
import DietModel from '../modal/registerFormModal.js/DietModel.js';
import ColorModel from '../modal/registerFormModal.js/ColorModel.js';
import CasteModel from '../modal/registerFormModal.js/CasteModel.js';
import MaritalStatusModel from '../modal/registerFormModal.js/MaritalStatusModel.js';
import MotherTongueModel from '../modal/registerFormModal.js/MotherTongueModel.js';

import FamilyStatusModel from '../modal/registerFormModal.js/FamilyStatusModel.js';
import CityModel from '../modal/registerFormModal.js/CityModel.js';
import EducationModel from '../modal/registerFormModal.js/EducationModel.js';
import EmployedInModel from '../modal/registerFormModal.js/EmployedInModel.js';
import DesignationModel from '../modal/registerFormModal.js/DesignationModel.js';
import StateModel from '../modal/registerFormModal.js/StateModel.js';

const generateHandlers = (Model) => ({
  add: async (req, res) => {
    try {
      const { value, state } = req.body;

      // Case-insensitive check for duplicate
      const query = {
        value: { $regex: `^${value}$`, $options: 'i' },
      };

      // If model is City, match both value and state
      if (Model.modelName === 'City') {
        query.state = state;
      }

      const existing = await Model.findOne(query);

      if (existing) {
        return res.status(400).json({ message: 'This value already exists.' });
      }

      const item = new Model(req.body);
      await item.save();
      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  get: async (req, res) => {
    try {
      const items = await Model.find();
      res.status(200).json(items);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await Model.findByIdAndUpdate(id, req.body, { new: true });
      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      await Model.findByIdAndDelete(id);
      res.status(200).json({ message: 'Deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
});


export const getAllField = async (req, res) => {
  try {
    const [
      profileFor, religion, communities, diet, color, caste,
      maritalStatus, motherTongue, familyStatus, state, city,
      education, employedIn, designation
    ] = await Promise.all([
      ProfileForModel.find({}),
      ReligionModel.find({}),
      CommunitiesModel.find({}),
      DietModel.find({}),
      ColorModel.find({}),
      CasteModel.find({}),
      MaritalStatusModel.find({}),
      MotherTongueModel.find({}),
      FamilyStatusModel.find({}),
      StateModel.find({}),
      CityModel.find({}),
      EducationModel.find({}),
      EmployedInModel.find({}),
      DesignationModel.find({})
    ]);

    res.status(200).json({
      profileFor, religion, communities, diet, color, caste,
      maritalStatus, motherTongue, familyStatus, state, city,
      education, employedIn, designation
    });
  } catch (error) {
    console.error('Error fetching master fields:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Export handlers
export const profileFor = generateHandlers(ProfileForModel);
export const religion = generateHandlers(ReligionModel);
export const caste = generateHandlers(CasteModel);
export const communities = generateHandlers(CommunitiesModel);
export const diet = generateHandlers(DietModel);
export const color = generateHandlers(ColorModel);
export const maritalStatus = generateHandlers(MaritalStatusModel);
export const motherTongue = generateHandlers(MotherTongueModel);
export const familyStatus = generateHandlers(FamilyStatusModel);
export const state = generateHandlers(StateModel);
export const city = generateHandlers(CityModel);
export const education = generateHandlers(EducationModel);
export const employedIn = generateHandlers(EmployedInModel);
export const designation = generateHandlers(DesignationModel);

export const getCitiesByState = async (req, res) => {
  try {
    const { state } = req.query;
    console.log(state)
    const cities = await CityModel.find({ state });
    res.status(200).json(cities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
