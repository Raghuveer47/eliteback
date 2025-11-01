const express = require('express');
const router = express.Router();
const {
  createTicket,
  getUserTickets,
  getAllTickets,
  addMessageToTicket,
  updateTicketStatus,
  startLiveChat,
  getUserChats,
  addChatMessage,
  getAllLiveChats,
  endLiveChat
} = require('../controllers/supportController');

// Ticket routes
router.post('/tickets', createTicket);
router.get('/tickets/:userId', getUserTickets);
router.post('/tickets/:ticketId/messages', addMessageToTicket);

// Live chat routes
router.post('/chat/start', startLiveChat);
router.get('/chat/:userId', getUserChats);
router.post('/chat/:chatId/messages', addChatMessage);
router.post('/chat/:chatId/end', endLiveChat);

// Admin routes
router.get('/admin/tickets', getAllTickets);
router.patch('/admin/tickets/:ticketId', updateTicketStatus);
router.get('/admin/chats', getAllLiveChats);

module.exports = router;

