import axios from "axios";

export const sendExpoPush = async (token, title, message) => {
  try {
    await axios.post("https://exp.host/--/api/v2/push/send", {
      to: token,
      sound: "default",
      title: title,
      body: message,
    }, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.log("Expo Push Error:", error.response?.data || error.message);
  }
};
