import { enumProvider, userModel,enumRole } from "../../DB/models/user.model.js";
import { findUser , eventEmitter,compare,verifyToken,signToken,hashing } from "../../utils/index.js";
import { decodedToken } from "../../middlewares/auth.js";
import { tokensType } from "../../middlewares/auth.js";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


  export const signUp = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, mobileNumber, gender, DOB } = req.body;

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }
        const user = await userModel.create({
            firstName,
            lastName,
            email,
            password,
            mobileNumber,
            gender,
            DOB,
            provider: enumProvider.system,
        });

        eventEmitter.emit("otpGenerator", { email });

        return res.status(201).json({ message: "User registered successfully. Please check your email for OTP." });
    } catch (error) {
        next(error);
    }
};

export const confirmEmail = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        const user = await userModel.findOne({ email, isVerified: false });

        if (!user) {
            return next(new Error("User not found or already confirmed", { cause: 404 }));
        }

        const findConfirmOtp = user.OTP.find(item => item.type === "confirmEmail");

        if (!findConfirmOtp) {
            return next(new Error("OTP not found", { cause: 400 }));
        }
        if (new Date(findConfirmOtp.expiresIn).getTime() < Date.now()) {
            return next(new Error("OTP expired", { cause: 400 }));
        }
        const isMatch = await compare({ key: otp, hash: findConfirmOtp.code });

        if (!isMatch) {
            return next(new Error("Invalid OTP", { cause: 400 }));
        }
        await userModel.updateOne(
            { email },
            { 
                $set: { isVerified: true }, 
                $pull: { OTP: { code: findConfirmOtp.code } } 
            }
        );

        return res.status(200).json({ msg: "Congrats! Your email has been confirmed" });

    } catch (error) {
        next(error);
    }
};

export const forgotOTP = async (req, res, next) => {

    const { token } = req.params;

    const decoded = await verifyToken({ token, SECRET_KEY: process.env.SECRET_KEY_JWT });

    if (!decoded.email)
    {
        return next(new Error("Your Token is Invaild", { cause: 400 }));
    }
    const user = await findUser({ payload: { email: decoded.email } });
    
    if (!user){
        return next(new Error("user not found", { cause: 404 }));
    }
        
    if (user.OTP.length > 0){
        await userModel.updateOne({ email: decoded.email }, { $unset: { OTP: "" } });
    }

    if(user.OTP[0].type == "forgetPassword")
        eventEmitter.emit("forgetPassword", { email: decoded.email });
    
    else if(user.OTP[0].type == "confirmEmail")
        eventEmitter.emit("otpGenerator", { email: decoded.email });
    
    return res.status(200).json({ msg: "OTP Has been resended to your email address successfully , Please check your email" });
}



export const singIn = async (req, res, next) => {

    const { email , password} = req.body;
    
    let user = await findUser({ payload: { email, isDeleted: false, isVerified: true, provider: enumProvider.system , bannedAt: null } });
    
    if (!user)
        return next(new Error("user not found", { cause: 404 }));

        if (!user.password) {
            return next(new Error("Invalid user data", { cause: 500 }));
        }

        const isPasswordValid = await compare({ key: password, hash: user.password });
        if (!isPasswordValid) {
            return next(new Error("Invalid password", { cause: 400 }));
        }

    let access_key= undefined;
    let refresh_key = undefined;

    if (user.role == enumRole.user) {

        access_key = process.env.SECRET_KEY_JWT_ACCESS_USER;
        refresh_key = process.env.SECRET_KEY_JWT_REFRESH_USER;

    } else if (user.role == enumRole.admin) {

        access_key = process.env.SECRET_KEY_JWT_ACCESS_ADMIN;
        refresh_key = process.env.SECRET_KEY_JWT_REFRESH_ADMIN;

    }
    else{
        return next(new Error("Invalid user role", { cause: 400 }));
    }

    const access_token = await signToken(
        { 
            payload: { email, id: user._id },
            SECRET_KEY: access_key,expire:"1h"
        });
    const refresh_token = await signToken({ 
        payload: { email, id: user._id }, 
        SECRET_KEY: refresh_key, expire: "7d" 
    });

    return res.status(200).json({ msg: "You are logged in successfully", access_token, refresh_token });
}

export const loginGmail = async (req, res, next) => {
    const { idToken } = req.body;
        const client = new OAuth2Client(process.env.CLIENT_ID);
        if (!process.env.CLIENT_ID) {
            throw new Error("Missing Google CLIENT_ID in environment variables");
        }
        async function verify() {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.CLIENT_ID
            });

            return ticket.getPayload();
        }
        const payload = await verify();

        if (!payload) {
            return next(new Error("Invalid Google token", { cause: 400 }));
        }
        const { email, name, picture, email_verified } = payload;
        console.log("🔍 Google Login Payload:", payload);

        if (!email_verified) {
            return next(new Error("Your Google email is not verified", { cause: 400 }));
        }

        const [firstName, lastName] = name.split(" ");

        let user = await findUser({ payload: { email } });

        if (!user) {
            user = await userModel.create({
                firstName,
                lastName,
                email,
                isVerified: true,
                role: enumRole.user,
                provider: enumProvider.google,
                image: picture
            });
        }
        if (user.provider !== enumProvider.google) {
            return next(new Error("You must log in with your registered method", { cause: 400 }));
        }
        let access_key;
        if (user.role === enumRole.user) {
            access_key = process.env.SECRET_KEY_JWT_ACCESS_USER;
        } else if (user.role === enumRole.admin) {
            access_key = process.env.SECRET_KEY_JWT_ACCESS_ADMIN;
        } else {
            return next(new Error("Invalid user role", { cause: 400 }));
        }
        const access_token = await signToken({
            payload: { email, id: user._id },
            SECRET_KEY: access_key,
            expire: "1d"
        });
        return res.status(200).json({ msg: "Successfully Logged in via Google", token: access_token });
    }
    export const forgetPassword = async (req, res, next) => {
        try {
            const { email } = req.body;
    
            const user = await userModel.findOne({ email });
            if (!user) return next(new Error("User not found", { cause: 404 }));
    
            eventEmitter.emit("forgetPassword", { email });
    
            return res.status(200).json({ msg: "OTP has been sent to your email" });
    
        } catch (error) {
            next(error);
        }
    };
    
export const resetPassword = async (req, res, next) => {
    const { email, otp, newPassword } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) return next(new Error("User not found", { cause: 404 }));

    const otpRecord = user.OTP.find(item => item.type === "forgetPassword");
    if (!otpRecord) return next(new Error("OTP not found or expired", { cause: 400 }));

    if (new Date(otpRecord.expiresIn).getTime() < Date.now()) {
        return next(new Error("OTP expired", { cause: 400 }));
    }

    const isMatch = await compare({ key: otp, hash: otpRecord.code });
    if (!isMatch) return next(new Error("Invalid OTP", { cause: 400 }));

    const hashedPassword = await hashing({ key: newPassword });

    await userModel.updateOne(
        { email },
        { 
            $set: { password: hashedPassword },
            $pull: { OTP: { code: otpRecord.code } }
        }
    );

    return res.status(200).json({ msg: "Password has been reset successfully" });

} 

export const refreshToken = async (req, res, next) => {
    try {
        const { authorization } = req.headers;
        const decoded = await decodedToken({ authorization, tokenType: tokensType.refresh, next });

        if (!decoded) {
            return next(new Error("User not found, check your info", { cause: 404 }));
        }
        const user = await userModel.findById(decoded.id);

        if (!user || user.isDeleted) {
            return next(new Error("User not found or deleted", { cause: 404 }));
        }

        let access_key;
        if (user.role === enumRole.user) {
            access_key = process.env.SECRET_KEY_JWT_ACCESS_USER;
        } else if (user.role === enumRole.admin) {
            access_key = process.env.SECRET_KEY_JWT_ACCESS_ADMIN;
        } else {
            return next(new Error("Invalid user role", { cause: 400 }));
        }

        const access_token = await signToken({
            payload: { email: user.email, id: user._id },
            SECRET_KEY: access_key,
            expire: "1h"
        });

        return res.status(200).json({ msg: "Token has been successfully refreshed", access_token });

    } catch (error) {
        return next(error);
    }
};