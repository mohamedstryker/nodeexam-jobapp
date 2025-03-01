import { userModel } from "../../DB/models/user.model.js";
import { encrypt, decrypt, compare, saveUser } from "../../utils/index.js";
import cloudinary from "../../utils/cloudinary/index.js";

const userData = ({user,decryptedPhone}) => {
    return {
        mobileNumber: decryptedPhone,
        userName: user.fullName,
        profilePic: user.profilePic,
        coverPic: user.coverPic
    }
}



export const updateProfile = async (req, res, next) => {
    if (!req.body)
        return next(new Error("there is no data to update your profile", { cause: 400 }));

    if (!req.user)
        return next(new Error("not logged in", { cause: 401 }));

    if (req.body.mobileNumber !== undefined) {
        req.body.mobileNumber = await encrypt({ key: req.body.mobileNumber, secretKey: process.env.SECRET_KEY });
    }

    const updatedUser = await userModel.findOneAndUpdate({ _id: req.user._id }, req.body, { new: true });

    return res.status(200).json({ message: "updated profile", user: updatedUser });
};




export const getProfile = async (req, res, next) => {

    if (!req.user)
        return next(new Error("not logged in", { cause: 401 }));

    const decryptedPhone = await decrypt({ key: req.user.mobileNumber,secretKey:process.env.SECRET_KEY });

    return res.status(200).json({ message: "Profile Fetched",user:userData({user:req.user,decryptedPhone}) });

}


export const getAnotherProfile = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id || id.length !== 24) {
            return next(new Error("Invalid User ID", { cause: 400 }));
        }
        const user = await userModel.findById(id);
        if (!user) {
            return next(new Error("User not found", { cause: 404 }));
        }

        return res.status(200).json({ 
            msg: "User profile fetched successfully", 
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                mobileNumber: await decrypt({ key: user.mobileNumber, secretKey: process.env.SECRET_KEY }),
                profilePic: user.profilePic,
                coverPic: user.coverPic
            } 
        });

    } catch (error) {
        next(error);
    }
};

export const updatePassword = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new Error("You are not logged in", { cause: 401 }));
        }
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return next(new Error("Boht old and new passwords are required", { cause: 400 }));
        }
        if (oldPassword === newPassword) {
            return next(new Error("New password canot be the same as old password", { cause: 400 }));
        }
        const isMatch = await compare({ key: oldPassword, hash: req.user.password });
        if (!isMatch) {
            return next(new Error("Old password is incorrect", { cause: 400 }));
        }
        req.user.password = await encrypt({ key: newPassword, secretKey: process.env.SECRET_KEY });
        req.user.changeCredentailTime = new Date();

        await req.user.save();
        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        return next(error);
    }
};

export const uploadProfilePic = async (req, res, next) => {
    if (!req.user)
        return next(new Error("you are not logged in", { cause: 401 }));

    if (!req.file)
        return next(new Error("choose picture to upload", { cause: 400 }));

    if (req.user.profilePic?.public_id) {
        await cloudinary.uploader.destroy(req.user.profilePic.public_id);
    }

    const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
        folder: "Job-app/users/profilePic",
        user_filename: true,
        unique_filename: false
    });

    await userModel.updateOne({ _id: req.user._id }, { $set: { profilePic: { secure_url, public_id } } });

    return res.status(200).json({ message: "Profile picture updated successfully" });
};


export const uploadCoverPic = async (req, res, next) => {
    
    if (!req.user)
        return next(new Error("you are not logged in", { cause: 401 }));

    if (!req.file)
        return next(new Error("choose picture to upload", { cause: 400 }));

    const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
        folder: "Job-app/users/coverPic",
        user_filename: true,
        unique_filename: false
    });

    const updated = await userModel.updateOne({ _id: req.user._id }, { $set: { coverPic: { secure_url, public_id } } });

    return res.status(200).json({ message: " Cover picture updated successfully "});
}



export const deleteProfilePic = async (req, res, next) => {
    if (!req.user)
        return next(new Error("you are not logged in", { cause: 401 }));

    if (!req.user.profilePic?.public_id) 
        return next(new Error("No profile picture found to delete", { cause: 400 }));

    const deleted = await cloudinary.uploader.destroy(req.user.profilePic.public_id);

    if (deleted.result !== "ok") 
        return next(new Error("Failed to delete profile picture", { cause: 500 }));

    req.user.profilePic = {};
    await saveUser({ data: req.user });

    return res.status(200).json({ message: "Profile picture deleted successfully" });
};




export const deleteCoverPic = async (req, res, next) => {
    
    if (!req.user)
        return next(new Error("not logged in", { cause: 401 }));

    const deleted = await cloudinary.uploader.destroy(req.user.coverPic.public_id)

    if (!deleted)
        return next(new Error("profile picture has not found", { cause: 400 }));

    req.user.coverPic = {};

    await saveUser({ data: req.user });

    return res.status(200).json({ message: "Cover Picture Deleted Sucessfully" });
}



export const softDeleteAccount = async (req, res, next) => {
    
    if (!req.user)
        return next(new Error("not logged in", { cause: 401 }));

    req.user.isDeleted = true;

    await saveUser({ data: req.user });

    return res.status(200).json({ message: "Account has been Successfully Soft-Deleted" });
}