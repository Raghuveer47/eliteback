const SupportTicket = require('../models/SupportTicket');
const LiveChat = require('../models/LiveChat');
const User = require('../models/User');

// Create a new support ticket
const createTicket = async (req, res) => {
  try {
    const { userId, subject, description, category } = req.body;

    if (!userId || !subject || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId, subject, and description are required' 
      });
    }

    // Verify user exists
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Create initial message
    const initialMessage = {
      senderId: userId,
      senderType: 'user',
      message: description,
      sentAt: new Date()
    };

    // Create ticket
    const ticket = new SupportTicket({
      userId,
      subject,
      description,
      category: category || 'other',
      priority: 'medium',
      status: 'open',
      messages: [initialMessage]
    });

    await ticket.save();

    console.log(`Support: Created ticket ${ticket._id} for user ${userId}`);

    res.json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        id: ticket._id.toString(),
        userId: ticket.userId,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        messages: ticket.messages,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get user's tickets
const getUserTickets = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }

    const tickets = await SupportTicket.find({ userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tickets: tickets.map(ticket => ({
        id: ticket._id.toString(),
        userId: ticket.userId,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        assignedTo: ticket.assignedTo,
        messages: ticket.messages,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt
      }))
    });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Get all tickets (admin only)
const getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tickets: tickets.map(ticket => ({
        id: ticket._id.toString(),
        userId: ticket.userId,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        assignedTo: ticket.assignedTo,
        messages: ticket.messages,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt
      }))
    });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Add message to ticket
const addMessageToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { senderId, senderType, message } = req.body;

    if (!senderId || !senderType || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'senderId, senderType, and message are required' 
      });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket not found' 
      });
    }

    const newMessage = {
      senderId,
      senderType,
      message,
      sentAt: new Date()
    };

    ticket.messages.push(newMessage);
    ticket.updatedAt = new Date();

    // Update status based on who sent the message
    if (senderType === 'admin' && ticket.status === 'waiting_user') {
      ticket.status = 'in_progress';
    } else if (senderType === 'user' && ticket.status === 'in_progress') {
      ticket.status = 'waiting_user';
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Message added successfully',
      ticket: {
        id: ticket._id.toString(),
        userId: ticket.userId,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        assignedTo: ticket.assignedTo,
        messages: ticket.messages,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Update ticket status
const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, assignedTo } = req.body;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket not found' 
      });
    }

    if (status) {
      ticket.status = status;
      
      if (status === 'resolved') {
        ticket.resolvedAt = new Date();
      } else if (status === 'closed') {
        ticket.closedAt = new Date();
      }
    }

    if (assignedTo !== undefined) {
      ticket.assignedTo = assignedTo;
    }

    ticket.updatedAt = new Date();
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket: {
        id: ticket._id.toString(),
        userId: ticket.userId,
        subject: ticket.subject,
        status: ticket.status,
        assignedTo: ticket.assignedTo,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt
      }
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Start live chat
const startLiveChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }

    // Check if user exists
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Create chat with system welcome message
    const chat = new LiveChat({
      userId,
      status: 'waiting',
      messages: [{
        senderId: 'system',
        senderType: 'system',
        message: 'Welcome to Spinzos support. An agent will respond within 2 minutes or the chat will timeout.',
        timestamp: new Date()
      }]
    });

    await chat.save();

    console.log(`LiveChat: Started chat ${chat._id} for user ${userId}`);

    // Set timeout to check after 2 minutes
    setTimeout(async () => {
      try {
        const chatDoc = await LiveChat.findById(chat._id);
        if (chatDoc && chatDoc.checkTimeout()) {
          await chatDoc.save();
          console.log(`LiveChat: Chat ${chat._id} timed out`);
        }
      } catch (error) {
        console.error('LiveChat timeout check error:', error);
      }
    }, 2 * 60 * 1000); // 2 minutes

    res.json({
      success: true,
      message: 'Live chat started',
      chat: {
        id: chat._id.toString(),
        userId: chat.userId,
        agentId: chat.agentId,
        status: chat.status,
        messages: chat.messages,
        startedAt: chat.startedAt,
        createdAt: chat.createdAt
      }
    });
  } catch (error) {
    console.error('Start live chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Get user's live chats
const getUserChats = async (req, res) => {
  try {
    const { userId } = req.params;

    const chats = await LiveChat.find({ userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      chats: chats.map(chat => ({
        id: chat._id.toString(),
        userId: chat.userId,
        agentId: chat.agentId,
        status: chat.status,
        messages: chat.messages,
        startedAt: chat.startedAt,
        endedAt: chat.endedAt,
        createdAt: chat.createdAt
      }))
    });
  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Get all live chats (admin)
const getAllLiveChats = async (req, res) => {
  try {
    const chats = await LiveChat.find()
      .sort({ createdAt: -1 })
      .limit(100); // Last 100 chats

    // Get user names
    const chatsWithNames = await Promise.all(
      chats.map(async (chat) => {
        try {
          const user = await User.findOne({ userId: chat.userId });
          return {
            id: chat._id.toString(),
            userId: chat.userId,
            userName: user ? user.name : chat.userId.split('@')[0],
            agentId: chat.agentId,
            status: chat.status,
            messages: chat.messages,
            startedAt: chat.startedAt,
            endedAt: chat.endedAt,
            lastActivityAt: chat.lastActivityAt,
            createdAt: chat.createdAt
          };
        } catch (error) {
          return {
            id: chat._id.toString(),
            userId: chat.userId,
            userName: chat.userId.split('@')[0],
            agentId: chat.agentId,
            status: chat.status,
            messages: chat.messages,
            startedAt: chat.startedAt,
            endedAt: chat.endedAt,
            lastActivityAt: chat.lastActivityAt,
            createdAt: chat.createdAt
          };
        }
      })
    );

    res.json({
      success: true,
      chats: chatsWithNames
    });
  } catch (error) {
    console.error('Get all live chats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// End live chat
const endLiveChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { endedBy } = req.body;

    const chat = await LiveChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat not found' 
      });
    }

    chat.status = 'ended';
    chat.endedAt = new Date();
    chat.endedBy = endedBy || 'system';
    
    // Determine who ended it for the system message
    let endedByLabel = 'System';
    if (endedBy) {
      if (endedBy.includes('@')) {
        endedByLabel = 'User';
      } else if (endedBy.startsWith('admin')) {
        endedByLabel = 'Admin';
      }
    }
    
    // Add system message
    chat.messages.push({
      senderId: 'system',
      senderType: 'system',
      message: `Chat ended by ${endedByLabel}`,
      timestamp: new Date()
    });
    
    await chat.save();

    console.log(`LiveChat: Chat ${chatId} ended by ${endedBy || 'system'}`);

    res.json({
      success: true,
      message: 'Chat ended',
      chat: {
        id: chat._id.toString(),
        status: chat.status,
        endedAt: chat.endedAt,
        endedBy: chat.endedBy
      }
    });
  } catch (error) {
    console.error('End live chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Add message to chat
const addChatMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { senderId, senderType, message } = req.body;

    const chat = await LiveChat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat not found' 
      });
    }

    chat.messages.push({
      senderId,
      senderType,
      message,
      timestamp: new Date()
    });

    chat.lastActivityAt = new Date();

    // If agent responds and chat is waiting, make it active
    if (senderType === 'agent' && chat.status === 'waiting') {
      chat.status = 'active';
      chat.agentId = senderId;
    }

    await chat.save();

    res.json({
      success: true,
      message: 'Message added',
      chat: {
        id: chat._id.toString(),
        userId: chat.userId,
        agentId: chat.agentId,
        status: chat.status,
        messages: chat.messages,
        lastActivityAt: chat.lastActivityAt
      }
    });
  } catch (error) {
    console.error('Add chat message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

module.exports = {
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
};

