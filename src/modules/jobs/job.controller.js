import { Router } from "express";
import * as jobService from "./job.service.js";
import { asyncHandler } from "../../utils/index.js";
import { authentication } from "../../middlewares/auth.js";
import { validation } from "../../middlewares/validation.js";
import * as jobSchema from "./job.Schema.js";
import appRouter from "../applications/app.controller.js";

const jobRouter = Router({ mergeParams: true });



jobRouter.post("/addJob/:companyId", authentication, validation(jobSchema.addJobSchema), asyncHandler(jobService.addJob)); 

jobRouter.patch("/updateJob/:jobId/:companyId", authentication, validation(jobSchema.updateJobSchema), asyncHandler(jobService.updateJob)); 

jobRouter.delete("/deleteJob/:jobId/:companyId", authentication, validation(jobSchema.deleteJobSchema), asyncHandler(jobService.deleteJob)); 

jobRouter.get("/filterJobs", authentication, validation(jobSchema.filterJobsSchema), asyncHandler(jobService.filterJobs)); 

jobRouter.get("/", authentication, validation(jobSchema.getCompanyJobsSchema), asyncHandler(jobService.getAllJobs)); 

jobRouter.get("/getJob/:jobId/:companyId", authentication, validation(jobSchema.getCompanyJobsSchema), asyncHandler(jobService.getJob)); 

jobRouter.use("/:jobId", appRouter);

jobRouter.use("/:companyId/:jobId", appRouter);





export default jobRouter;