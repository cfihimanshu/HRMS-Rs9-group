export async function sendEmail({ to, subject, html }: { to: string | string[], subject: string, html: string }) {
  try {
    if (typeof window !== "undefined") {
      console.warn("sendEmail called on client side - skipping");
      return { success: false, error: "Client side execution skipped" };
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn("SMTP_USER or SMTP_PASSWORD is not set. Email not sent to:", to);
      return { success: false, error: "SMTP not configured" };
    }

    const nodemailer = (await import("nodemailer")).default;

    const port = Number(process.env.SMTP_PORT) || 465;
    const isSecure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === "true" : port === 465;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: isSecure, // true for 465, false for 587 or STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const recipient = Array.isArray(to) ? to.join(",") : to;
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipient,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}
