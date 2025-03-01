import { Router } from "express";
import * as appService from "./app.service.js";
import { asyncHandler } from "../../utils/index.js";
import { authentication } from "../../middlewares/auth.js";
import { validation } from "../../middlewares/validation.js";
import * as appSchema from "./app.Schema.js";
import { multerCloudinary } from "../../middlewares/multer.js";
import { fileTypes } from "../../middlewares/multer.js";
import * as jobSchema from "../jobs/job.Schema.js";




const appRouter = Router({ mergeParams: true });

appRouter.get("/", authentication, asyncHandler(appService.getTheJob));

appRouter.post("/addApplication/:jobId",multerCloudinary([...fileTypes.pdf]).single("userCV"), authentication,validation(appSchema.addApplicationSchema), asyncHandler(appService.addApplication));

appRouter.get("/getApplication/:jobId", authentication, asyncHandler(appService.getApplications));

appRouter.post("/acceptApplication/:appId", authentication, asyncHandler(appService.acceptApplication));

appRouter.post("/rejectApplication/:appId", authentication, asyncHandler(appService.rejectApplication));


export default appRouter;