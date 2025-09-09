// utils/sendOtp.js
import axios from "axios";

/**
 * Generate a random 4-digit OTP
 */
export const generateOTP = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

/**
 * Send OTP via Autobysms API or log it in development
 * @param {string} mobile - User's phone number
 * @param {string} otp - OTP to send
 * @returns {boolean} true if sent/logged successfully
 */
export const sendOtpToPhone = async (mobile, otp) => {
  const IS_DEV = process.env.NODE_ENV !== "production";

  if (IS_DEV) {
    // 🔹 Development mode: just log OTP
    console.log(`🔹 [DEV] OTP for ${mobile}: ${otp}`);
    return true;
  }

  try {
    const message = encodeURIComponent(`Your OTP is ${otp} SELECTIAL`);

    // ✅ Autobysms API URL (update with your actual API key, sender ID, template ID)
    const apiUrl = `https://sms.autobysms.com/app/smsapi/index.php?key=YOUR_API_KEY&campaign=0&routeid=9&type=text&contacts=${mobile}&senderid=SMSSPT&msg=${message}&template_id=YOUR_TEMPLATE_ID`;

    const response = await axios.get(apiUrl);

    console.log("📩 SMS API Raw Response:", response.data);

    // ✅ Check if SMS was successfully sent
    if (
      response.data?.status === "OK" ||
      response.data?.type === "SUCCESS" ||
      (typeof response.data === "string" && response.data.includes("OK"))
    ) {
      console.log(`✅ OTP sent successfully to ${mobile}`);
      return true;
    } else {
      throw new Error("SMS sending failed: " + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error("❌ OTP sending error:", error.message);
    if (error.response) {
      console.error("API Error Response:", error.response.data);
    }
    return false; // prevent crashing the app
  }
};
