import { conversationModel } from "../../DB/models/conversation.model.js";
import { companyModel } from "../../DB/models/company.model.js";
import { userModel } from "../../DB/models/user.model.js";

export const initiateConversation = async (req, res, next) => {
  if (!req.user) return next(new Error("User not authenticated", { cause: 401 }));

  const { companyId, userId } = req.params;
  const { message } = req.body;

  const company = await companyModel.findById(companyId).populate('HRs owner');
  if (!company) return next(new Error("Company not found", { cause: 404 }));

  const isHR = company.HRs.some(hr => hr._id.equals(req.user._id));
  const isOwner = company.owner._id.equals(req.user._id);
  if (!isHR && !isOwner) return next(new Error("Unauthorized - HR/Owner only", { cause: 403 }));

  const targetUser = await userModel.findById(userId);
  if (!targetUser) return next(new Error("User not found", { cause: 404 }));

  const existingConvo = await conversationModel.findOne({
    company: companyId,
    participants: { $all: [req.user._id, userId] }
  });

  if (existingConvo) return next(new Error("Conversation already exists", { cause: 400 }));

  const newConversation = await conversationModel.create({
    company: companyId,
    participants: [req.user._id, userId],
    messages: [{
      sender: req.user._id,
      content: message,
      timestamp: new Date()
    }]
  });

  return res.status(201).json({
    message: "Conversation started successfully",
    conversationId: newConversation._id
  });
};

export const sendMessage = async (req, res, next) => {
  if (!req.user) return next(new Error("User not authenticated", { cause: 401 }));

  const { conversationId } = req.params;
  const { message } = req.body;
  const conversation = await conversationModel.findById(conversationId);
  if (!conversation) return next(new Error("Conversation not found", { cause: 404 }));

  const isParticipant = conversation.participants.some(p => p.equals(req.user._id));
  if (!isParticipant) return next(new Error("Unauthorized access", { cause: 403 }));
  conversation.messages.push({
    sender: req.user._id,
    content: message,
    timestamp: new Date()
  });

  await conversation.save();

  return res.status(200).json({ message: "Message sent successfully" });
};

export const getConversationMessages = async (req, res, next) => {
  if (!req.user) return next(new Error("User not authenticated", { cause: 401 }));

  const { conversationId } = req.params;

  const conversation = await conversationModel.findById(conversationId)
    .populate('messages.sender', 'firstName lastName email');

  if (!conversation) return next(new Error("Conversation not found", { cause: 404 }));

  const isParticipant = conversation.participants.some(p => p.equals(req.user._id));
  if (!isParticipant) return next(new Error("Unauthorized access", { cause: 403 }));

  return res.status(200).json({
    messages: conversation.messages,
    participants: conversation.participants
  });
};