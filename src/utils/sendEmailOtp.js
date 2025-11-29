import nodemailer from "nodemailer";

export const sendEmailOTP = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // app password
      },
    });

    const info = await transporter.sendMail({
      from: `ViaFarm <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your ViaFarm OTP",
      html: `
        <div style="font-family:Arial;">
          <h2>Your OTP</h2>
          <p>Your OTP is <b>${otp}</b></p>
          <p>Valid for 5 minutes.</p>
        </div>
      `,
    });

    console.log("OTP Email sent:", info.messageId);
    return true;

  } catch (error) {
    console.error("Email send failed:", error);
    return false;
  }
};
