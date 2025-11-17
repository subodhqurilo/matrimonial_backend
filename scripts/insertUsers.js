// scripts/insertUsers.js
import connectDB from "../src/db.js"; // path adjust karo agar zaroorat ho
import User from "../src/models/User.js";

const insertUsers = async () => {
  await connectDB(); // MongoDB se connect

  const users = [
    { firstName: "Subodh", lastName: "Kumar", email: "subodh@example.com", password: "123456", profileImage: "/default-avatar.png" },
    { firstName: "Rahul", lastName: "Sharma", email: "rahul@example.com", password: "123456", profileImage: "/default-avatar.png" },
    { firstName: "Anjali", lastName: "Verma", email: "anjali@example.com", password: "123456", profileImage: "/default-avatar.png" },
  ];

  try {
    await User.insertMany(users);
    console.log("✅ Users inserted successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error inserting users:", err);
    process.exit(1);
  }
};

insertUsers();
