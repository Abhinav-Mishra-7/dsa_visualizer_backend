const express = require('express');
const {saveSession,getHistory,getChatById,chatStreamController,deleteChat} = require('../controllers/aiController');

const aiRouter = express.Router();

aiRouter.post('/save-session', saveSession);
aiRouter.get('/history', getHistory);
aiRouter.get('/history/:id', getChatById);
aiRouter.post('/chat-stream', chatStreamController);
aiRouter.post('/delete-chat/:chatId', deleteChat);

module.exports = aiRouter;