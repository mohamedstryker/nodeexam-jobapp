import { EventEmitter } from 'events';
import { customAlphabet } from 'nanoid';
import { hashing } from '../encryption/hashing.js';
import { sendMail } from '../../service/index.js';
import { userModel } from '../../DB/models/user.model.js';
import { signToken } from '../tokens/signToken.js';
import { applicationModel, enumApplicationStatus } from '../../DB/models/application.model.js';
import { jobModel } from '../../DB/models/job.model.js';

export const eventEmitter = new EventEmitter();

eventEmitter.on("otpGenerator", async ({ email, type }) => {
    const otp = customAlphabet('1234567890', 6)();
    const hashed = await hashing({ key: otp });
    await userModel.updateOne(
        { email },
        { $push: { OTP: [{ code: hashed, type: "confirmEmail", expiresIn: Date.now() + 1000 * 60 * 10 }] } }
    );

    const token = await signToken({ payload: { email }, SECRET_KEY: process.env.SECRET_KEY_JWT });

    const htmlContent = 
    `
    <div style="max-width: 480px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 20px; font-family: Arial, sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.1); text-align: center; border: 1px solid #ddd;">
    <h2 style="color: #333; margin-bottom: 10px;">🔐 Email Verification Code</h2>
    <p style="color: #666; font-size: 16px;">Use the OTP below to verify your email. This code is valid for <strong>10 minutes</strong>.</p>

    <div style="background-color: #f8f8f8; padding: 15px; font-size: 22px; font-weight: bold; color: #333; letter-spacing: 2px; border-radius: 5px; display: inline-block; margin: 15px 0;">
        ${otp}
    </div>

    <p style="color: #666; font-size: 14px;">If you didn’t request this, please ignore this email.</p>

    <a href="http://localhost:3000/auth/resend/${token}" 
        style="display: inline-block; background-color: #007BFF; color: white; text-decoration: none; padding: 12px 20px; font-size: 16px; font-weight: bold; border-radius: 5px; margin-top: 10px;">
        🔄 Resend OTP
    </a>

    <p style="color: #999; font-size: 12px; margin-top: 20px;">Need help? <a href="mailto:support@metwally.com" style="color: #007BFF; text-decoration: none;">Contact Support</a></p>
</div>

    `;

    await sendMail({ email, subject: "Confirm your email", html: htmlContent });
});

eventEmitter.on("newApplication", async ({ jobId, userId }) => {
    try {
        console.log(`New application received for job offer ${jobId} from user ${userId}`);

        const job = await jobModel.findById(jobId).populate("companyId");
        if (!job) return console.error("Job not found!");

        const HRs = job.companyId.HRs;
        const hrUsers = await userModel.find({ _id: { $in: HRs } });

        hrUsers.forEach(async (hr) => {
            await sendEmail({
                to: hr.email,
                subject: "New Job Application Received",
                text: `A new application has been submitted for the position "${job.jobTitle}". Log in to review.`,
            });
        });
    } catch (error) {
        console.error("Error in newApplication event:", error);
    }
});
eventEmitter.on("applicationAccepted", async ({ applicationId }) => {
    console.log("🔄 Checking applicationAccepted event for ID:", applicationId);
    const emailOfUser = await applicationModel.findOne({ _id: applicationId, status: enumApplicationStatus.accepted })
        .populate({ path: "userId", select: "email -_id" });

    if (!emailOfUser || !emailOfUser.userId) {
        console.error("❌ No user found for applicationId:", applicationId);
        return;
    }

    await sendMail({ email: emailOfUser.userId.email, subject: "Application Accepted", html: `<p>Your application has been accepted</p>` });
});

eventEmitter.on("forgetPassword", async ({ email }) => {
    console.log("🔄 Processing forgetPassword event for:", email);
    
    const otp = customAlphabet('1234567890', 6)();
    const hashedOTP = await hashing({ key: otp });

    await userModel.updateOne(
        { email },
        { $push: { OTP: [{ code: hashedOTP, type: "forgetPassword", expiresIn: Date.now() + 1000 * 60 * 10 }] } }
    );

    const htmlContent = `
        <div style="max-width: 480px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 20px; font-family: Arial, sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.1); text-align: center; border: 1px solid #ddd;">
        <h2 style="color: #333; margin-bottom: 10px;">🔑 Reset Your Password</h2>
        <p style="color: #666; font-size: 16px;">Use the OTP below to reset your password. This code is valid for <strong>10 minutes</strong>.</p>

        <div style="background-color: #f8f8f8; padding: 15px; font-size: 22px; font-weight: bold; color: #333; letter-spacing: 2px; border-radius: 5px; display: inline-block; margin: 15px 0;">
            ${otp}
        </div>

        <p style="color: #666; font-size: 14px;">If you didn’t request this, please ignore this email.</p>
    </div>
    `;

    await sendMail({ email, subject: "Reset Your Password", html: htmlContent });
});
