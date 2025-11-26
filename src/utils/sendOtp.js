import axios from "axios";

// ------------------------
// 🔹 Generate 4-digit OTP
// ------------------------
export const generateOTP = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

// ------------------------
// 🔹 Send OTP via Autobysms
// ------------------------
export const sendOtpToPhone = async (phone, otp) => {
  
  // If you want to use .env later, uncomment these:
  // const { AUTOBYSMS_API_KEY, AUTOBYSMS_SENDER_ID, AUTOBYSMS_TEMPLATE_ID } = process.env;

  const IS_DEV = process.env.NODE_ENV !== "production";

  // ---------------------------------------
  // 🧪 DEV MODE → Do not send real SMS
  // ---------------------------------------
  if (IS_DEV) {
    console.log(`🔹 [DEV MODE] OTP for ${phone}: ${otp}`);
    return true;
  }

  try {
    // Encode message properly
    const message = encodeURIComponent(`Your OTP is ${otp} SELECTIAL`);

    // ---------------------------------------
    // ⭐ Your exact URL integrated here
    // ---------------------------------------
    const apiUrl = `https://sms.autobysms.com/app/smsapi/index.php?key=45FA150E7D83D8&campaign=0&routeid=9&type=text&contacts=${phone}&senderid=SMSSPT&msg=${message}&template_id=1707166619134631839`;

    console.log("📤 Sending OTP via Autobysms:", apiUrl);

    // Call SMS API
    const response = await axios.get(apiUrl);

    console.log("📩 Autobysms API Response:", response.data);

    // ------------------------
    // ✔️ Success handling
    // ------------------------
    if (
      response.data?.status === "OK" ||
      response.data?.type === "SUCCESS" ||
      (typeof response.data === "string" && response.data.includes("OK"))
    ) {
      console.log(`✅ OTP successfully sent to ${phone}`);
      return true;
    }

    // If API returns something unexpected
    throw new Error("SMS failed: " + JSON.stringify(response.data));

  } catch (error) {
    console.error("❌ OTP sending error:", error.message);

    if (error.response) {
      console.error("❌ API Error:", error.response.data);
    }

    return false;
  }
};
