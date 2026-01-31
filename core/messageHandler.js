// core/messageHandler.js
const path = require('path');

class MessageHandler {
  constructor(client, dataManager, typingSystem, rateLimiter) {
    this.client = client;
    this.data = dataManager;
    this.typing = typingSystem;
    this.rateLimiter = rateLimiter;
    this.lastProcessedMessageId = 0;
    this.messageQueue = [];
    this.isProcessing = false;
    this.stats = {
      totalReceived: 0,
      totalProcessed: 0,
      totalResponded: 0,
      totalSilenced: 0,
      totalErrors: 0
    };
    
    this.goldenRules = [
      "If data not found → stay silent",
      "If rule unclear → do nothing", 
      "Never guess user intent",
      "Never generate content dynamically"
    ];
  }

  logStat(action) {
    this.stats[action] = (this.stats[action] || 0) + 1;
    
    // Log stats every 100 messages
    if (this.stats.totalReceived % 100 === 0) {
      console.log('📊 Message Handler Stats:', this.stats);
    }
  }

  async validateMessage(message) {
    // Rule 1: Must have message text
    if (!message.message || typeof message.message !== 'string') {
      return { valid: false, reason: 'No message text' };
    }
    
    const msgText = message.message.trim();
    if (msgText.length === 0) {
      return { valid: false, reason: 'Empty message' };
    }
    
    // Rule 2: Skip bots
    if (message.fromId && message.fromId.botId) {
      return { valid: false, reason: 'From bot' };
    }
    
    // Rule 3: Skip userbots
    if (message.viaBotId) {
      return { valid: false, reason: 'Via bot' };
    }
    
    // Rule 4: Check rate limit
    if (!this.rateLimiter.canPerformAction()) {
      const waitTime = Math.ceil(this.rateLimiter.getWaitTime() / 1000);
      return { 
        valid: false, 
        reason: 'Rate limit exceeded',
        waitTime: waitTime
      };
    }
    
    // Rule 5: Check if private chat (configurable)
    const isPrivate = message.chat && message.chat.className === 'PeerUser';
    const isGroup = message.chat && message.chat.className === 'PeerChat';
    const isChannel = message.chat && message.chat.className === 'PeerChannel';
    
    // Only allow private chats by default
    if (!isPrivate) {
      return { valid: false, reason: 'Not private chat' };
    }
    
    // Rule 6: Check for duplicate message ID
    if (message.id <= this.lastProcessedMessageId) {
      return { valid: false, reason: 'Duplicate message ID' };
    }
    
    // Rule 7: Check message length (avoid spam)
    if (msgText.length > 1000) {
      return { valid: false, reason: 'Message too long' };
    }
    
    return { 
      valid: true, 
      chatType: isPrivate ? 'private' : isGroup ? 'group' : isChannel ? 'channel' : 'unknown',
      senderId: message.fromId?.userId || 'unknown'
    };
  }

  async processMessageQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.messageQueue.length > 0) {
      const messageData = this.messageQueue.shift();
      
      try {
        await this.processSingleMessage(messageData.message, messageData.stateMachine);
      } catch (error) {
        console.error('Error processing message from queue:', error.message);
        messageData.stateMachine.transitionTo('ERROR');
      }
      
      // Small delay between queue processing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessing = false;
  }

  async processSingleMessage(message, stateMachine) {
    this.stats.totalReceived++;
    this.logStat('totalReceived');
    
    stateMachine.transitionTo('VALIDATION');
    const validation = await this.validateMessage(message);
    
    if (!validation.valid) {
      if (validation.reason !== 'Rate limit exceeded' && validation.reason !== 'Duplicate message ID') {
        console.log(`🚫 Message rejected: ${validation.reason}`);
      }
      this.stats.totalSilenced++;
      this.logStat('totalSilenced');
      stateMachine.transitionTo('SILENT');
      return;
    }
    
    stateMachine.transitionTo('DECISION');
    const replyText = this.data.findReply(message.message);
    
    // Golden Rule 1: If data not found → stay silent
    if (!replyText) {
      console.log(`🤐 No match found for: "${message.message.substring(0, 50)}..."`);
      this.stats.totalSilenced++;
      this.logStat('totalSilenced');
      stateMachine.transitionTo('SILENT');
      return;
    }
    
    // Update last processed message ID
    this.lastProcessedMessageId = message.id;
    
    // Human simulation: typing delay
    stateMachine.transitionTo('TYPING');
    await this.typing.simulateTyping(message.chatId);
    
    // Send response
    stateMachine.transitionTo('RESPOND');
    try {
      await this.client.sendMessage(message.chatId, {
        message: replyText
      });
      
      this.stats.totalResponded++;
      this.logStat('totalResponded');
      console.log(`💬 Responded to ${validation.senderId}: "${replyText}"`);
      
    } catch (error) {
      console.error('Failed to send message:', error.message);
      this.stats.totalErrors++;
      this.logStat('totalErrors');
      stateMachine.transitionTo('ERROR');
      return;
    }
    
    // Random reaction (30% chance)
    if (Math.random() < 0.3 && this.rateLimiter.canPerformAction()) {
      stateMachine.transitionTo('REACTION');
      const reaction = this.data.getRandomReaction();
      
      try {
        await this.client.invoke({
          _: 'messages.sendReaction',
          peer: await this.client.getInputEntity(message.chatId),
          msgId: message.id,
          reaction: [{ _: 'reactionEmoji', emoticon: reaction }]
        });
        
        console.log(`🎭 Added reaction: ${reaction}`);
      } catch (error) {
        // Silent fail for reactions
      }
    }
    
    this.stats.totalProcessed++;
    this.logStat('totalProcessed');
    
    // Cooldown between actions
    stateMachine.transitionTo('COOLDOWN');
    const cooldown = Math.floor(Math.random() * 1500) + 500; // 0.5-2 seconds
    await new Promise(resolve => setTimeout(resolve, cooldown));
    
    stateMachine.transitionTo('IDLE');
  }

  async handleNewMessage(event) {
    if (!event.message) {
      return;
    }
    
    const message = event.message;
    const stateMachine = new (require('./stateMachine'))();
    
    stateMachine.transitionTo('MESSAGE_DETECTED');
    
    // Add to queue for async processing
    this.messageQueue.push({
      message: message,
      stateMachine: stateMachine,
      timestamp: Date.now()
    });
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processMessageQueue();
    }
  }

  getStats() {
    return {
      ...this.stats,
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing,
      lastMessageId: this.lastProcessedMessageId,
      goldenRules: this.goldenRules
    };
  }

  clearQueue() {
    const cleared = this.messageQueue.length;
    this.messageQueue = [];
    console.log(`🧹 Cleared ${cleared} messages from queue`);
    return cleared;
  }

  resetStats() {
    this.stats = {
      totalReceived: 0,
      totalProcessed: 0,
      totalResponded: 0,
      totalSilenced: 0,
      totalErrors: 0
    };
    console.log('📊 Statistics reset');
  }
}

module.exports = MessageHandler;
