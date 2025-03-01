import { Router } from "express";
import * as chatService from "./chat.service.js";
import { asyncHandler } from "../../utils/index.js";
import { authentication } from "../../middlewares/auth.js";
import { validation } from "../../middlewares/validation.js";
import * as chatSchema from "./chat.schema.js";

const chatRouter = Router({ mergeParams: true });

chatRouter.post(
  "/:companyId/start-conversation/:userId",
  authentication,
  validation(chatSchema.createConversationSchema),
  asyncHandler(chatService.initiateConversation)
);

chatRouter.post(
  "/:conversationId/send",
  authentication,
  validation(chatSchema.sendMessageSchema),
  asyncHandler(chatService.sendMessage)
);

chatRouter.get(
  "/:conversationId/messages",
  authentication,
  validation(chatSchema.getMessagesSchema),
  asyncHandler(chatService.getConversationMessages)
);

export default chatRouter;