import SibApiV3Sdk from "sib-api-v3-sdk";

export const sendEmailOTP = async (email, otp) => {
  try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;

    // ✔ Correct API Key
    defaultClient.authentications["api-key"].apiKey =
      process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = {
      // ✔ Replace with VERIFIED sender email
      sender: { 
        name: "VarVadhu",
        email: "subodh.qurilo@gmail.com" 
      },

      to: [{ email }],
      subject: "Your OTP Code",
      htmlContent: `<p>Your OTP is <b>${otp}</b></p>`,
    };

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    return { success: true, data: result };
  } catch (error) {
    console.log("❌ Brevo Error:", error.response?.body || error);
    return { success: false, error };
  }
};
