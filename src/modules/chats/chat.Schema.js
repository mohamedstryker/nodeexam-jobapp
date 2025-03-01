import joi from "joi";
import { generalRules } from "../../utils/index.js";

export const createConversationSchema = {
  params: joi.object({
    companyId: generalRules.dbId.required(),
    userId: generalRules.dbId.required()
  }),
  body: joi.object({
    message: joi.string().required().min(1)
  })
};

export const sendMessageSchema = {
  params: joi.object({
    conversationId: generalRules.dbId.required()
  }),
  body: joi.object({
    message: joi.string().required().min(1)
  })
};

export const getMessagesSchema = {
  params: joi.object({
    conversationId: generalRules.dbId.required()
  })
};