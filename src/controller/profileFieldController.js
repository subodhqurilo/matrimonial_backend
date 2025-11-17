import ProfileFieldModel from "../modal/registerFormModal.js/ProfileForModel";


// Create or update a field with new option
export const addOptionToField = async (req, res) => {
  try {
    const { title, option } = req.body;

    let field = await ProfileFieldModel.findOne({ title });

    if (!field) {
      field = new ProfileFieldModel({ title, options: [option] });
    } else if (!field.options.includes(option)) {
      field.options.push(option);
    }

    await field.save();
    res.status(200).json(field);
  } catch (error) {
    res.status(500).json({ message: "Error updating field", error });
  }
};

// Get all profile fields
export const getAllFields = async (req, res) => {
  try {
    const fields = await ProfileFieldModel.find();
    res.status(200).json(fields);
  } catch (error) {
    res.status(500).json({ message: "Error fetching fields", error });
  }
};

// Delete option from field
export const deleteOption = async (req, res) => {
  try {
    const { title, option } = req.body;

    const field = await ProfileFieldModel.findOne({ title });
    if (!field) return res.status(404).json({ message: "Field not found" });

    field.options = field.options.filter((opt) => opt !== option);
    await field.save();

    res.status(200).json(field);
  } catch (error) {
    res.status(500).json({ message: "Error deleting option", error });
  }
};
