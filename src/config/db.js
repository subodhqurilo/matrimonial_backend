import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://Qurilo:root%401234@admin.dosckv6.mongodb.net/matrimony", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        });
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1); // Exit the process with failure
    }
    }
export default connectDB;