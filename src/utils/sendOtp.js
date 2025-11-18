import axios from "axios";

export const generateOTP = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

export const sendOtpToPhone = async (phone, otp) => {
  const { AUTOBYSMS_API_KEY, AUTOBYSMS_SENDER_ID, AUTOBYSMS_TEMPLATE_ID } =
    process.env;

  const IS_DEV = process.env.NODE_ENV !== "production";

  if (IS_DEV) {
    console.log(`🔹 [DEV MODE] OTP for ${phone}: ${otp}`);
    return true;
  }

  try {
    const message = encodeURIComponent(`Your OTP is ${otp} SELECTIAL`);

    const apiUrl = `https://sms.autobysms.com/app/smsapi/index.php?key=${AUTOBYSMS_API_KEY}&campaign=0&routeid=9&type=text&contacts=${phone}&senderid=${AUTOBYSMS_SENDER_ID}&msg=${message}&template_id=${AUTOBYSMS_TEMPLATE_ID}`;

    console.log("📤 Sending OTP via Autobysms:", apiUrl);

    const response = await axios.get(apiUrl);

    console.log("📩 Autobysms API Response:", response.data);

    if (
      response.data?.status === "OK" ||
      response.data?.type === "SUCCESS" ||
      (typeof response.data === "string" && response.data.includes("OK"))
    ) {
      console.log(`✅ OTP successfully sent to ${phone}`);
      return true;
    } else {
      throw new Error("SMS failed: " + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error("❌ OTP sending error:", error.message);
    if (error.response) {
      console.error("❌ API Error:", error.response.data);
    }
    return false;
  }
};
