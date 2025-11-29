import axios from "axios";

export const sendEmailOTP = async (email, otp) => {
  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from: "ViaFarm <onboarding@resend.dev>",
        to: email,
        subject: "Your OTP Code",
        html: `<h2>Your OTP: ${otp}</h2>`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return true;
  } catch (error) {
    console.log("Resend Error:", error.response?.data);
    return false;
  }
};
