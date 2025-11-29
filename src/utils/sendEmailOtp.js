import SibApiV3Sdk from "sib-api-v3-sdk";

export const sendEmailOTP = async (email, otp) => {
  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    const apiKey = client.authentications["api-key"];

    apiKey.apiKey = process.env.BREVO_API_KEY; // USE API v3 KEY (xkeysib-)

    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
      name: "VM Matrimony",
      email: "your_verified_email@domain.com", // Brevo verified email
    };

    const receivers = [{ email }];

    const response = await tranEmailApi.sendTransacEmail({
      sender,
      to: receivers,
      subject: "Your OTP Code",
      htmlContent: `
        <h2>Your OTP: ${otp}</h2>
        <p>Valid for 10 minutes</p>
      `,
    });

    console.log("📧 Email Sent Successfully:", response);
    return { success: true };
  } catch (error) {
    console.error("❌ Brevo Send Error:", error);
    return { success: false, error: error.message };
  }
};
