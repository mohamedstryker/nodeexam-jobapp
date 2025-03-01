import nodemailer from "nodemailer";

export const sendMail = async ({ email, subject, html }) => {
    try {
        console.log("📩 Sending email to:", email);
        console.log("📄 Email content:", html);

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.SENDER_EMAIL,
                pass: process.env.SEBDER_EMAIL_PASSWORD // ✅ تأكد من أن هذه القيم صحيحة
            }
        });

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject,
            text: html.replace(/<[^>]+>/g, ''), // ✅ إزالة الـ HTML لضمان عدم تجاهله من Gmail
            html
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Email sent successfully:", info.response);
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};
