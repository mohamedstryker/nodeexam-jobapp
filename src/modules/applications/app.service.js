    import { applicationModel, enumApplicationStatus } from "../../DB/models/application.model.js";
    import { jobModel } from "../../DB/models/job.model.js";
    import cloudinary from "../../utils/cloudinary/index.js";
    import { eventEmitter } from "../../utils/index.js";
    import { getJob } from "../jobs/job.service.js";

    export const getTheJob = getJob;
    export const addApplication = async (req, res, next) => {
        if (!req.user) return next(new Error("User is not logged in", { cause: 401 }));

        const { jobId } = req.params;

        if (!req.file) return next(new Error("Please upload your CV", { cause: 400 }));

        const existingApplication = await applicationModel.findOne({ jobId, userId: req.user._id });
        if (existingApplication) return next(new Error("You have already applied for this job", { cause: 400 }));

        const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
            folder: "Job-app/users/cv",
            user_filename: true,
            unique_filename: false
        });
        const job = await jobModel.findOne({ _id: jobId, closed: { $ne: true } });
        if (!job) return next(new Error("Job not found or has been closed", { cause: 404 }));

        await applicationModel.create({
            jobId,
            userId: req.user._id,
            userCV: { secure_url, public_id },
            status: enumApplicationStatus.pending
        });

        eventEmitter.emit("newApplication", { jobId, userId: req.user._id });

        return res.status(201).json({ message: "Application submitted successfully!" });
    };

    export const getApplications = async (req, res, next) => {
        if (!req.user) return next(new Error("User is not logged in", { cause: 401 }));

        const { jobId } = req.params;

        const job = await jobModel.findOne({ _id: jobId, closed: { $exists: false } }).populate([
            { path: "companyId", select: "companyName -_id" },
            { path: "application", select: "userId -_id" }
        ]);

        if (!job) return next(new Error("Job not found or has been closed", { cause: 404 }));

        return res.status(200).json({ message: "Applications retrieved successfully", applications: job.application });
    };

    export const acceptApplication = async (req, res, next) => {
        if (!req.user) return next(new Error("User is not logged in", { cause: 401 }));

        const { appId, jobId } = req.params;

        const job = await jobModel.findOne({ _id: jobId, closed: { $exists: false } }).populate("companyId");

        if (!job?.companyId?.HRs.includes(req.user._id)) {
            return next(new Error("You do not have permission to perform this action", { cause: 403 }));
        }

        await applicationModel.updateOne({ _id: appId }, { $set: { status: enumApplicationStatus.accepted } });


        eventEmitter.emit("applicationAccepted", { applicationId: appId });

        return res.status(200).json({ message: "Application accepted successfully!" });
    };


    export const rejectApplication = async (req, res, next) => {
        if (!req.user) return next(new Error("User is not logged in", { cause: 401 }));

        const { appId, jobId } = req.params;

        const job = await jobModel.findOne({ _id: jobId, closed: { $exists: false } }).populate("companyId");


        if (!job?.companyId?.HRs.includes(req.user._id)) {
            return next(new Error("You do not have permission to perform this action", { cause: 403 }));
        }

        await applicationModel.updateOne({ _id: appId }, { $set: { status: enumApplicationStatus.rejected } });


        eventEmitter.emit("applicationRejected", { applicationId: appId });

        return res.status(200).json({ message: "Application rejected successfully!" });
    };
