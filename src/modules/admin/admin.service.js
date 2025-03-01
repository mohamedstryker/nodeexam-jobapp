import { companyModel } from "../../DB/models/company.model.js";
import { userModel } from "../../DB/models/user.model.js";

export const banOrUnbanUser = async (req, res, next) => {
    const { id } = req.body;

    if (!req.user)
        return next(new Error("Access denied! Please log in first.", { cause: 401 }));

    const user = await userModel.findOne({ _id: id });

    if (!user)
        return next(new Error("User not found in the system.", { cause: 404 }));

    if (user.bannedAt) {
        await userModel.updateOne({ _id: id, isDeleted: false }, { $unset: { bannedAt: "" } });
        return res.status(200).json({ message: "User has been successfully unbanned." });
    } else {
        await userModel.updateOne({ _id: id, isDeleted: false }, { $set: { bannedAt: Date.now() } });
        return res.status(200).json({ message: "User has been banned successfully." });
    }
};

export const banOrUnbanCompany = async (req, res, next) => {
    const { id } = req.body;

    if (!req.user)
        return next(new Error("Unauthorized! Please log in first.", { cause: 401 }));

    const company = await companyModel.findOne({ _id: id });

    if (!company)
        return next(new Error("Company record not found.", { cause: 404 }));

    if (company.bannedAt) {
        await companyModel.updateOne({ _id: id, isDeleted: false }, { $unset: { bannedAt: "" } });
        return res.status(200).json({ message: "Company has been successfully unbanned." });
    } else {
        await companyModel.updateOne({ _id: id, isDeleted: false }, { $set: { bannedAt: Date.now() } });
        return res.status(200).json({ message: "Company has been banned successfully." });
    }
};

export const approveCompany = async (req, res, next) => {
    const { id } = req.body;

    if (!req.user)
        return next(new Error("Authentication required! Please log in.", { cause: 401 }));

    const company = await companyModel.findOne({ _id: id });

    if (!company)
        return next(new Error("Company not found! Please check the ID.", { cause: 404 }));

    if (company.approvedByAdmin)
        return next(new Error("This company is already approved!", { cause: 400 }));

    await companyModel.updateOne({ _id: id }, { $set: { approvedByAdmin: true } });

    return res.status(200).json({ message: "Company has been successfully approved." });
};
